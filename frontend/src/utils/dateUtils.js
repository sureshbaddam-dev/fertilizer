/**
 * Unified Date & Timezone Utility for VEDIXA ERP (India - IST Asia/Kolkata)
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Safely parses any date or ISO UTC timestamp string into a valid Date object.
 * Returns null if input is null/undefined/empty or invalid date.
 */
export function parseToDate(input) {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats full IST date: "05 Sep 2026" (or fallback if empty)
 */
export function formatISTDate(input, fallback = '—') {
  const d = parseToDate(input);
  if (!d) return fallback;
  return d.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats full IST date and time: "05 Sep 2026, 10:15 AM"
 */
export function formatISTDateTime(input, fallback = '—') {
  const d = parseToDate(input);
  if (!d) return fallback;
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
export function formatISTTime(input, fallback = '—') {
  const d = parseToDate(input);
  if (!d) return fallback;
  return d.toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats numeric short date in IST: "05/09/2026"
 */
export function formatISTShortDate(input, fallback = '—') {
  const d = parseToDate(input);
  if (!d) return fallback;
  return d.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Generates dynamic current date header string based on real-time clock in IST:
 * "Today, 05 Sep 2026"
 */
export function formatCurrentISTDateHeader() {
  const todayIST = new Date().toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return `Today, ${todayIST}`;
}

/**
 * Returns clean relative time or formatted date in IST ("Just now", "2 mins ago", "10:15 AM", "05 Sep 2026")
 */
export function formatRelativeTimeIST(input, fallback = '—') {
  const d = parseToDate(input);
  if (!d) return fallback;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec >= 0 && diffSec < 45) {
    return 'Just now';
  }
  if (diffMin >= 0 && diffMin < 60) {
    return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
  }
  if (diffHour >= 0 && diffHour < 24) {
    return `${diffHour} hr${diffHour > 1 ? 's' : ''} ago`;
  }
  if (diffDay >= 0 && diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  }

  return formatISTDateTime(d, fallback);
}

/**
 * Calculates remaining days from now until expiryDate in IST.
 * Returns 0 if expired or invalid.
 */
export function calculateRemainingDays(expiryDate) {
  const d = parseToDate(expiryDate);
  if (!d) return 0;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

