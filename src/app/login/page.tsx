"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("john.doe@countdowncrm.com");
  const [password, setPassword] = useState("••••••••");
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

      router.push("/workspace");
    } catch {
      setErrorMsg("Přihlášení se nezdařilo. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 font-sans select-none">
      {/* Container Card */}
      <div className="w-full max-w-md space-y-6">
        {/* Brand Logo */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 shadow-md">
            <Zap className="w-6 h-6 fill-amber-400/20" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            COUNTDOWN CRM
          </h1>
          <p className="text-xs text-zinc-400">
            AI Copilot & Tele-sales Agent Workspace
          </p>
        </div>

        {/* Login Form Card */}
        <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md shadow-2xl space-y-5">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-zinc-200">
              Sign In to Your Workspace
            </h2>
            <p className="text-xs text-zinc-400">
              Enter your agent credentials to access the call center workspace.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

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
                  placeholder="agent@countdowncrm.com"
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
                <a href="#" className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors">
                  Forgot?
                </a>
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
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-zinc-100 text-zinc-950 hover:bg-zinc-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span>{loading ? "Signing In..." : "Sign In to Workspace"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              Supabase Auth RLS Protected
            </span>
            <span className="font-mono">v0.1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
