"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CountdownMark } from "@/components/brand/CountdownMark";
import { Button } from "@/components/ui/Button";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("john.doe@countdowncrm.com");
  // Keep the field genuinely empty; masked-looking text would be submitted as
  // the literal password value by the browser.
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg("Přihlášení se nezdařilo. Zkontrolujte e-mail a heslo.");
        return;
      }

      router.replace("/");
    } catch {
      setErrorMsg("Přihlášení se nezdařilo. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-6 sm:px-6 text-zinc-100 font-sans select-none">
      {/* Container Card */}
      <div className="w-full max-w-md space-y-6">
        {/* Brand Logo */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center justify-center">
            <CountdownMark className="h-12 w-12" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            COUNTDOWN CRM
          </h1>
          <p className="text-xs text-zinc-400">
            AI Copilot & Tele-sales Operator Workspace
          </p>
        </div>

        {/* Login Form Card */}
        <Surface variant="page">
          <div className="space-y-5 p-6">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-zinc-200">
              Sign In to Your Workspace
            </h2>
            <p className="text-xs text-zinc-400">
              Enter your operator credentials to access the call center workspace.
            </p>
          </div>

          {errorMsg && <StatusAlert tone="danger">{errorMsg}</StatusAlert>}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 block">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                placeholder="operator@countdowncrm.com"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 focus:outline-none rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-400 transition-colors"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300 block">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 focus:outline-none rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 transition-colors"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              <span>{loading ? "Signing In..." : "Sign In to Workspace"}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              Supabase Auth RLS Protected
            </span>
            <span className="font-mono">v0.1.0</span>
          </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}
