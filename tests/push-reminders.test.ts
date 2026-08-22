import { describe, expect, it } from "vitest";
import { createReminderPushPayload } from "@/lib/pushNotificationPayload";

describe("reminder push payload", () => {
  it("creates a stable notification tag and calendar target", () => {
    expect(
      createReminderPushPayload({
        reminderId: "reminder-1",
        title: "Call Jan",
        note: "Ask about the renewal",
      }),
    ).toEqual({
      title: "Reminder: Call Jan",
      body: "Ask about the renewal",
      tag: "countdown-reminder-reminder-1",
      url: "/calendar",
      reminderId: "reminder-1",
    });
  });

  it("uses a truthful default body when the reminder has no note", () => {
    expect(
      createReminderPushPayload({ reminderId: "reminder-2", title: "Follow up", note: null }).body,
    ).toContain("Připomínka je splatná");
  });

});
