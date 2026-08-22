import { VisitorAnalytics } from '../models/visitorAnalytics.model.js';

const recentActivityLogs = []; // Array of max 50 recent hits
const topPagesHitsMap = new Map(); // path -> count

// Hourly hits store for today: hour -> count
const hourlyHitsToday = new Array(24).fill(0);
const hourlyUniqueToday = new Array(24).fill(0);
const hourlyIpsToday = Array.from({ length: 24 }, () => new Set());
let currentTrackingDate = new Date().toISOString().split('T')[0];

export const getTopPagesBreakdown = () => {
  const list = [];
  for (const [path, views] of topPagesHitsMap.entries()) {
    list.push({ path, views });
  }
  if (list.length === 0) {
    return [
      { path: '/pricing', views: 0 },
      { path: '/', views: 0 },
      { path: '/features', views: 0 },
    ];
  }
  return list.sort((a, b) => b.views - a.views).slice(0, 10);
};

export const getRecentActivityTimeline = () => {
  return recentActivityLogs.slice(0, 20);
};

export const getHourlyAnalyticsToday = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  if (currentTrackingDate !== todayStr) {
    currentTrackingDate = todayStr;
    hourlyHitsToday.fill(0);
    hourlyUniqueToday.fill(0);
    hourlyIpsToday.forEach((s) => s.clear());
    topPagesHitsMap.clear();
  }
  return hourlyHitsToday.map((hits, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}:00`,
    hits,
    unique: hourlyUniqueToday[hour],
  }));
};

export const recordVisitorHit = async ({ ip, path, userAgent, visitorId }) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const hour = now.getHours();

    if (currentTrackingDate !== todayStr) {
      currentTrackingDate = todayStr;
      hourlyHitsToday.fill(0);
      hourlyUniqueToday.fill(0);
      hourlyIpsToday.forEach((s) => s.clear());
      topPagesHitsMap.clear();
    }

    const effectiveId = visitorId || `${ip}_${(userAgent || '').substring(0, 30)}`;
    const anonId = 'Visitor #' + (Math.abs(hashCode(effectiveId)) % 1000).toString().padStart(3, '0');

    const cleanPath = (path || '/').split('?')[0];

    // 1. Update Top Pages
    const currentPathHits = topPagesHitsMap.get(cleanPath) || 0;
    topPagesHitsMap.set(cleanPath, currentPathHits + 1);

    // 3. Update Recent Activity Log
    recentActivityLogs.unshift({
      timestamp: now.getTime(),
      timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      path: cleanPath,
      visitorId: anonId,
    });
    if (recentActivityLogs.length > 50) recentActivityLogs.pop();

    // 4. Update Hourly Statistics
    hourlyHitsToday[hour] += 1;
    if (!hourlyIpsToday[hour].has(ip)) {
      hourlyIpsToday[hour].add(ip);
      hourlyUniqueToday[hour] += 1;
    }

    // 5. Update Daily Analytics in MongoDB atomically
    await VisitorAnalytics.updateOne(
      { dateStr: todayStr },
      {
        $inc: { totalHits: 1 },
        $addToSet: { visitorIps: { $each: [ip] } },
      },
      { upsert: true }
    );
  } catch (_err) {
    // Non-blocking
  }
};

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

export const trackWebsiteVisitor = (req, res, next) => {
  try {
    const path = (req.path || req.originalUrl || '').toLowerCase();
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();

    // 1. Skip backend API calls
    if (path.startsWith('/api/v1') || path.startsWith('/api/')) {
      return next();
    }

    // 2. Skip static uploaded files & assets
    if (
      path.startsWith('/uploads/') ||
      path.endsWith('.js') ||
      path.endsWith('.css') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.jpeg') ||
      path.endsWith('.svg') ||
      path.endsWith('.webp') ||
      path.endsWith('.ico') ||
      path.endsWith('.json') ||
      path.endsWith('.map')
    ) {
      return next();
    }

    // 3. Skip system health check & favicon
    if (path === '/health' || path === '/favicon.ico') {
      return next();
    }

    // 4. Skip web crawlers, bots, lighthouse, postman, curl
    if (
      userAgent.includes('bot') ||
      userAgent.includes('crawler') ||
      userAgent.includes('spider') ||
      userAgent.includes('lighthouse') ||
      userAgent.includes('headless') ||
      userAgent.includes('curl') ||
      userAgent.includes('postman')
    ) {
      return next();
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const visitorId = req.headers['x-visitor-id'] || req.cookies?.visitor_id;

    // Fire and forget non-blocking background hit logging
    recordVisitorHit({ ip, path, userAgent, visitorId }).catch(() => {});
  } catch (_err) {
    // Non-blocking
  }
  next();
};
