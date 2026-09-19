import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const eq = line.indexOf("=");
      return [line.slice(0, eq), line.slice(eq + 1)];
    }),
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) throw new Error("Missing Supabase credentials in .env.local");

const userId = process.argv[2];
const password = process.argv[3];
if (!userId || !password) throw new Error("Usage: reset-test-user-password.mjs <userId> <password>");

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const { data, error } = await supabase.auth.admin.updateUserById(userId, { password });
if (error) throw new Error(`Could not reset password: ${error?.message}`);
console.log(JSON.stringify({ action: "password_reset", userId: data.user.id, email: data.user.email }));
