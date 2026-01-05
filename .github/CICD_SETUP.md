# CI/CD Setup Guide

This document explains the GitHub Actions CI/CD pipeline for OrgTree.

## Overview

The project uses two GitHub Actions workflows:

1. **CI (Continuous Integration)** - `ci.yml`
   - Runs on every push and pull request
   - Executes tests, linting, and builds
   - Ensures code quality before merging

2. **CD (Continuous Deployment)** - `cd.yml`
   - Runs on pushes to `main` branch
   - Automatically deploys to Render
   - Verifies deployment health

## Workflows

### CI Workflow

**Triggers:**
- Push to `main` branch
- Pull requests targeting `main`

**Jobs:**

1. **Lint** - Code quality checks
   - ESLint on frontend and backend
   - Prettier format verification

2. **Test Frontend** - Frontend testing
   - Runs Vitest test suite (32 tests)
   - Generates coverage report
   - Uploads coverage to Codecov (optional)

3. **Test Backend** - Backend testing
   - Runs Vitest test suite (44 tests)
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
- Push to `main` branch (after CI passes)
- Manual workflow dispatch (via GitHub UI)

**Jobs:**

1. **Deploy** - Trigger Render deployment
   - Calls Render deploy hook webhook
   - Initiates new deployment on Render

2. **Verify Deployment** - Health check
   - Waits 60 seconds for deployment
   - Calls `/api/health` endpoint
   - Verifies HTTP 200 response
   - Creates deployment summary

## Required GitHub Secrets

To enable the CD workflow, configure the following secret in your GitHub repository:

### `RENDER_DEPLOY_HOOK_URL`

**Description:** Webhook URL to trigger Render deployments

**How to obtain:**

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your service (orgtree-app)
3. Navigate to **Settings** → **Deploy Hook**
4. Copy the deploy hook URL (looks like: `https://api.render.com/deploy/srv-xxxxx?key=xxxxx`)
5. Add it to GitHub:
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: (paste the Render deploy hook URL)
   - Click "Add secret"

### Optional: Codecov Integration

If you want code coverage reports, configure:

**`CODECOV_TOKEN`** (optional)

1. Go to [Codecov.io](https://codecov.io/)
2. Sign in with GitHub
3. Add your repository
4. Copy the upload token
5. Add to GitHub secrets as `CODECOV_TOKEN`

**Note:** The workflows will continue without this token (using `continue-on-error: true`)

## Workflow Status Badges

Add these badges to your README.md:

```markdown
[![CI](https://github.com/Ic3burG/OrgTree/actions/workflows/ci.yml/badge.svg)](https://github.com/Ic3burG/OrgTree/actions/workflows/ci.yml)
[![CD](https://github.com/Ic3burG/OrgTree/actions/workflows/cd.yml/badge.svg)](https://github.com/Ic3burG/OrgTree/actions/workflows/cd.yml)
```

## Manual Deployment

To manually trigger a deployment:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **CD** workflow from the left sidebar
4. Click **Run workflow** dropdown (top right)
5. Select `main` branch
6. Click **Run workflow** button

## Deployment Flow

```
┌─────────────────┐
│  Push to main   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   CI Workflow   │
│   (tests pass)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   CD Workflow   │
│ (deploy to      │
│  Render)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Health Check    │
│ Verification    │
└─────────────────┘
```

## Monitoring Deployments

### Via GitHub Actions

1. Go to **Actions** tab in your repository
2. View workflow runs and logs
3. Check deployment summaries

### Via Render Dashboard

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your service
3. View **Events** tab for deployment history
4. Check **Logs** tab for runtime logs

## Troubleshooting

### CI Fails on Tests

- Check the test logs in the Actions tab
- Run tests locally: `npm test && cd server && npm test`
- Fix failing tests before pushing

### CD Fails to Deploy

**Issue:** "Trigger Render deployment" step fails

**Solution:**
1. Verify `RENDER_DEPLOY_HOOK_URL` secret is set correctly
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

1. **Always create Pull Requests** - Let CI verify changes before merging
2. **Review CI failures** - Don't merge PRs with failing tests
3. **Monitor deployment health** - Check the health check step after deployment
4. **Use semantic commit messages** - Helps track what was deployed
5. **Tag releases** - Use git tags for production releases

## Environment Variables on Render

Ensure these are set in Render (Settings → Environment):

**Required:**
- `JWT_SECRET` - Secure random string
- `NODE_ENV=production`
- `DATABASE_URL` - Path to persistent disk

**Optional:**
- `SENTRY_DSN` - Error monitoring
- `RESEND_API_KEY` - Email invitations
- `FRONTEND_URL` - CORS configuration

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Render Deploy Hooks](https://render.com/docs/deploy-hooks)
- [Codecov Documentation](https://docs.codecov.com/)
