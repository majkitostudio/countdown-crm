const dateTimeFormatter = new Intl.DateTimeFormat("cs-CZ", {
  dateStyle: "medium",
  timeStyle: "short",
});

const dayFormatter = new Intl.DateTimeFormat("cs-CZ", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function toDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Full date and time, e.g. "11. 11. 2026 20:37". Returns the raw value when it cannot be parsed. */
export function formatDateTime(value: string): string {
  const date = toDate(value);
  return date ? dateTimeFormatter.format(date) : value;
}

/** Local day key used for grouping a timeline; unknown timestamps group under the raw value. */
export function getDayKey(value: string): string {
  const date = toDate(value);
  if (!date) return value;
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Heading for a timeline day group: "Dnes", "Včera", otherwise the full local date. */
export function formatDayLabel(value: string): string {
  const date = toDate(value);
  if (!date) return value;
  const dayDifference = Math.round((startOfLocalDay(new Date()) - startOfLocalDay(date)) / 86_400_000);
  if (dayDifference === 0) return "Dnes";
  if (dayDifference === 1) return "Včera";
  return dayFormatter.format(date);
}

/** Short time only, e.g. "20:37". */
export function formatTime(value: string): string {
  const date = toDate(value);
  if (!date) return value;
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}
