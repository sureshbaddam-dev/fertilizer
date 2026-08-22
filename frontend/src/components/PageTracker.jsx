import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../services/apiClient';

function getOrCreateVisitorId() {
  let vId = localStorage.getItem('vedixa_visitor_id');
  if (!vId) {
    vId = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('vedixa_visitor_id', vId);
  }
  return vId;
}

// Module-level tracking state (persists across component unmounts & remounts)
let globalLastTrackedPath = '';
let globalLastTrackedTime = 0;
let isPingInFlight = false;

export default function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    const now = Date.now();

    // 1. Prevent duplicate pings for the same route if tracked within the last 60 seconds
    if (globalLastTrackedPath === currentPath && now - globalLastTrackedTime < 60000) {
      return;
    }

    // 2. Prevent concurrent in-flight ping requests
    if (isPingInFlight) {
      return;
    }

    globalLastTrackedPath = currentPath;
    globalLastTrackedTime = now;
    isPingInFlight = true;

    const trackView = async () => {
      try {
        const visitorId = getOrCreateVisitorId();
        await apiClient.post('/analytics/ping', {
          path: currentPath,
          visitorId,
        });
      } catch (_e) {
        // Non-blocking
      } finally {
        isPingInFlight = false;
      }
    };

    trackView();
  }, [location.pathname]);

  return null;
}
