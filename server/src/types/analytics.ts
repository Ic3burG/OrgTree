// Analytics Type Definitions

export interface AnalyticsEvent {
  event_name: string;
  category: string;
  properties?: Record<string, any>;
  session_id: string;
  user_id?: string;
  url?: string;
  device_type?: string;
  timestamp?: string; // ISO date string
}

export interface DatabaseAnalyticsEvent {
  id: string;
  event_name: string;
  category: string;
  properties: string; // JSON string
  session_id: string;
  user_id: string | null;
  url: string | null;
  device_type: string | null;
  created_at: string;
}

export interface AnalyticsSummary {
  total_events: number;
  unique_sessions: number;
  top_events: Array<{ name: string; count: number }>;
  events_by_day: Array<{ date: string; count: number }>;
}
