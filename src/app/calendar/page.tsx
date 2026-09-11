import { CalendarDays, LockKeyhole } from "lucide-react";
import { listOperatorCalendarEntriesForWorkspace, type CalendarLoadResult } from "@/lib/dal/calendar";
import { isDataAccessError } from "@/lib/dal/errors";
import { OperatorCalendar } from "@/components/calendar/OperatorCalendar";
import { PageHeader } from "@/components/layout/PageHeader";
import { Surface } from "@/components/ui/Surface";

export default async function CalendarPage() {
  let calendar: CalendarLoadResult | null = null;
  let loadError: unknown = null;

  try {
    calendar = await listOperatorCalendarEntriesForWorkspace();
  } catch (error) {
    loadError = error;
  }

  if (loadError) {
    const message = isDataAccessError(loadError)
      ? loadError.message
      : "Operator calendar could not be loaded. No calendar data was fabricated.";

    return (
      <Surface variant="empty" className="w-full">
        <LockKeyhole className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
        <h1 className="text-base font-semibold text-zinc-100">Operator calendar unavailable</h1>
        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-500">{message}</p>
      </Surface>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl space-y-6">
      <PageHeader
        icon={CalendarDays}
        title="Calendar"
        description="Review callbacks and personal reminders. Reminders do not change the call queue."
      />
      <OperatorCalendar initialCalendar={calendar!} />
    </div>
  );
}
