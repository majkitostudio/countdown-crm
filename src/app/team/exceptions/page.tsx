import { LockKeyhole, ShieldAlert } from "lucide-react";
import { ExceptionQueue } from "@/components/exceptions/ExceptionQueue";
import { TeamWorkspaceTabs } from "@/components/team/TeamWorkspaceTabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { isDataAccessError } from "@/lib/dal/errors";
import { listTeamLeaderExceptions } from "@/lib/dal/exceptionQueue";

type ExceptionsPageLoadResult =
  | { data: Awaited<ReturnType<typeof listTeamLeaderExceptions>> }
  | { error: unknown };

async function loadExceptionsPage(): Promise<ExceptionsPageLoadResult> {
  try {
    return { data: await listTeamLeaderExceptions() };
  } catch (error) {
    return { error };
  }
}

export default async function ExceptionsPage() {
  const result = await loadExceptionsPage();

  if ("error" in result) {
    const forbidden = isDataAccessError(result.error) && result.error.code === "FORBIDDEN";
    return (
      <div className="mx-auto max-w-xl">
      <Surface variant="empty" className="w-full">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" aria-hidden="true" />
        <h1 className="text-base font-semibold text-zinc-100">Fronta výjimek není dostupná</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">
          {forbidden
            ? "Tato fronta pracovního prostoru je dostupná pouze vedoucím týmů a administrátorům."
            : "Data výjimek se nepodařilo načíst. Žádný náhradní problém nebyl vytvořen."}
        </p>
      </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6">
      <PageHeader
        icon={ShieldAlert}
        title="Fronta výjimek"
        description="Fronta naplánovaných hovorů, obnovy front, selhání automatizací a chybějících skriptů, které potřebují rozhodnutí manažera."
        badge={{ label: "Provoz pracovního prostoru", tone: result.data.items.some((item) => item.priority === "critical") ? "unavailable" : "neutral" }}
      />
      <TeamWorkspaceTabs />
      <ExceptionQueue initialData={result.data} />
    </div>
  );
}
