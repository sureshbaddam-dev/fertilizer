/**
 * IST Date & Timezone Utility for Admin Control Center (Asia/Kolkata)
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

export function parseToDate(input) {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Formats full IST date and time: "27 Aug 2026, 10:15 AM"
 */
export function formatISTDateTime(input) {
  const d = parseToDate(input);
  return d.toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats time only in IST: "10:15 AM"
 */
export function formatISTTime(input) {
  const d = parseToDate(input);
  return d.toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
