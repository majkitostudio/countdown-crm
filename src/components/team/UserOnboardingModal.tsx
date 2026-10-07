"use client";

import { useState } from "react";
import { KeyRound, Mail, UserPlus, X } from "lucide-react";
import { inviteOrProvisionWorkspaceMemberAction } from "@/app/actions/workspace";
import type { TeamDTO } from "@/lib/dal/teams";
import type { WorkspaceRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldLabel, SelectField, TextField } from "@/components/ui/Field";
import { StatusAlert } from "@/components/ui/Status";
import { Surface } from "@/components/ui/Surface";

interface UserOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: TeamDTO[];
  onUserAdded: (message: string) => void;
}

export function UserOnboardingModal({
  isOpen,
  onClose,
  teams,
  onUserAdded,
}: UserOnboardingModalProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("operator");
  const [teamId, setTeamId] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<"invite" | "password">("invite");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setRole("operator");
    setTeamId("");
    setDeliveryMethod("invite");
    setPassword("");
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await inviteOrProvisionWorkspaceMemberAction({
        email,
        fullName,
        role,
        teamId: teamId || null,
        deliveryMethod,
        password: deliveryMethod === "password" ? password : undefined,
      });

      const roleLabels: Record<WorkspaceRole, string> = {
        operator: "Operátor",
        team_leader: "Team Leader",
        administrator: "Administrátor",
      };

      const actionText =
        result.action === "invited"
          ? "Pozvánka byla odeslána na e-mail."
          : result.action === "created"
            ? "Uživatel byl vytvořen s heslem a aktivován."
            : "Uživatel byl přiřazen do call centra.";

      onUserAdded(`${roleLabels[role]} ${fullName} (${email}) byl úspěšně přidán. ${actionText}`);
      handleClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Přidání uživatele se nezdařilo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      aria-labelledby="onboarding-modal-title"
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
    >
      <Surface variant="inset" className="p-6">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 id="onboarding-modal-title" className="text-base font-semibold text-zinc-100">
                Přidat pracovníka do call centra
              </h2>
              <p className="text-xs text-zinc-400">
                Založení operátora, team leadera nebo administrátora a přiřazení k lince.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4">
            <StatusAlert tone="danger">{errorMessage}</StatusAlert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <FieldLabel>Jméno a příjmení</FieldLabel>
            <TextField
              placeholder="např. Jan Novák"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <FieldLabel>Pracovní e-mail</FieldLabel>
            <TextField
              placeholder="např. jan.novak@countdown.cz"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Role v CRM</FieldLabel>
              <SelectField
                value={role}
                onChange={(e) => setRole(e.target.value as WorkspaceRole)}
              >
                <option value="operator">Operátor (Telefonista)</option>
                <option value="team_leader">Team Leader (Dohled)</option>
                <option value="administrator">Administrátor (Správce)</option>
              </SelectField>
            </div>

            <div>
              <FieldLabel>Prodejní linka / Tým</FieldLabel>
              <SelectField
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              >
                <option value="">Zatím nezařazovat</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <FieldLabel>Způsob předání přístupu</FieldLabel>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDeliveryMethod("invite")}
                className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                  deliveryMethod === "invite"
                    ? "border-emerald-500/60 bg-emerald-950/20 text-zinc-100"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <div className="text-xs font-medium text-zinc-200">Pozvánka e-mailem</div>
                  <div className="text-[11px] text-zinc-400">Odkaz pro nastavení vlastního hesla</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod("password")}
                className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                  deliveryMethod === "password"
                    ? "border-emerald-500/60 bg-emerald-950/20 text-zinc-100"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <div className="text-xs font-medium text-zinc-200">Nastavit heslo</div>
                  <div className="text-[11px] text-zinc-400">Pro okamžité přihlášení na směně</div>
                </div>
              </button>
            </div>
          </div>

          {deliveryMethod === "password" && (
            <div className="pt-1">
              <FieldLabel>Dočasné heslo nováčka (min. 8 znaků)</FieldLabel>
              <TextField
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-zinc-800 pt-5">
            <Button type="button" variant="quiet" onClick={handleClose} disabled={isSubmitting}>
              Zrušit
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Ukládám..." : "Přidat do týmu"}
            </Button>
          </div>
        </form>
      </Surface>
    </Dialog>
  );
}
