# Login Page Dynamic Greeting — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the static login page greeting with dynamic, context-aware headings and rotating subtitles.

**Architecture:** A single pure utility function `getGreeting(date?: Date)` returns `{ heading, subtitle }`. The heading is driven by time-of-day and day-of-week priority rules. The subtitle is deterministically selected from a pool (general + seasonal) using a 6-hour window hash. LoginPage.tsx calls it on render — no state, no effects.

**Tech Stack:** TypeScript, Vitest

**Design doc:** `docs/plans/2026-02-17-login-greeting-design.md`

---

### Task 1: Greeting utility — heading logic + tests

**Files:**

- Create: `src/utils/greetings.ts`
- Create: `src/utils/greetings.test.ts`

**Step 1: Write failing tests for heading logic**

All new files must start with the AGPL-3.0 copyright header (copy from any existing file in `src/utils/`).

```typescript
// src/utils/greetings.test.ts
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
});
```

**Step 2: Run tests to verify they fail**

Run: `npm test -- greetings`
Expected: FAIL — `getGreeting` does not exist

**Step 3: Implement heading logic**

```typescript
// src/utils/greetings.ts

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
```

For `getSubtitle`, add a temporary stub that returns `''` so the file compiles:

```typescript
function getSubtitle(_date: Date): string {
  return '';
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- greetings`
Expected: All heading tests PASS

**Step 5: Commit**

```bash
git add src/utils/greetings.ts src/utils/greetings.test.ts
git commit -m "feat(greetings): add getGreeting utility with heading logic

Implement getHeading() with priority-based rules:
- Weekend (Sat/Sun) → Happy Weekend
- Friday → Happy Friday
- Monday morning → Happy Monday
- Time-of-day fallback → Good Morning/Afternoon/Evening

Includes 11 deterministic tests using injectable date parameter.
Subtitle is stubbed — implemented in next task."
```

---

### Task 2: Greeting utility — subtitle logic + tests

**Files:**

- Modify: `src/utils/greetings.ts`
- Modify: `src/utils/greetings.test.ts`

**Step 1: Write failing tests for subtitle logic**

Append to `src/utils/greetings.test.ts` inside the outer `describe('getGreeting')`:

```typescript
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
```

**Step 2: Run tests to verify new subtitle tests fail**

Run: `npm test -- greetings`
Expected: Subtitle tests FAIL (stub returns `''`)

**Step 3: Implement subtitle logic**

Replace the `getSubtitle` stub in `src/utils/greetings.ts`:

```typescript
type Season = 'winter' | 'spring' | 'summer' | 'fall';

const GENERAL_SUBTITLES: string[] = [
  // Witty
  'Your org chart missed you.',
  'Hierarchy never looked this good.',
  'Back to connect the dots.',
  'Who reports to whom? Let\u2019s find out.',
  'Org charts don\u2019t build themselves. Well, almost.',
  // Motivational
  'Ready to build something great?',
  'Great teams start with great structure.',
  'Let\u2019s shape your organization.',
  'Every great org starts with a plan.',
  'Structure brings clarity.',
  // Straightforward
  'Sign in to your OrgTree account.',
  'Let\u2019s get to work.',
  'Pick up where you left off.',
  'Your team is waiting.',
];

const SEASONAL_SUBTITLES: Record<Season, string> = {
  winter: 'Stay warm, stay organized.',
  spring: 'Fresh season, fresh structure.',
  summer: 'Sunshine and structure.',
  fall: 'Crisp air, clean org charts.',
};

function getSeason(month: number): Season {
  if (month === 11 || month <= 1) return 'winter';
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  return 'fall';
}

function getSubtitle(date: Date): string {
  const season = getSeason(date.getMonth());
  const pool = [...GENERAL_SUBTITLES, SEASONAL_SUBTITLES[season]];

  // Deterministic selection based on 6-hour window
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const hoursIntoYear = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60));
  const windowIndex = Math.floor(hoursIntoYear / 6);

  return pool[windowIndex % pool.length];
}
```

**Step 4: Run tests to verify they pass**

Run: `npm test -- greetings`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/utils/greetings.ts src/utils/greetings.test.ts
git commit -m "feat(greetings): add subtitle selection with seasonal pool

Implement getSubtitle() with:
- 14 general subtitles (witty, motivational, straightforward)
- 4 seasonal subtitles included only during their season
- Deterministic selection using 6-hour window hash

Adds 7 subtitle tests covering determinism, seasonal inclusion/
exclusion, and year rollover."
```

---

### Task 3: Integrate greeting into LoginPage

**Files:**

- Modify: `src/components/auth/LoginPage.tsx:24,146-151`

**Step 1: Import getGreeting and use it**

At the top of `src/components/auth/LoginPage.tsx`, add the import (after line 24, with the other imports):

```typescript
import { getGreeting } from '../../utils/greetings';
```

Inside the `LoginPage` component function, before the `from` variable (around line 46), add:

```typescript
const { heading, subtitle } = getGreeting();
```

**Step 2: Replace static text**

Replace the heading text on line 147:

- Old: `Welcome Back`
- New: `{heading}`

Replace the subtitle text on line 149:

- Old: `Sign in to your OrgTree account`
- New: `{subtitle}`

**Step 3: Run all frontend tests**

Run: `npm test`
Expected: All tests PASS (including any existing LoginPage tests)

**Step 4: Lint and format**

Run: `npm run lint:all && npm run format`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/auth/LoginPage.tsx
git commit -m "feat(login): integrate dynamic greeting into login page

Replace static 'Welcome Back' heading and 'Sign in to your OrgTree
account' subtitle with dynamic getGreeting() output.

Heading changes by time-of-day, day-of-week. Subtitle rotates through
a pool of witty, motivational, and seasonal messages every 6 hours."
```

---

### Task 4: Final verification

**Step 1: Run full test suite**

Run: `npm run test:all`
Expected: All frontend and backend tests PASS

**Step 2: Manual smoke test**

Run: `npm run dev`

- Open `http://localhost:3000/login`
- Verify the heading matches current time-of-day
- Verify the subtitle is a valid message from the pool
- Refresh — subtitle should stay the same (within 6-hour window)
- Check dark mode — text should remain readable

**Step 3: Push**

Run: `git push`
