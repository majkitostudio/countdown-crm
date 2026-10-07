import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["'](.*)["']$/, "$1");
    }
  }
}

loadEnvLocal();

const parseArgs = () => {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const [key, val] = arg.slice(2).split("=");
      args[key] = val === undefined ? true : val;
    }
  }
  return args;
};

const args = parseArgs();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultWorkspaceId =
  process.env.TEST_OPERATOR_WORKSPACE_ID ||
  process.env.TEST_TEAM_LEADER_WORKSPACE_ID ||
  "00000000-0000-0000-0000-000000000001";

if (!supabaseUrl || !secretKey) {
  console.error("Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment/.env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

async function run() {
  const email = (args.email || process.env.TEST_USER_EMAIL || "").toLowerCase().trim();
  const fullName = (args.name || process.env.TEST_USER_FULL_NAME || "Nový Pracovník").trim();
  const role = (args.role || process.env.TEST_USER_ROLE || "operator").trim();
  const workspaceId = args.workspace || defaultWorkspaceId;
  const password = args.password || process.env.TEST_USER_PASSWORD;
  const isInvite = Boolean(args.invite);
  const isCleanup = Boolean(args.cleanup);

  if (!email) {
    console.log("Použití:");
    console.log("  node scripts/provision-user.mjs --email=novak@countdown.cz --name=\"Jan Novák\" --role=operator --password=Heslo1234");
    console.log("  node scripts/provision-user.mjs --email=novak@countdown.cz --name=\"Jan Novák\" --role=operator --invite");
    console.log("  node scripts/provision-user.mjs --email=novak@countdown.cz --cleanup");
    process.exit(0);
  }

  // Find user if exists
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) {
    console.error(`Chyba při hledání uživatelů: ${listError.message}`);
    process.exit(1);
  }

  const existingUser = listData.users.find((u) => u.email?.toLowerCase() === email);

  if (isCleanup) {
    if (!existingUser) {
      console.log(`Uživatel ${email} nebyl v Auth nalezen.`);
      process.exit(0);
    }
    console.log(`Mazání členství a účtu pro ${email}...`);
    await supabase.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", existingUser.id);
    await supabase.auth.admin.deleteUser(existingUser.id);
    console.log(`Hotovo! Uživatel ${email} byl odstraněn.`);
    process.exit(0);
  }

  let userId;
  if (existingUser) {
    console.log(`Uživatel ${email} již existuje v Auth (ID: ${existingUser.id}).`);
    userId = existingUser.id;
  } else if (isInvite || !password) {
    console.log(`Odesílám pozvánku na ${email}...`);
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    });
    if (inviteError || !inviteData.user) {
      console.error(`Chyba při odesílání pozvánky: ${inviteError?.message}`);
      process.exit(1);
    }
    userId = inviteData.user.id;
    console.log(`Pozvánka odeslána! (ID: ${userId})`);
  } else {
    console.log(`Vytvářím uživatele s heslem pro ${email}...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError || !createData.user) {
      console.error(`Chyba při vytváření uživatele: ${createError?.message}`);
      process.exit(1);
    }
    userId = createData.user.id;
    console.log(`Uživatel vytvořen a aktivován! (ID: ${userId})`);
  }

  // Ensure workspace membership
  const { error: memberError } = await supabase.from("workspace_members").upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      role,
    },
    { onConflict: "workspace_id, user_id" }
  );

  if (memberError) {
    console.error(`Chyba při zápisu role do workspace_members: ${memberError.message}`);
    process.exit(1);
  }

  // Ensure profile
  await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      role,
      status: "ready",
    },
    { onConflict: "id" }
  );

  console.log(`✅ Pracovník ${fullName} (${email}) byl úspěšně nastaven s rolí '${role}' ve workspace ${workspaceId}.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
