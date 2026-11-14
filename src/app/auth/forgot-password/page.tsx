"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CountdownMark } from "@/components/brand/CountdownMark";
import { Button } from "@/components/ui/Button";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setRequestSent(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/confirm`,
      });
      if (error) {
        setErrorMessage("Žádost se nepodařilo odeslat. Zkuste to prosím znovu.");
        return;
      }
      setRequestSent(true);
    } catch {
      setErrorMessage("Žádost se nepodařilo odeslat. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-6 sm:px-6 text-zinc-100 font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <CountdownMark className="h-12 w-12" />
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">COUNTDOWN CRM</h1>
          <p className="text-xs text-zinc-400">Obnova přístupu do pracovního prostředí.</p>
        </div>

        <Surface variant="page">
          <div className="space-y-5 p-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-zinc-200">Zapomenuté heslo</h2>
              <p className="text-xs text-zinc-400">
                Zadejte pracovní e-mail a pošleme vám odkaz pro nastavení nového hesla.
              </p>
            </div>

            {requestSent && (
              <StatusAlert tone="success">
                Pokud lze účet obnovit, přijde e-mail s odkazem.
              </StatusAlert>
            )}
            {errorMessage && <StatusAlert tone="danger">{errorMessage}</StatusAlert>}

            {!requestSent && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="recovery-email" className="text-xs font-medium text-zinc-300 block">
                    Pracovní e-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      id="recovery-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="operator@countdowncrm.com"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-400 transition-colors duration-150 ease-interface"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  <span>{loading ? "Odesílání..." : "Odeslat odkaz pro obnovu"}</span>
                </Button>
              </form>
            )}

            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zpět na přihlášení
            </Link>
          </div>
        </Surface>
      </div>
    </main>
  );
}
