"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { VelocityMark } from "@/components/brand/VelocityMark";
import { Button } from "@/components/ui/Button";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

type PageState = "checking" | "ready" | "invalid";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (new URLSearchParams(window.location.search).get("error") === "invalid_link") {
        if (active) setPageState("invalid");
        return;
      }

      try {
        const { data, error } = await createClient().auth.getUser();
        if (active) setPageState(!error && data.user ? "ready" : "invalid");
      } catch {
        if (active) setPageState("invalid");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Heslo musí mít alespoň 8 znaků.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Hesla se neshodují.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        setErrorMessage("Heslo se nepodařilo změnit. Zvolte jiné heslo a zkuste to znovu.");
        return;
      }
      setPassword("");
      setConfirmPassword("");
      router.replace("/");
    } catch {
      setErrorMessage("Heslo se nepodařilo změnit. Zkuste to prosím znovu.");
    } finally {
      setLoading(false);
    }
  }

  const isInvalid = pageState === "invalid";

  return (
    <main className="min-h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-6 sm:px-6 text-zinc-100 font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <VelocityMark className="h-12 w-12" />
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">VELOCITY CRM</h1>
          <p className="text-xs text-zinc-400">Nastavení nového hesla k vašemu účtu.</p>
        </div>

        <Surface variant="page">
          <div className="space-y-5 p-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-zinc-200">Nastavit nové heslo</h2>
              <p className="text-xs text-zinc-400">
                {pageState === "checking"
                  ? "Ověřujeme přístup k nastavení hesla."
                  : isInvalid
                    ? "Odkaz je neplatný nebo vypršel. Vyžádejte si nový."
                    : "Zadejte nové heslo a potvrďte ho."}
              </p>
            </div>

            {errorMessage && <StatusAlert tone="danger">{errorMessage}</StatusAlert>}
            {isInvalid && (
              <StatusAlert tone="danger">Odkaz je neplatný nebo vypršel.</StatusAlert>
            )}

            <noscript>
              <p className="text-xs text-zinc-400">Pro nastavení hesla zapněte JavaScript.</p>
            </noscript>
            {pageState === "ready" && (
              <form action="/auth/update-password" method="post" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="text-xs font-medium text-zinc-300 block">
                    Nové heslo
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      id="new-password"
                      name="new-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 transition-colors duration-150 ease-interface"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="text-xs font-medium text-zinc-300 block">
                    Potvrdit nové heslo
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 transition-colors duration-150 ease-interface"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  <span>{loading ? "Ukládání..." : "Uložit nové heslo"}</span>
                </Button>
              </form>
            )}

            <Link
              href={isInvalid ? "/auth/forgot-password" : "/login"}
              className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {isInvalid ? "Vyžádat nový odkaz" : "Zpět na přihlášení"}
            </Link>
          </div>
        </Surface>
      </div>
    </main>
  );
}
