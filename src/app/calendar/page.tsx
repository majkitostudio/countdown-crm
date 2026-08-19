import { CalendarDays, LockKeyhole } from "lucide-react";
import { listOperatorCalendarEntriesForWorkspace, type CalendarEntryDTO } from "@/lib/dal/calendar";
import { isDataAccessError } from "@/lib/dal/errors";
import { OperatorCalendar } from "@/components/calendar/OperatorCalendar";

export default async function CalendarPage() {
  let entries: CalendarEntryDTO[] = [];
  let loadError: unknown = null;

  try {
    entries = await listOperatorCalendarEntriesForWorkspace();
  } catch (error) {
    loadError = error;
  }

  if (loadError) {
    const message = isDataAccessError(loadError)
      ? loadError.message
      : "Operator calendar could not be loaded. No calendar data was fabricated.";

    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-12 text-center">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Operator calendar unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">{message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl space-y-6">
      <div className="flex items-start gap-3">
        <CalendarDays className="mt-0.5 h-5 w-5 text-zinc-300" />
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">My Calendar</h1>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Callbacky a osobní reminders na jednom pracovním přehledu. Reminders nemění stav call queue.
          </p>
        </div>
      </div>
      <OperatorCalendar initialEntries={entries} />
    </div>
  );
}
