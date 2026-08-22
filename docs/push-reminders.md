# Browser push reminders

Browser push is an opt-in notification channel for personal operator reminders. It does not sync Google/Outlook calendars and does not send notifications for callbacks.

## Required production configuration

Set these variables in the Vercel Production environment:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — public VAPID key used by the browser.
- `VAPID_PRIVATE_KEY` — private VAPID key; server-only.
- `VAPID_SUBJECT` — VAPID contact URI, for example `mailto:ops@example.com`.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only key used only by the cron worker.
- `CRON_SECRET` — secret used to authenticate the cron request.

Generate a key pair with `web-push generate-vapid-keys`, then store the values only in Vercel environment variables. Never commit them.

The cron route is `/api/cron/reminder-push` and runs every minute in production. Minute-level Vercel Cron requires a Vercel plan that supports minute schedules; preview deployments do not run production cron jobs.

If configuration is missing, the UI reports push as unavailable and the cron route returns `503`; it does not pretend that notifications were delivered.

## Delivery behavior

- A reminder is claimed before delivery, preventing normal concurrent cron runs from sending it twice.
- Failed delivery is retried up to three attempts. Stale claims can be reclaimed after five minutes.
- Expired browser subscriptions (`404`/`410`) are disabled automatically.
- A reminder with no active subscription is marked `skipped`.
- Editing a reminder's due or reminder time resets its push lifecycle to `pending`.
