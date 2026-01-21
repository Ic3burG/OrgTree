import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface AnalyticsContextType {
  track: (eventName: string, properties?: Record<string, unknown>, category?: string) => void;
  sessionId: string;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

// Helper to generate simple UUID if crypto.randomUUID not available
function generateUUID() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const ANALYTICS_ENDPOINT = '/api/analytics/events';
const SESSION_KEY = 'orgtree_analytics_session';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sessionId, setSessionId] = useState<string>('');
  const lastLocation = useRef<string | null>(null);

  // Initialize session
  useEffect(() => {
    let sid = localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = generateUUID();
      localStorage.setItem(SESSION_KEY, sid);
    }
    setSessionId(sid);
  }, []);

  const track = React.useCallback(
    async (
      eventName: string,
      properties: Record<string, unknown> = {},
      category: string = 'interaction'
    ) => {
      if (!sessionId) return; // Wait for session init

      // Prepare payload
      const event = {
        event_name: eventName,
        category,
        properties,
        session_id: sessionId,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };

      try {
        // Get token for auth context if available
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Fire and forget (don't await in UI thread usually, but here we use fetch)
        // Use navigator.sendBeacon if available for better reliability on page unload,
        // but fetch is easier for headers (auth).
        await fetch(ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify({ event }),
        });
      } catch (error) {
        console.error('Analytics error:', error);
      }
    },
    [sessionId]
  );

  // Track page views
  useEffect(() => {
    if (!sessionId) return;

    // Avoid double tracking strict mode
    if (lastLocation.current === location.pathname) return;
    lastLocation.current = location.pathname;

    track(
      'page_view',
      {
        path: location.pathname,
        search: location.search,
        title: document.title,
      },
      'navigation'
    );
  }, [location, sessionId, track]);

  return (
    <AnalyticsContext.Provider value={{ track, sessionId }}>{children}</AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
