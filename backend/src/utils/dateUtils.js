/**
 * Parse business transaction date into an exact Date timestamp.
 * Avoids midnight UTC flattening (which displays as 05:30 AM in India Standard Time).
 *
 * @param {string|Date} inputDate - Raw date string (e.g. "YYYY-MM-DD" or ISO string) or Date object
 * @returns {Date} Parsed Date with exact timestamp
 */
export function parseTransactionTimestamp(inputDate) {
  if (!inputDate) return new Date();
  if (inputDate instanceof Date) {
    if (isNaN(inputDate.getTime())) return new Date();
    return inputDate;
  }
  if (typeof inputDate === 'string') {
    const trimmed = inputDate.trim();
    if (!trimmed) return new Date();

    // Match date-only string like YYYY-MM-DD
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (dateOnlyMatch) {
      const year = parseInt(dateOnlyMatch[1], 10);
      const month = parseInt(dateOnlyMatch[2], 10) - 1;
      const day = parseInt(dateOnlyMatch[3], 10);
      const now = new Date();
      // If the date is today's local date, preserve current time of day
      if (
        now.getFullYear() === year &&
        now.getMonth() === month &&
        now.getDate() === day
      ) {
        return now;
      }
      // If it's a historical/custom date, combine the date with current time of day
      return new Date(year, month, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      // If it's midnight UTC (e.g. from an ISO date-only string "2026-09-09T00:00:00.000Z")
      if (
        parsed.getUTCHours() === 0 &&
        parsed.getUTCMinutes() === 0 &&
        parsed.getUTCSeconds() === 0 &&
        parsed.getUTCMilliseconds() === 0
      ) {
        const now = new Date();
        const year = parsed.getUTCFullYear();
        const month = parsed.getUTCMonth();
        const day = parsed.getUTCDate();
        if (now.getFullYear() === year && now.getMonth() === month && now.getDate() === day) {
          return now;
        }
        return new Date(year, month, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      }
      return parsed;
    }
  }
  return new Date();
}

/**
 * Get effective timestamp for ledger sorting and display.
 * Falls back to createdAt if date is a midnight-UTC timestamp.
 *
 * @param {Object} entry - Ledger entry or transaction object
 * @returns {Date} Effective timestamp
 */
export function getEffectiveTransactionTimestamp(entry) {
  if (!entry) return new Date();
  const d = entry.date ? new Date(entry.date) : null;
  const c = entry.createdAt ? new Date(entry.createdAt) : null;

  if (d && !isNaN(d.getTime())) {
    // If date is midnight UTC but createdAt has real intraday time
    if (
      d.getUTCHours() === 0 &&
      d.getUTCMinutes() === 0 &&
      d.getUTCSeconds() === 0 &&
      c &&
      !isNaN(c.getTime()) &&
      (c.getUTCHours() !== 0 || c.getUTCMinutes() !== 0 || c.getUTCSeconds() !== 0)
    ) {
      // If date and createdAt are the same day
      const dDay = d.toISOString().slice(0, 10);
      const cDay = c.toISOString().slice(0, 10);
      if (dDay === cDay) {
        return c;
      }
      // Combine d's date with c's time
      return new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        c.getHours(),
        c.getMinutes(),
        c.getSeconds(),
        c.getMilliseconds()
      );
    }
    return d;
  }

  if (c && !isNaN(c.getTime())) return c;
  return new Date();
}
