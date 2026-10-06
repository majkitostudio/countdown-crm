import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      <Surface variant="page" className="max-w-md w-full p-6 space-y-5 border-zinc-800 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
          <FileQuestion className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-100">Stránka nenalezena (404)</h1>
          <p className="text-xs text-zinc-400">
            Požadovaná adresa v Countdown CRM neexistuje nebo byla přesunuta.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <Link href="/">
            <Button variant="primary">
              <Home className="w-4 h-4 mr-1.5" />
              Návrat do CRM
            </Button>
          </Link>
        </div>
      </Surface>
    </div>
  );
}
