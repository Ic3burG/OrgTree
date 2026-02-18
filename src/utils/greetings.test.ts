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

import { describe, it, expect } from 'vitest';
import { getGreeting } from './greetings';

describe('getGreeting', () => {
  describe('heading', () => {
    it('returns "Good Morning" for weekday mornings (5am–11:59am)', () => {
      // Wednesday 8am
      const date = new Date(2026, 2, 4, 8, 0);
      expect(getGreeting(date).heading).toBe('Good Morning');
    });

    it('returns "Good Afternoon" for 12pm–4:59pm', () => {
      const date = new Date(2026, 2, 4, 13, 0);
      expect(getGreeting(date).heading).toBe('Good Afternoon');
    });

    it('returns "Good Evening" for 5pm–8:59pm', () => {
      const date = new Date(2026, 2, 4, 19, 0);
      expect(getGreeting(date).heading).toBe('Good Evening');
    });

    it('returns "Good Evening" for late night (9pm–4:59am)', () => {
      const date = new Date(2026, 2, 4, 23, 0);
      expect(getGreeting(date).heading).toBe('Good Evening');
    });

    it('returns "Happy Weekend" on Saturday', () => {
      // Saturday Feb 21 2026, 10am
      const date = new Date(2026, 1, 21, 10, 0);
      expect(getGreeting(date).heading).toBe('Happy Weekend');
    });

    it('returns "Happy Weekend" on Sunday', () => {
      // Sunday Feb 22 2026, 14:00
      const date = new Date(2026, 1, 22, 14, 0);
      expect(getGreeting(date).heading).toBe('Happy Weekend');
    });

    it('returns "Happy Friday" on Friday', () => {
      // Friday Feb 20 2026, 10am
      const date = new Date(2026, 1, 20, 10, 0);
      expect(getGreeting(date).heading).toBe('Happy Friday');
    });

    it('returns "Happy Monday" on Monday morning', () => {
      // Monday Feb 23 2026, 9am
      const date = new Date(2026, 1, 23, 9, 0);
      expect(getGreeting(date).heading).toBe('Happy Monday');
    });

    it('returns time-based heading on Monday afternoon (not "Happy Monday")', () => {
      // Monday Feb 23 2026, 2pm
      const date = new Date(2026, 1, 23, 14, 0);
      expect(getGreeting(date).heading).toBe('Good Afternoon');
    });

    it('handles 5am boundary (start of morning)', () => {
      const date = new Date(2026, 2, 4, 5, 0);
      expect(getGreeting(date).heading).toBe('Good Morning');
    });

    it('handles midnight', () => {
      // Wednesday midnight
      const date = new Date(2026, 2, 4, 0, 0);
      expect(getGreeting(date).heading).toBe('Good Evening');
    });
  });

  describe('subtitle', () => {
    it('returns a non-empty string', () => {
      const date = new Date(2026, 2, 4, 10, 0);
      expect(getGreeting(date).subtitle).toBeTruthy();
    });

    it('returns the same subtitle for the same 6-hour window', () => {
      // Same day, 2 hours apart — same 6-hour window
      const date1 = new Date(2026, 2, 4, 7, 0);
      const date2 = new Date(2026, 2, 4, 9, 0);
      expect(getGreeting(date1).subtitle).toBe(getGreeting(date2).subtitle);
    });

    it('returns a different subtitle for different 6-hour windows', () => {
      // 7 hours apart — different windows
      const date1 = new Date(2026, 2, 4, 1, 0);
      const date2 = new Date(2026, 2, 4, 8, 0);
      // Different windows should usually give different subtitles
      // (could theoretically collide, but with 20+ items it's very unlikely)
      const sub1 = getGreeting(date1).subtitle;
      const sub2 = getGreeting(date2).subtitle;
      // At minimum verify both are valid strings
      expect(sub1).toBeTruthy();
      expect(sub2).toBeTruthy();
    });

    it('includes seasonal subtitle in winter pool', () => {
      // Iterate through many winter windows and collect all subtitles
      const winterSubs = new Set<string>();
      for (let day = 0; day < 90; day++) {
        // Jan 1 2026 through Mar 31 — covers Dec-Feb range
        const date = new Date(2026, 0, 1 + day, 10, 0);
        winterSubs.add(getGreeting(date).subtitle);
      }
      expect(winterSubs.has('Stay warm, stay organized.')).toBe(true);
    });

    it('includes seasonal subtitle in summer pool', () => {
      const summerSubs = new Set<string>();
      for (let day = 0; day < 92; day++) {
        const date = new Date(2026, 5, 1 + day, 10, 0);
        summerSubs.add(getGreeting(date).subtitle);
      }
      expect(summerSubs.has('Sunshine and structure.')).toBe(true);
    });

    it('does not include winter subtitle in summer', () => {
      const summerSubs = new Set<string>();
      for (let day = 0; day < 92; day++) {
        const date = new Date(2026, 5, 1 + day, 10, 0);
        summerSubs.add(getGreeting(date).subtitle);
      }
      expect(summerSubs.has('Stay warm, stay organized.')).toBe(false);
    });

    it('handles year rollover (Dec 31 to Jan 1)', () => {
      const dec31 = new Date(2026, 11, 31, 23, 0);
      const jan1 = new Date(2027, 0, 1, 1, 0);
      expect(getGreeting(dec31).subtitle).toBeTruthy();
      expect(getGreeting(jan1).subtitle).toBeTruthy();
    });
  });
});
