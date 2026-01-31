# E2E Testing Quick Start Guide

## Prerequisites

Ensure both frontend and backend dev servers are running:

```bash
# Terminal 1: Frontend dev server
npm run dev

# Terminal 2: Backend dev server
cd server && npm run dev
```

Verify servers are responding:
- Frontend: http://localhost:5173 (should show the app)
- Backend: http://localhost:3001/api/health (should return health status)

## Running Tests

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npm run test:e2e -- e2e/cuj-org-management.spec.ts
npm run test:e2e -- e2e/cuj-search.spec.ts
```

### Run Single Browser
```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

### Debug Mode (See Browser)
```bash
npm run test:e2e -- --headed
npm run test:e2e -- --debug
```

### Run Specific Test
```bash
npm run test:e2e -- -g "Complete Organization Lifecycle"
npm run test:e2e -- -g "Search & Discovery"
```

## Test Duration

Expected test times (approximate):
- **CUJ-1 (Organization Management)**: 30-60 seconds
- **CUJ-2 (Search & Discovery)**: 30-45 seconds
- **Full test suite**: 5-10 minutes (all browsers)

## Viewing Results

After tests complete:
```bash
# View HTML report
npx playwright show-report
```

Reports are saved in:
- `playwright-report/` - HTML report (gitignored)
- `test-results/` - Screenshots, videos, traces (gitignored)

## Troubleshooting

### Tests hang at startup
**Cause**: Servers not running or not responding
**Fix**: Manually start both servers (see Prerequisites above)

### "Element not found" errors
**Cause**: Timing issue or selector mismatch
**Fix**: Check `e2e/IMPROVEMENTS.md` for correct selector patterns

### Servers fail to start
**Cause**: Port already in use
**Fix**: Kill existing processes:
```bash
# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9

# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9
```

### Database conflicts
**Cause**: Test data from previous runs
**Fix**: Tests create unique data with timestamps, so conflicts are rare. If needed, restart the backend server to reset the test database.

## CI/CD

Tests run automatically on:
- Push to `main` branch
- Pull requests to `main` branch

Workflow file: `.github/workflows/e2e.yml`

View results in GitHub Actions tab.

## Recent Improvements (2025-01-31)

✅ **Selector Specificity**: Using exact label matches instead of generic patterns
✅ **Wait Strategies**: Explicit waits for dialogs, network idle, and state changes
✅ **Timeout Configuration**: Increased timeouts for complex interactions
✅ **Documentation**: Comprehensive guides in `e2e/IMPROVEMENTS.md`

See `e2e/IMPROVEMENTS.md` for detailed breakdown of all changes.
