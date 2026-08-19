create index if not exists operator_reminders_owner_id_idx
  on public.operator_reminders(owner_id);

create index if not exists operator_reminders_lead_id_idx
  on public.operator_reminders(lead_id);
