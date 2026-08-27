/**
 * Unified Date & Timezone Utility for VEDIXA ERP (India - IST Asia/Kolkata)
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Parses any date or ISO UTC timestamp string into a valid Date object
 */
export function parseToDate(input) {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Formats a timestamp into full IST date and time string: "27 Aug 2026, 10:15 AM"
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

/**
 * Returns clean relative time or formatted date in IST ("Just now", "2 mins ago", "10:15 AM", "27 Aug")
 */
export function formatRelativeTimeIST(input) {
  const d = parseToDate(input);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) {
    return 'Just now';
  }
  if (diffMin < 60) {
    return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  }
  if (diffHour < 24) {
    return `${diffHour} hr${diffHour > 1 ? 's' : ''} ago`;
  }
  if (diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  }

  return d.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
