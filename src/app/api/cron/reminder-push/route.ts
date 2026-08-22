import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createReminderPushPayload } from "@/lib/pushNotificationPayload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 50;
const CLAIM_STALE_AFTER_MS = 5 * 60 * 1000;

type PushStatus = "pending" | "sending" | "failed";

interface ReminderCandidate {
  id: string;
  workspace_id: string;
  owner_id: string;
  title: string;
  note: string | null;
  push_status: PushStatus;
  push_attempts: number;
  push_claimed_at: string | null;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

function requiredConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 1000);
  return "Push delivery failed.";
}

function isGone(error: unknown): boolean {
  const statusCode = (error as { statusCode?: number } | null)?.statusCode;
  return statusCode === 404 || statusCode === 410;
}

async function loadCandidates(
  admin: ReturnType<typeof createAdminClient>,
  now: string,
): Promise<ReminderCandidate[]> {
  const staleBefore = new Date(Date.now() - CLAIM_STALE_AFTER_MS).toISOString();
  const [available, stale] = await Promise.all([
    admin
      .from("operator_reminders")
      .select("id, workspace_id, owner_id, title, note, push_status, push_attempts, push_claimed_at")
      .eq("status", "open")
      .in("push_status", ["pending", "failed"])
      .lt("remind_at", now)
      .lt("push_attempts", MAX_ATTEMPTS)
      .is("push_claimed_at", null)
      .order("remind_at", { ascending: true })
      .limit(BATCH_SIZE),
    admin
      .from("operator_reminders")
      .select("id, workspace_id, owner_id, title, note, push_status, push_attempts, push_claimed_at")
      .eq("status", "open")
      .eq("push_status", "sending")
      .lt("remind_at", now)
      .lt("push_attempts", MAX_ATTEMPTS)
      .lt("push_claimed_at", staleBefore)
      .order("remind_at", { ascending: true })
      .limit(BATCH_SIZE),
  ]);

  if (available.error) throw available.error;
  if (stale.error) throw stale.error;
  return [...((available.data || []) as ReminderCandidate[]), ...((stale.data || []) as ReminderCandidate[])];
}

async function claimReminder(
  admin: ReturnType<typeof createAdminClient>,
  candidate: ReminderCandidate,
  now: string,
  staleBefore: string,
): Promise<ReminderCandidate | null> {
  let query = admin
    .from("operator_reminders")
    .update({
      push_status: "sending",
      push_attempts: candidate.push_attempts + 1,
      push_claimed_at: now,
      push_last_error: null,
    })
    .eq("id", candidate.id)
    .eq("status", "open")
    .eq("push_status", candidate.push_status)
    .lt("push_attempts", MAX_ATTEMPTS);

  query = candidate.push_status === "sending" ? query.lt("push_claimed_at", staleBefore) : query.is("push_claimed_at", null);

  const { data, error } = await query
    .select("id, workspace_id, owner_id, title, note, push_status, push_attempts, push_claimed_at")
    .maybeSingle();
  if (error) throw error;
  return (data as ReminderCandidate | null) || null;
}

async function updateSubscriptionAfterAttempt(
  admin: ReturnType<typeof createAdminClient>,
  subscription: PushSubscriptionRow,
  now: string,
  error?: unknown,
): Promise<void> {
  const update = error
    ? {
        ...(isGone(error) ? { disabled_at: now } : {}),
        last_failure_at: now,
        updated_at: now,
      }
    : { last_success_at: now, updated_at: now };
  const { error: updateError } = await admin.from("push_subscriptions").update(update).eq("id", subscription.id);
  if (updateError) throw updateError;
}

async function updateClaimedReminder(
  admin: ReturnType<typeof createAdminClient>,
  reminderId: string,
  claimedAt: string,
  update: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin
    .from("operator_reminders")
    .update(update)
    .eq("id", reminderId)
    .eq("status", "open")
    .eq("push_status", "sending")
    .eq("push_claimed_at", claimedAt);
  if (error) throw error;
}

async function deliverReminder(
  admin: ReturnType<typeof createAdminClient>,
  reminder: ReminderCandidate,
  now: string,
): Promise<"sent" | "skipped" | "failed"> {
  const { data: currentReminder, error: currentReminderError } = await admin
    .from("operator_reminders")
    .select("id, workspace_id, owner_id, title, note, push_status, push_attempts, push_claimed_at")
    .eq("id", reminder.id)
    .eq("status", "open")
    .eq("push_status", "sending")
    .eq("push_claimed_at", reminder.push_claimed_at)
    .maybeSingle();
  if (currentReminderError) throw currentReminderError;
  if (!currentReminder) return "skipped";
  reminder = currentReminder as ReminderCandidate;

  const { data: subscriptions, error: subscriptionError } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("workspace_id", reminder.workspace_id)
    .eq("user_id", reminder.owner_id)
    .is("disabled_at", null);
  if (subscriptionError) throw subscriptionError;

  const activeSubscriptions = (subscriptions || []) as PushSubscriptionRow[];
  if (activeSubscriptions.length === 0) {
    await updateClaimedReminder(admin, reminder.id, reminder.push_claimed_at || now, {
      push_status: "skipped",
      push_claimed_at: null,
      push_last_error: "No active push subscription.",
      updated_at: now,
    });
    return "skipped";
  }

  const payload = JSON.stringify(
    createReminderPushPayload({
      reminderId: reminder.id,
      title: reminder.title,
      note: reminder.note,
    }),
  );
  const results = await Promise.allSettled(
    activeSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload,
        );
        await updateSubscriptionAfterAttempt(admin, subscription, now);
        return { ok: true as const };
      } catch (error) {
        await updateSubscriptionAfterAttempt(admin, subscription, now, error);
        return { ok: false as const, error };
      }
    }),
  );
  const successes = results.filter((result) => result.status === "fulfilled" && result.value.ok).length;
  const failures = results
    .filter((result): result is PromiseFulfilledResult<{ ok: false; error: unknown }> => result.status === "fulfilled" && !result.value.ok)
    .map((result) => errorMessage(result.value.error));

  if (successes > 0) {
    await updateClaimedReminder(admin, reminder.id, reminder.push_claimed_at || now, {
      push_status: "sent",
      push_claimed_at: null,
      push_sent_at: now,
      push_last_error: null,
      updated_at: now,
    });
    return "sent";
  }

  const nextStatus = reminder.push_attempts >= MAX_ATTEMPTS ? "skipped" : "failed";
  await updateClaimedReminder(admin, reminder.id, reminder.push_claimed_at || now, {
    push_status: nextStatus,
    push_claimed_at: null,
    push_last_error: failures.join("; ").slice(0, 1000) || "Push delivery failed.",
    updated_at: now,
  });
  return nextStatus;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = requiredConfig();
  if (!config || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json({ error: "Push delivery is not configured." }, { status: 503 });
  }

  try {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const staleBefore = new Date(Date.now() - CLAIM_STALE_AFTER_MS).toISOString();
    const candidates = await loadCandidates(admin, now);
    const summary = { processed: 0, sent: 0, skipped: 0, failed: 0 };

    for (const candidate of candidates) {
      const claimed = await claimReminder(admin, candidate, now, staleBefore);
      if (!claimed) continue;
      summary.processed += 1;
      try {
        const result = await deliverReminder(admin, claimed, now);
        summary[result] += 1;
      } catch (error) {
        summary.failed += 1;
        await updateClaimedReminder(admin, claimed.id, claimed.push_claimed_at || now, {
          push_status: claimed.push_attempts >= MAX_ATTEMPTS ? "skipped" : "failed",
          push_claimed_at: null,
          push_last_error: errorMessage(error),
          updated_at: now,
        });
      }
    }

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
