import { createClient } from "@supabase/supabase-js";

const requiredEnv = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const getConfig = () => ({
  supabaseUrl: process.env.SUPABASE_URL?.trim() || requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  secretKey:
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    (() => { throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY"); })(),
  workspaceId: requiredEnv("TEST_TEAM_LEADER_WORKSPACE_ID"),
  email: requiredEnv("TEST_TEAM_LEADER_EMAIL").toLowerCase(),
  fullName: process.env.TEST_TEAM_LEADER_FULL_NAME?.trim() || "Test Team Leader",
});

const createAdminClient = (config) => createClient(config.supabaseUrl, config.secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const findUserByEmail = async (supabase, email) => {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Could not list Auth users: ${error.message}`);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  throw new Error("Could not find the user within the first 10 Auth pages");
};

const addMembership = async (supabase, workspaceId, userId) => {
  const { error } = await supabase.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: "team_leader",
  });
  if (error) throw new Error(`Could not add Team Leader membership: ${error.message}`);
};

const provision = async (supabase, config, mode) => {
  if (mode === "password") {
    const password = requiredEnv("TEST_TEAM_LEADER_PASSWORD");
    if (password.length < 8) throw new Error("TEST_TEAM_LEADER_PASSWORD must contain at least 8 characters");

    const { data, error } = await supabase.auth.admin.createUser({
      email: config.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: config.fullName },
    });
    if (error || !data.user) throw new Error(`Could not create Auth user: ${error?.message || "missing user"}`);

    try {
      await addMembership(supabase, config.workspaceId, data.user.id);
    } catch (membershipError) {
      await supabase.auth.admin.deleteUser(data.user.id);
      throw membershipError;
    }

    return { action: "created", authUserId: data.user.id, email: config.email, role: "team_leader" };
  }

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(config.email, {
    data: { full_name: config.fullName },
  });
  if (error || !data.user) throw new Error(`Could not invite Auth user: ${error?.message || "missing user"}`);
  try {
    await addMembership(supabase, config.workspaceId, data.user.id);
  } catch (membershipError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw membershipError;
  }
  return { action: "invited", authUserId: data.user.id, email: config.email, role: "team_leader" };
};

const cleanup = async (supabase, config, deleteAuthUser) => {
  const user = await findUserByEmail(supabase, config.email);
  if (!user) return { action: "cleanup", removedMembership: false, deletedAuthUser: false, email: config.email };

  const { error: membershipError } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", config.workspaceId)
    .eq("user_id", user.id)
    .eq("role", "team_leader");
  if (membershipError) throw new Error(`Could not remove Team Leader membership: ${membershipError.message}`);

  if (deleteAuthUser) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`Could not delete Auth user: ${error.message}`);
  }

  return { action: "cleanup", removedMembership: true, deletedAuthUser: deleteAuthUser, email: config.email };
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const isCleanup = args.has("--cleanup");
  const deleteAuthUser = args.has("--delete-auth-user");
  if (deleteAuthUser && !args.has("--confirm-cleanup")) {
    throw new Error("Deleting the Auth user requires --confirm-cleanup");
  }
  if (isCleanup && !args.has("--confirm-cleanup")) {
    throw new Error("Cleanup requires --confirm-cleanup");
  }

  const mode = args.has("--invite") ? "invite" : "password";

  const config = getConfig();
  const supabase = createAdminClient(config);
  const result = isCleanup
    ? await cleanup(supabase, config, deleteAuthUser)
    : await provision(supabase, config, mode);
  console.log(JSON.stringify(result, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
