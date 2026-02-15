/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

// Analytics Type Definitions

export interface AnalyticsEvent {
  event_name: string;
  category: string;
  properties?: Record<string, unknown>;
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
