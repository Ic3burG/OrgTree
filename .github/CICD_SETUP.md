# CI/CD Setup Guide

This document explains the GitHub Actions CI/CD pipeline for OrgTree.

## Overview

The project uses two GitHub Actions workflows:

1. **CI (Continuous Integration)** - `ci.yml`
   - Runs on every push and pull request
   - Executes tests, linting, and builds
   - Ensures code quality before merging

2. **CD (Continuous Deployment)** - `cd.yml`
   - Triggers automatically when CI passes
   - Deploys to staging (develop branch) or production (main branch)
   - Verifies deployment health

## Branch Strategy

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Feature   │────▶│   develop   │────▶│    main     │
│   Branches  │     │  (staging)  │     │(production) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Staging    │     │ Production  │
                    │   Server    │     │   Server    │
                    └─────────────┘     └─────────────┘
```

- **develop branch** → Deploys to staging environment
- **main branch** → Deploys to production environment
- Feature branches merge into `develop` first for testing

## Environments

| Environment | Branch | URL |
|-------------|--------|-----|
| Staging | `develop` | https://orgtree-staging.onrender.com |
| Production | `main` | https://orgtree-app.onrender.com |

## Workflows

### CI Workflow

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`

**Jobs:**

1. **Lint** - Code quality checks
   - ESLint on frontend and backend
   - Prettier format verification

2. **Test Frontend** - Frontend testing
   - Runs Vitest test suite
   - Generates coverage report
   - Uploads coverage to Codecov (optional)

3. **Test Backend** - Backend testing
   - Runs Vitest test suite
   - Generates coverage report
   - Uploads coverage to Codecov (optional)

4. **Build** - Production build verification
   - Builds frontend with Vite
   - Uploads build artifacts
   - Only runs if all tests pass

5. **Security** - Dependency audit
   - Runs `npm audit` on frontend and backend
   - Checks for high-severity vulnerabilities

### CD Workflow

**Triggers:**
- Runs automatically when CI workflow completes successfully
- Only deploys when CI passes (uses `workflow_run` trigger)

**Jobs:**

For **develop** branch (staging):
1. **Deploy to Staging** - Triggers Render staging deployment
2. **Verify Staging** - Health check with retry logic

For **main** branch (production):
1. **Deploy to Production** - Triggers Render production deployment
2. **Verify Production** - Health check with retry logic

**Key Feature:** The CD workflow uses `workflow_run` trigger with `conclusion == 'success'` check. This ensures deployments only happen after CI passes - broken code cannot be deployed.

## Required GitHub Secrets

### Production Deployment

#### `RENDER_DEPLOY_HOOK_URL`

**Description:** Webhook URL to trigger Render production deployments

**How to obtain:**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your production service (orgtree-app)
3. Navigate to **Settings** → **Deploy Hook**
4. Copy the deploy hook URL
5. Add to GitHub:
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: (paste the Render deploy hook URL)

### Staging Deployment

#### `RENDER_STAGING_DEPLOY_HOOK_URL`

**Description:** Webhook URL to trigger Render staging deployments

**How to obtain:**

1. Create a staging service on Render (see "Setting Up Staging Environment" below)
2. Navigate to **Settings** → **Deploy Hook**
3. Copy the deploy hook URL
4. Add to GitHub:
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `RENDER_STAGING_DEPLOY_HOOK_URL`
   - Value: (paste the staging deploy hook URL)

### Optional: Codecov Integration

**`CODECOV_TOKEN`** (optional)

1. Go to [Codecov.io](https://codecov.io/)
2. Sign in with GitHub
3. Add your repository
4. Copy the upload token
5. Add to GitHub secrets as `CODECOV_TOKEN`

**Note:** The workflows will continue without this token (using `continue-on-error: true`)

## Setting Up Staging Environment

### Create Staging Service on Render

1. Go to Render Dashboard → **New Web Service**
2. Connect to your GitHub repository
3. Configure:
   - **Name:** `orgtree-staging`
   - **Branch:** `develop`
   - **Root Directory:** `server`
   - **Build Command:** `cd .. && ./scripts/render-build.sh`
   - **Start Command:** `npm start`
4. Add persistent disk (1GB) at `/opt/render/project/src/data`
5. Set environment variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `CI` | `true` (required - skips husky install) |
| `JWT_SECRET` | `<unique-staging-secret>` (different from production!) |
| `DATABASE_URL` | `file:./database.db` (free tier) or `file:/opt/render/project/src/data/staging.db` (paid with disk) |
| `FRONTEND_URL` | `https://orgtree-staging.onrender.com` |
| `RP_ID` | `orgtree-staging.onrender.com` |
| `ORIGIN` | `https://orgtree-staging.onrender.com` |

6. Copy the Deploy Hook URL and add it as `RENDER_STAGING_DEPLOY_HOOK_URL` secret in GitHub

**Note:** On free tier, use `DATABASE_URL=file:./database.db` since persistent disks aren't available.

### Cost

- **Free tier:** $0/month (spins down after 15min inactivity)
- **Starter tier:** $7/month (always-on, faster cold starts)

### Free Tier Limitations

On free tier, persistent disks are not available. This means:
- Database resets on each deploy/restart
- Data is ephemeral (acceptable for staging/testing)
- If you need persistent data, upgrade to a paid tier

For staging, ephemeral data is usually fine - you can seed test data on startup if needed.

## Workflow Status Badges

Add these badges to your README.md:

```markdown
[![CI](https://github.com/Ic3burG/OrgTree/actions/workflows/ci.yml/badge.svg)](https://github.com/Ic3burG/OrgTree/actions/workflows/ci.yml)
[![CD](https://github.com/Ic3burG/OrgTree/actions/workflows/cd.yml/badge.svg)](https://github.com/Ic3burG/OrgTree/actions/workflows/cd.yml)
```

## Deployment Flow

```
┌─────────────────┐
│ Push to branch  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   CI Workflow   │
│ (lint, test,    │
│  build)         │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  FAIL      SUCCESS
    │         │
    ▼         ▼
  STOP    ┌───┴───┐
          │       │
          ▼       ▼
      develop    main
          │       │
          ▼       ▼
      STAGING  PRODUCTION
          │       │
          ▼       ▼
      Health   Health
      Check    Check
```

## Manual Deployment

To manually trigger a deployment:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **CI** workflow from the left sidebar
4. Click **Run workflow** dropdown (top right)
5. Select branch (`main` or `develop`)
6. Click **Run workflow** button
7. CD will automatically trigger after CI passes

## Monitoring Deployments

### Via GitHub Actions

1. Go to **Actions** tab in your repository
2. View workflow runs and logs
3. Check deployment summaries

### Via Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your service (staging or production)
3. View **Events** tab for deployment history
4. Check **Logs** tab for runtime logs

## Troubleshooting

### CI Fails on Tests

- Check the test logs in the Actions tab
- Run tests locally: `npm test && cd server && npm test`
- Fix failing tests before pushing

### CD Doesn't Run After CI

**Issue:** CI passes but CD workflow doesn't trigger

**Solution:**
1. Verify CI completed (not just individual jobs)
2. Check that the branch is `main` or `develop`
3. CD uses `workflow_run` trigger - it waits for full CI completion

### CD Fails to Deploy

**Issue:** "Trigger Render deployment" step fails

**Solution:**
1. Verify the correct secret is set:
   - `RENDER_DEPLOY_HOOK_URL` for production
   - `RENDER_STAGING_DEPLOY_HOOK_URL` for staging
2. Check the deploy hook URL is still valid in Render settings
3. Ensure Render service is active (not paused)

### Health Check Fails

**Issue:** "Health check returned HTTP 503"

**Solution:**
1. Wait a few minutes - Render may still be deploying
2. Check Render logs for startup errors
3. Verify environment variables are set correctly on Render
4. Check database connectivity

### Deployment is Slow

**Note:** Render free tier has cold starts. First deployment after inactivity may take 2-3 minutes.

## Best Practices

1. **Use feature branches** - Create branches from `develop` for new features
2. **Test on staging first** - Merge to `develop` and verify on staging before production
3. **Review CI failures** - Don't merge PRs with failing tests
4. **Monitor deployment health** - Check the health check step after deployment
5. **Use semantic commit messages** - Helps track what was deployed
6. **Tag releases** - Use git tags for production releases

## Environment Variables on Render

### Production (orgtree-app)

**Required:**
- `JWT_SECRET` - Secure random string
- `NODE_ENV=production`
- `DATABASE_URL` - Path to persistent disk

**Optional:**
- `SENTRY_DSN` - Error monitoring
- `RESEND_API_KEY` - Email invitations
- `FRONTEND_URL` - CORS configuration

### Staging (orgtree-staging)

Same as production, but with:
- **Different `JWT_SECRET`** - Security isolation
- **Different database file** - Data isolation
- **Staging-specific URLs** - `FRONTEND_URL`, `RP_ID`, `ORIGIN`

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub workflow_run Trigger](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_run)
- [Render Deploy Hooks](https://render.com/docs/deploy-hooks)
- [Codecov Documentation](https://docs.codecov.com/)
