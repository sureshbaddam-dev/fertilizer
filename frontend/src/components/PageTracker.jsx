import { useEffect, useRef } from 'react';
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

export default function PageTracker() {
  const location = useLocation();
  const lastTrackedPathRef = useRef('');

  useEffect(() => {
    const currentPath = location.pathname;

    // Prevent duplicate tracking in React StrictMode & double invocations for same route
    if (lastTrackedPathRef.current === currentPath) {
      return;
    }
    lastTrackedPathRef.current = currentPath;

    const trackView = async () => {
      try {
        const visitorId = getOrCreateVisitorId();
        await apiClient.post('/analytics/ping', {
          path: currentPath,
          visitorId,
        });
      } catch (_e) {
        // Non-blocking
      }
    };

    trackView();
  }, [location.pathname]);

  return null;
}
