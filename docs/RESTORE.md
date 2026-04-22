# OrgTree — Restore from Hibernation

This document covers how to bring OrgTree back online after a planned shutdown
where the Render persistent disk was removed to downgrade to the free plan.

## What Was Preserved

The production database was exported on **2026-04-22** before the disk was removed.

| Item        | Detail                                                   |
| ----------- | -------------------------------------------------------- |
| Backup file | `~/Desktop/orgtree-production.db` (local Mac)            |
| Size        | ~1.2 MB                                                  |
| Contents    | 3 users · 5 organizations · 211 departments · 501 people |
| Format      | SQLite 3 (raw `.db` file, fully portable)                |

---

## Step 1 — Upgrade the Render Plan

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Select the **OrgTree** project → **OrgTree-App** service
3. Change the plan from **Free** → **Starter** ($7/month)

---

## Step 2 — Re-attach a Persistent Disk

Still in the OrgTree-App service settings:

1. Go to **Disks** → **Add Disk**
2. Settings:
   - **Name**: `disk`
   - **Mount Path**: `/opt/render/project/src/data`
   - **Size**: 1 GB (or larger)
3. Save — this triggers a redeploy automatically

The server will start with a brand-new empty database at
`/opt/render/project/src/data/production.db`.

---

## Step 3 — Restore the Database

Once the service is live (check the Render logs for `Server running on port 3001`),
restore the backup. You need the Render CLI authenticated (`render login`).

### Option A — Via Render CLI SSH (recommended)

```bash
# 1. Find your service's SSH address (shown in Render dashboard → Connect tab)
# It looks like: srv-XXXXXX@ssh.ohio.render.com

# 2. Upload the backup
scp ~/Desktop/orgtree-production.db srv-XXXXXX@ssh.ohio.render.com:/opt/render/project/src/data/production.db

# 3. Verify on the remote
ssh srv-XXXXXX@ssh.ohio.render.com \
  "sqlite3 /opt/render/project/src/data/production.db 'SELECT COUNT(*) FROM users;'"
```

> **SSH key required.** If you get a `Permission denied (publickey)` error, add your
> public key at [dashboard.render.com/account](https://dashboard.render.com/account)
> under **SSH Public Keys** first:
>
> ```bash
> cat ~/.ssh/id_ed25519.pub   # paste this into the Render dashboard
> ```

### Option B — Via SQL dump (if SSH is unavailable)

```bash
# 1. On your Mac, export the backup as a SQL dump
sqlite3 ~/Desktop/orgtree-production.db .dump > /tmp/orgtree-restore.sql

# 2. Base64-encode it for terminal transfer
base64 /tmp/orgtree-restore.sql > /tmp/orgtree-restore.b64

# 3. Open Render Shell (dashboard → Shell tab) and run:
#    base64 -d <<'EOF' | sqlite3 /opt/render/project/src/data/production.db
#    <paste the contents of /tmp/orgtree-restore.b64 here>
#    EOF
```

---

## Step 4 — Restart the Service

After the database is in place, restart the service so it picks up the restored data:

```bash
render restart srv-d5484kbe5dus73bd3lng
```

Or use the Render dashboard → **Manual Deploy** → **Restart**.

---

## Step 5 — Verify

```bash
# Check the live app
curl https://orgtree-app.onrender.com/api/version

# Check user count via local sqlite3
sqlite3 ~/Desktop/orgtree-production.db \
  "SELECT COUNT(*) || ' users' FROM users;
   SELECT COUNT(*) || ' organizations' FROM organizations;
   SELECT COUNT(*) || ' departments' FROM departments;
   SELECT COUNT(*) || ' people' FROM people;"
```

Expected output (from the pre-shutdown export):

```
3 users
5 organizations
211 departments
501 people
```

---

## Environment Variables

All environment variables were preserved in the Render dashboard and do not need
to be re-entered. If they were lost, the full list is documented in
[`docs/DEPLOYMENT.md`](./DEPLOYMENT.md).

The most critical ones to verify:

| Variable       | Notes                                                       |
| -------------- | ----------------------------------------------------------- |
| `JWT_SECRET`   | Must be set — app refuses to start without it               |
| `DATABASE_URL` | Should be `file:/opt/render/project/src/data/production.db` |
| `NODE_ENV`     | Should be `production`                                      |

---

## Render Service IDs (for CLI use)

| Item                         | ID                         |
| ---------------------------- | -------------------------- |
| Service                      | `srv-d5484kbe5dus73bd3lng` |
| Disk (original, now deleted) | `dsk-d5484kje5dus73bd3m00` |
| Project                      | `prj-d5484ker433s73cq7o90` |
| Environment                  | `evm-d5484ker433s73cq7o9g` |
