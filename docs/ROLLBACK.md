# Database Migration Rollback Procedures

This document outlines the procedures for rolling back database migrations in the OrgTree project.

## Overview

The OrgTree migration system uses a structured approach to versioning and tracking database changes. Each migration has an `up()` function for applying changes and a `down()` function for reverting them.

## Manual Rollback Procedure

If a deployment fails or a bug is discovered immediately after a migration, follow these steps:

### 1. Identify the problematic migration

Run the following command to see all applied migrations:

```bash

cd server
npm run migrate status

```

Locate the ID of the migration you wish to revert.

### 2. Perform the rollback

Run the `down` command with the migration ID:

```bash

npm run migrate down <migration_id>

```

_Example:_ `npm run migrate down 20240101000018`

### 3. Verify the state

Check the status again to ensure it was removed from the tracking table:

```bash

npm run migrate status

```

## Emergency Recovery (Full Restore)

If the database is corrupted or the migration `down()` function fails, use the automated backups:

### 1. Locate the pre-migration backup

Backups are triggered automatically during CD and are stored in the `server/backups` directory.

Command: `npm run backup:list`

### 2. Restore the backup

Use the restore command:

```bash

npm run backup:restore <backup_filename>

```

## Automated Rollback Strategy

The CD pipeline (`cd.yml`) is configured to automatically attempt a rollback if the main migration step fails. This is done by:

1. Identifying the last applied migration.
2. Running `npm run migrate down <id>` if possible.
3. If that fails, the pipeline will stop and manual intervention is required using the backup restore procedure.

## Best Practices

- **Always provide a `down()` function**: Every new migration in `src/migrations/versions/` must have a corresponding `down` implementation.
- **Test Rollbacks**: Before submitting a PR with a migration, test its rollback locally:
  `npm run migrate down <your_new_id>`
- **Check Backups**: Ensure the `server/backups` directory is being captured or synced to persistent storage.
