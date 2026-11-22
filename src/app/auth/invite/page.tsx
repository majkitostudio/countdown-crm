"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export default function InvitePage() {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const value = hash.get("token_hash") ?? "";
    window.history.replaceState(null, "", window.location.pathname);
    void Promise.resolve().then(() => {
      if (value.length > 0 && value.length <= 256 && !/[^a-f0-9]/i.test(value)) setToken(value);
      else setMessage("Odkaz je neplatný. Požádejte správce o novou pozvánku.");
    });
  }, []);

  async function accept() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/auth/invite/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_hash: token }),
      });
      if (response.ok) {
        window.location.replace("/auth/update-password");
        return;
      }
      const body = await response.json();
      setMessage(body.error === "already_signed_in"
        ? "V tomto prohlížeči jste již přihlášeni. Odhlaste se a znovu otevřete odkaz z e-mailu."
        : "Pozvánku se nepodařilo ověřit. Může být neplatná, prošlá nebo již použitá. Požádejte správce o novou pozvánku.");
    } catch {
      setMessage("Pozvánku se nepodařilo ověřit. Zkuste to znovu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-screen bg-zinc-950 flex items-center justify-center px-4 text-zinc-100">
      <div className="w-full max-w-md">
        <Surface variant="page">
          <div className="space-y-5 p-6">
            <h1 className="text-lg font-semibold">Pozvánka do Countdown CRM</h1>
            <p className="text-sm text-zinc-400">Pro přijetí pozvánky a nastavení hesla pokračujte tlačítkem.</p>
            {message && <p role="alert" className="text-sm text-red-400">{message}</p>}
            {token && <Button type="button" onClick={accept} disabled={loading} className="w-full">
              {loading ? "Ověřování..." : "Přijmout pozvánku"}
            </Button>}
            <Link href="/login" className="text-xs text-zinc-400 underline">Zpět na přihlášení</Link>
          </div>
        </Surface>
      </div>
    </main>
  );
}
