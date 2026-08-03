const TZ = "Asia/Karachi";

/** Returns "YYYY-MM-DD" in Pakistan time */
export function toLocalDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Returns hour (0-23) in Pakistan time */
export function toLocalHour(date: Date): number {
  return parseInt(date.toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false }), 10) % 24;
}

/** Returns start-of-day in UTC for a Pakistan-local "YYYY-MM-DD" string */
export function pkDayStart(dateStr: string): Date {
  // dateStr is YYYY-MM-DD in Pakistan time; we need the UTC equivalent of 00:00 PKT
  return new Date(`${dateStr}T00:00:00+05:00`);
}

/** Returns end-of-day in UTC for a Pakistan-local "YYYY-MM-DD" string */
export function pkDayEnd(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999+05:00`);
}

/** Today's date string in Pakistan time */
export function todayPK(): string {
  return toLocalDateStr(new Date());
}
