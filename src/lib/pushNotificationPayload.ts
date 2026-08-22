export interface ReminderPushPayloadInput {
  reminderId: string;
  title: string;
  note: string | null;
}

export interface ReminderPushPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  reminderId: string;
}

export function createReminderPushPayload(input: ReminderPushPayloadInput): ReminderPushPayload {
  return {
    title: `Reminder: ${input.title}`,
    body: input.note || "Připomínka je splatná. Otevři kalendář.",
    tag: `countdown-reminder-${input.reminderId}`,
    url: "/calendar",
    reminderId: input.reminderId,
  };
}
