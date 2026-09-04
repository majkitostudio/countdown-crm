export function normalizePhoneNumber(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (compact.startsWith("00")) {
    const international = `+${compact.slice(2)}`;
    return /^\+[1-9]\d{6,14}$/.test(international) ? international : null;
  }

  if (/^\+[1-9]\d{6,14}$/.test(compact)) return compact;

  // The current CRM is Czech-first. Keep local nine-digit numbers usable while
  // still requiring E.164 for every other provider-facing number.
  if (/^[1-9]\d{8}$/.test(compact)) return `+420${compact}`;
  return null;
}
