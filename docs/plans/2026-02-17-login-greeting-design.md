# Login Page Dynamic Greeting

**Date**: 2026-02-17
**Status**: Approved

## Summary

Replace the static "Welcome Back" heading and "Sign in to your OrgTree account" subtitle on the login page with dynamic, context-aware greetings. The heading changes based on time-of-day, day-of-week, and the subtitle rotates through a pool of witty, motivational, and straightforward messages on a 6-hour cycle.

## Approach

A single pure utility function `getGreeting(date?: Date)` in `src/utils/greetings.ts`. No backend changes, no external dependencies, no new state management. The optional `date` parameter enables deterministic testing.

## Heading Logic

Priority order (first match wins):

| Condition         | Heading            |
| ----------------- | ------------------ |
| Weekend (Sat/Sun) | "Happy Weekend"    |
| Friday            | "Happy Friday"     |
| Monday morning    | "Happy Monday"     |
| 5am–11:59am       | "Good Morning"     |
| 12pm–4:59pm       | "Good Afternoon"   |
| 5pm–8:59pm        | "Good Evening"     |
| 9pm–4:59am        | "Good Evening"     |

## Subtitle Selection

A flat array of ~20+ general subtitles plus 4 seasonal subtitles. Deterministically selected using a hash of the current 6-hour window: `Math.floor(hoursIntoYear / 6) % pool.length`. The same subtitle shows for any 6-hour block, changing predictably throughout the day.

### Tone Categories

**Witty**
- "Your org chart missed you."
- "Hierarchy never looked this good."
- "Back to connect the dots."
- "Who reports to whom? Let's find out."
- "Org charts don't build themselves. Well, almost."

**Motivational**
- "Ready to build something great?"
- "Great teams start with great structure."
- "Let's shape your organization."
- "Every great org starts with a plan."
- "Structure brings clarity."

**Straightforward**
- "Sign in to your OrgTree account."
- "Let's get to work."
- "Pick up where you left off."
- "Your team is waiting."

**Seasonal** (included in pool only during their season)
- Winter (Dec–Feb): "Stay warm, stay organized."
- Spring (Mar–May): "Fresh season, fresh structure."
- Summer (Jun–Aug): "Sunshine and structure."
- Fall (Sep–Nov): "Crisp air, clean org charts."

## Integration

### LoginPage.tsx Changes

Import `getGreeting` and call it at the top of the component:

```tsx
const { heading, subtitle } = getGreeting();
```

Replace:
- `"Welcome Back"` → `{heading}`
- `"Sign in to your OrgTree account"` → `{subtitle}`

No new state, effects, or hooks. No animation. The greeting is present on render.

## Files

| File | Action |
| --- | --- |
| `src/utils/greetings.ts` | Create — greeting utility function |
| `src/utils/greetings.test.ts` | Create — unit tests |
| `src/components/auth/LoginPage.tsx` | Modify — use dynamic greeting |

## Testing

All tests are deterministic via the injectable `date` parameter:

- Time-of-day headings (8am, 1pm, 7pm, 11pm)
- Day-of-week headings (Friday, Saturday, Sunday, Monday)
- Subtitle determinism (same date = same subtitle)
- 6-hour window rotation (dates 7 hours apart = different subtitles)
- Seasonal pool inclusion (dates in each season)
- Edge cases (midnight, 5am boundary, year rollover)
