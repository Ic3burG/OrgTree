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

interface Greeting {
  heading: string;
  subtitle: string;
}

export function getGreeting(date: Date = new Date()): Greeting {
  const heading = getHeading(date);
  const subtitle = getSubtitle(date);
  return { heading, subtitle };
}

function getHeading(date: Date): string {
  const day = date.getDay(); // 0=Sun, 6=Sat
  const hour = date.getHours();

  // Weekend takes highest priority
  if (day === 0 || day === 6) return 'Happy Weekend';

  // Friday
  if (day === 5) return 'Happy Friday';

  // Monday morning only (5am–11:59am)
  if (day === 1 && hour >= 5 && hour < 12) return 'Happy Monday';

  // Time-of-day
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getSubtitle(_date: Date): string {
  return '';
}
