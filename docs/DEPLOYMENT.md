# OrgTree Deployment Guide

## Overview

OrgTree is deployed as a single Node.js process that serves both the API and frontend static files. This guide will walk you through deploying OrgTree to production using Render.com.

**Recommended Platform**: Render.com

- Simple setup with free tier available for testing
- Built-in HTTPS with auto-renewing SSL certificates
- Native environment variable management
- Persistent disk storage for SQLite database
- Automatic health checks and zero-downtime deploys
- $7/month for production (Starter tier)

**Alternative Options**: Railway.app, Heroku, or any Node.js hosting platform

---

## Prerequisites

Before deploying, ensure you have:

1. **GitHub Repository**: Your OrgTree code pushed to GitHub
2. **Render Account**: Free account at [render.com](https://render.com)
3. **Secure JWT Secret**: Generate using the command below
4. **Built Frontend**: Run the build script before first deployment

### Generate Secure JWT Secret

```bash

node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

```

Save this 128-character string - you'll need it for environment variables.

---

## Deployment Steps

### Step 1: Prepare Your Application

#### 1.1 Verify Critical Files

Ensure these files exist in your repository:

- `server/.env.example` - Environment variable template
- `render.yaml` - Render configuration (includes automated build command)
- `package.json` - Frontend build configuration
- `server/package.json` - Backend dependencies

**Note**: You do NOT need to build the frontend locally. Render will automatically build it during deployment using the build command in `render.yaml`.

#### 1.2 Commit and Push

```bash

git add .
git commit -m "Production-ready build"
git push origin main

```

---

### Step 2: Deploy to Render

#### 2.1 Create New Web Service

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub account if not already connected
4. Select your OrgTree repository

#### 2.2 Configure Service Settings

Fill in the following settings:

**Basic Settings**:

- **Name**: `orgtree-app` (or your preferred name)
- **Region**: Choose the region closest to your users
- **Branch**: `main` (or your primary branch)
- **Root Directory**: `server`
- **Runtime**: `Node`
- **Build Command**: `cd .. && npm install --include=dev && npm run build && cp -r dist server/ && cd server && npm install --production`
- **Start Command**: `npm start`

**Note**: The build command installs all dependencies (including dev dependencies needed for Vite), builds the frontend, copies it to the server directory, then installs only production dependencies for the backend.

**Instance Type**:

- **For Production**: `Starter` ($7/month, always on)
- **For Testing**: `Free` (spins down after 15 min inactivity)

#### 2.3 Add Environment Variables

Click "Advanced" → "Add Environment Variable" and add the following:

| Key              | Value                                             | Notes                                   |
| ---------------- | ------------------------------------------------- | --------------------------------------- |
| `NODE_ENV`       | `production`                                      | Required                                |
| `JWT_SECRET`     | `<your-128-char-secret>`                          | Use generated secret from Prerequisites |
| `JWT_EXPIRES_IN` | `7d`                                              | Token expiration time                   |
| `DATABASE_URL`   | `file:/opt/render/project/src/data/production.db` | Database path                           |
| `PORT`           | `3001`                                            | Server port                             |
| `FRONTEND_URL`   | `https://orgtree-app.onrender.com`                | Replace with your Render URL            |

**Security Note**: Never commit JWT_SECRET to Git. Only set it via the Render dashboard.

#### 2.4 Add Persistent Disk

SQLite requires a persistent disk to survive redeployments:

1. Click "Advanced" → "Add Disk"
2. Configure:
   - **Name**: `orgtree-data`
   - **Mount Path**: `/opt/render/project/src/data`
   - **Size**: `1 GB` (plenty for < 5000 people)

#### 2.5 Deploy

Click "Create Web Service" at the bottom. Render will:

1. Clone your repository
2. Install dependencies
3. Start the server
4. Perform health checks
5. Assign a public URL: `https://orgtree-app.onrender.com`

**First deployment takes 2-5 minutes**. Watch the logs for any errors.

---

### Step 3: Initialize Database

After first deployment, initialize the database schema:

#### 3.1 Access Render Shell

1. Go to your service in Render Dashboard
2. Click the "Shell" tab
3. Wait for shell to connect

#### 3.2 Verify Database

The database should auto-initialize when the server starts (migrations run automatically in `db.js`). Verify:

```bash

ls -la /opt/render/project/src/data/
# Should show production.db

```

#### 3.3 Check Health

```bash

curl http://localhost:3001/api/health

```

Expected response:

```json

{
  "status": "ok",
  "timestamp": "2025-01-17T...",
  "database": "connected",
  "environment": "production"
}

```

---

### Step 4: Create First User

Create an admin user via API:

**From your local machine:**

```bash

curl -X POST https://orgtree-app.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@yourcompany.com","password":"secure_password_123"}'

```

**From Render Shell:**

```bash

curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@yourcompany.com","password":"secure_password_123"}'

```

**Important**:

- Change `admin@yourcompany.com` to your actual email
- Use a strong password (minimum 6 characters)
- The JSON must be on a single line to avoid parsing errors

---

### Step 5: Verify Deployment

#### 5.1 Access Application

Visit: `https://orgtree-app.onrender.com`

You should see the OrgTree login page with:

- ✅ HTTPS lock icon (secure connection)
- ✅ No CORS errors in browser console
- ✅ Login/signup forms working

#### 5.2 Test Core Features

1. **Login** with the admin account created above
2. **Create Organization** - test organization creation
3. **Add Department** - create a root department
4. **Add Person** - add an employee
5. **View Org Map** - check visualization works
6. **Public Sharing** - enable public sharing and test the link

#### 5.3 Check Logs

In Render Dashboard → Logs tab:

- ✅ Server startup message with production environment
- ✅ No error messages
- ✅ Structured JSON logs (not console.log)

---

## Post-Deployment Configuration

### Custom Domain (Optional)

To use your own domain (e.g., `orgtree.yourcompany.com`):

1. In Render Dashboard → Settings → Custom Domain
2. Click "Add Custom Domain"
3. Enter your domain name
4. Add CNAME record to your DNS:
   - **Name**: `orgtree` (or subdomain)
   - **Value**: `orgtree-app.onrender.com`
5. Wait for DNS propagation (5-60 minutes)
6. Render automatically provisions SSL certificate

**Update Environment Variables**:

- `FRONTEND_URL` → `https://orgtree.yourcompany.com`

### Environment-Specific Settings

For staging vs. production:

1. Create separate Render services:
   - `orgtree-staging` (Free tier for testing)
   - `orgtree-production` (Starter tier)

2. Use different branch names:
   - Staging: `develop` branch
   - Production: `main` branch

3. Different database paths:
   - Staging: `file:/opt/render/project/src/data/staging.db`
   - Production: `file:/opt/render/project/src/data/production.db`

---

## Monitoring & Maintenance

### Health Checks

Render automatically monitors `/api/health` endpoint:

- Checks every 30 seconds
- Restarts service if 3 consecutive failures
- Zero-downtime deployments

Manual health check:

```bash

curl https://orgtree-app.onrender.com/api/health

```

### View Logs

**Real-time logs**: Render Dashboard → Logs tab

**Structured logs** (JSON in production):

```json

{
  "timestamp": "2025-01-17T10:30:00.000Z",
  "level": "info",
  "message": "Server running on port 3001",
  "port": 3001,
  "environment": "production"
}

```

**Error logs**:

```json

{
  "timestamp": "2025-01-17T10:30:05.000Z",
  "level": "error",
  "message": "Invalid token",
  "error": "JsonWebTokenError",
  "path": "/api/organizations",
  "method": "GET"
}

```

### Performance Metrics

Render Dashboard → Metrics tab shows:

- CPU usage
- Memory usage
- Request count
- Response times
- Disk usage

### Database Backups

#### Manual Backup

Via Render Shell:

```bash

# Navigate to data directory
cd /opt/render/project/src/data

# Create backup
sqlite3 production.db ".backup backup-$(date +%Y%m%d).db"

# Compress
gzip backup-*.db

# Download via Render file browser

```

#### Automated Backups (Recommended)

Use an external service to hit a backup endpoint:

1. Create backup endpoint (add to `server/src/index.js`):

```javascript

app.post('/api/admin/backup', authenticateToken, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  try {
    const backupPath = `./backups/backup-${Date.now()}.db`;
    await db.backup(backupPath);
    res.json({ message: 'Backup created', path: backupPath });
  } catch (error) {
    res.status(500).json({ message: 'Backup failed', error: error.message });
  }
});

```

1. Schedule via [cron-job.org](https://cron-job.org) (free):
   - Daily at 2 AM
   - POST to `https://orgtree-app.onrender.com/api/admin/backup`
   - With Authorization header

### Uptime Monitoring

Use [UptimeRobot](https://uptimerobot.com) (free tier):

1. Create account at uptimerobot.com
2. Add monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://orgtree-app.onrender.com/api/health`
   - **Interval**: 5 minutes
   - **Alert Contacts**: Your email
3. Receive alerts if service goes down

**Bonus**: Free tier monitors also keep your service alive (prevents Render free tier spin-down).

---

## Troubleshooting

### 503 Service Unavailable

**Symptoms**: Cannot access application, Render shows "Deploy failed"

**Causes & Solutions**:

1. **Missing environment variables**

   ```texttext

   Error: FATAL: JWT_SECRET environment variable is required

   ```

   → Check all env vars are set in Render dashboard

2. **Database connection failed**

   ```texttext

   Error: FATAL: Missing database tables

   ```

   → Ensure persistent disk is mounted at correct path
   → Run migrations via Shell

3. **Build failed**

   ```texttext

   Error: Cannot find module

   ```

   → Ensure `npm install` completed successfully
   → Check build logs for dependency errors

### CORS Errors

**Symptoms**: Frontend shows "CORS policy blocked" in browser console

**Solutions**:

1. **Check FRONTEND_URL** environment variable matches your actual Render URL
2. **Verify CORS config** in `server/src/index.js` allows your domain
3. **Same-origin**: If using single-server deployment, CORS shouldn't be needed (both served from same URL)

### Rate Limit Errors

**Symptoms**: "Too many login attempts" after 5 tries

**This is normal**: Rate limiting is working correctly (5 attempts per 15 minutes)

**Solution for testing**:

- Wait 15 minutes, OR
- Temporarily increase limit in `server/src/routes/auth.js` (not recommended for production)

### Database Locked

**Symptoms**: "database is locked" errors in logs

**Causes**:

- Multiple concurrent writes
- Long-running transaction

**Solutions**:

1. **Increase timeout**: SQLite WAL mode (already enabled) helps
2. **Reduce concurrency**: If > 50 concurrent users, migrate to PostgreSQL
3. **Restart service**: Render Dashboard → Manual Deploy → Clear cache

### Environment Shows "Development" in Production

**Symptoms**: `/api/health` returns `"environment": "development"`

**Solution**:

1. Verify `NODE_ENV=production` is set in Render environment variables
2. Check `npm start` script in `package.json` sets `NODE_ENV=production`
3. Redeploy service

---

## Scaling & Performance

### When to Scale

**Current Setup Handles**:

- < 50 organizations
- < 5,000 people
- < 50 concurrent users
- SQLite database (single server)

**Upgrade When**:

- \> 50 concurrent users → Migrate to PostgreSQL
- \> 100 requests/second → Add caching (Redis)
- \> 5,000 people → Consider database indexing
- Global users → Add CDN for static assets

### Migrate to PostgreSQL

When you outgrow SQLite:

1. **Add PostgreSQL** in Render:
   - Dashboard → New → PostgreSQL
   - Free tier available (90 days)
   - After trial: $7/month

2. **Update database configuration**:

   ```javascript

   // Replace better-sqlite3 with pg
   npm install pg

   ```

3. **Update DATABASE_URL**:

   ```texttext

   postgresql://user:pass@host:5432/orgtree

   ```

4. **Migrate data**:
   - Export SQLite to SQL: `sqlite3 production.db .dump > export.sql`
   - Import to PostgreSQL: `psql $DATABASE_URL < export.sql`

### Add Caching (Redis)

For high traffic:

1. **Add Redis** in Render (free tier: $10/month)
2. **Install Redis client**: `npm install redis`
3. **Cache strategies**:
   - Session storage
   - API response caching
   - Rate limit counters

### CDN for Static Assets

For global performance:

1. **Separate frontend deployment**:
   - Deploy frontend to Vercel/Netlify (free)
   - Keep backend on Render

2. **Update CORS** to allow CDN origin
3. **Set VITE_API_BASE_URL** to backend URL

---

## Security Checklist

Before going live, verify:

- ✅ JWT_SECRET is cryptographically secure (128+ characters)
- ✅ NODE_ENV=production is set
- ✅ HTTPS is enabled (green lock in browser)
- ✅ No console.log statements in production code
- ✅ Rate limiting is active (test login attempts)
- ✅ Dev password reset endpoint is removed
- ✅ Database backups are configured
- ✅ Uptime monitoring is active
- ✅ Error tracking is configured (Sentry recommended)
- ✅ `.env` files are NOT committed to Git

---

## Updating Your Deployment

### Code Updates

1. **Make changes locally**
2. **Test thoroughly** in development
3. **Build frontend**: `./scripts/build-for-production.sh`
4. **Commit changes**: `git commit -am "Feature: description"`
5. **Push to GitHub**: `git push origin main`
6. **Render auto-deploys**: Deployment happens automatically within 1-2 minutes

**Zero-downtime**: Render's blue-green deployment ensures no service interruption.

### Rollback

If deployment fails or has bugs:

1. **Render Dashboard** → "Events" tab
2. Find successful previous deployment
3. Click "Rollback to this version"
4. Service restarts with previous code (takes 30 seconds)

**Database rollback**: Restore from backup if needed

---

## Cost Breakdown

### Render Starter Tier: $7/month

Includes:

- 512 MB RAM (sufficient for small scale)
- Shared CPU
- 100 GB bandwidth/month
- 1 GB persistent disk (free)
- Auto-scaling to 1 instance
- HTTPS with auto-renewing SSL
- Custom domain support
- Zero-downtime deploys

### Optional Add-ons

- **PostgreSQL**: $7/month (when you outgrow SQLite)
- **Redis**: $10/month (for caching)
- **Additional Disk**: $0.25/GB/month (if you need more than 1 GB)
- **Domain**: $10-15/year (Google Domains, Namecheap)

### Free Tier Services

- **Uptime Monitoring**: UptimeRobot (50 monitors free)
- **Error Tracking**: Sentry (5k events/month free)
- **Email**: Can use Gmail SMTP for notifications

**Total Monthly Cost**: $7-10 for basic production deployment

---

## Alternative Deployment Options

### Railway.app

Similar to Render, slightly different pricing:

```bash

# Install Railway CLI
npm install -g railway

# Login and initialize
railway login
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=<your-secret>

# Deploy
railway up

```

Cost: $5/month base + usage (~$2-5/month for small scale)

### Docker + Any VPS

Self-hosted option:

1. **Create Dockerfile** (in project root):

```dockerfile

FROM node:18-alpine

WORKDIR /app

# Install backend dependencies
COPY server/package*.json ./server/
RUN cd server && npm install --production

# Copy built frontend
COPY server/dist ./server/dist

# Copy server code
COPY server/src ./server/src

WORKDIR /app/server

EXPOSE 3001

CMD ["npm", "start"]

```

1. **Build and run**:

```bash

docker build -t orgtree .
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e JWT_SECRET=<secret> \
  -v orgtree-data:/app/server/data \
  orgtree

```

1. **Deploy to VPS**: Use DigitalOcean, Linode, or AWS EC2

Cost: $5-10/month for VPS

---

## Support & Resources

### Documentation

- **Main README**: [README.md](README.md) - Feature overview
- **Development Guide**: [DEVELOPMENT.md](DEVELOPMENT.md) - Local setup
- **Progress Report**: [PROGRESS.md](PROGRESS.md) - Development history

### Getting Help

1. **Check logs**: Most issues show error messages in logs
2. **Health check**: `/api/health` endpoint shows system status
3. **Render docs**: [render.com/docs](https://render.com/docs)
4. **GitHub Issues**: Report bugs or request features

### Monitoring Best Practices

1. **Set up alerts**: Email notifications for downtime
2. **Check logs weekly**: Look for errors or warnings
3. **Monitor disk usage**: Ensure database doesn't fill disk
4. **Test backups**: Regularly verify backups can be restored
5. **Review metrics**: Watch for performance degradation

---

## Next Steps After Deployment

1. **Test all features** in production environment
2. **Set up monitoring** (UptimeRobot, Sentry)
3. **Configure backups** (manual or automated)
4. **Custom domain** (optional but professional)
5. **User training** (create admin documentation)
6. **Data import** (CSV or XML import for existing data)
7. **Performance testing** (load testing with expected user count)
8. **Security audit** (penetration testing for sensitive deployments)

---

**Deployment Status**: ✅ OrgTree is production-ready!

**Estimated Time**: 1-2 hours for first deployment
**Difficulty**: Beginner-friendly with this guide
**Support**: Active development, issues welcome

---

Last Updated: January 17, 2025
