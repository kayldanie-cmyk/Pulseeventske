/**
 * Formatting utilities for currency, dates, etc.
 */

export function formatKES(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(
  date: string | Date,
  opts?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  });
}

export function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString("en-KE", {
      month: "short",
      year: "numeric",
    })}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}
