# GEDS URL Import Plan

**Status**: 📋 Planned

## Goal

Enable users to import GEDS (Government Electronic Directory Services) organizational data by simply pasting XML download URLs, eliminating the manual download-upload-import workflow. The system will automatically download, parse, import, and cleanup temporary files.

## Current Workflow vs. Proposed

**Current (Manual)**:
1. User downloads GEDS XML file to their computer
2. User uploads XML file through import UI
3. System parses and imports data
4. User manually deletes downloaded file

**Proposed (Automated)**:
1. User pastes one or more GEDS download URLs
2. System downloads XML files to temporary storage
3. System parses and imports each file
4. System automatically deletes temporary files
5. User sees detailed results for each URL

## User Review Required

> [!IMPORTANT]
> **Security Considerations**:
> - URL validation will **whitelist only `.gc.ca` and `canada.ca` domains** to prevent SSRF attacks
> - File size limit: **50MB per XML file** to prevent memory issues
> - Request timeout: **30 seconds** per download to prevent hanging
> - Max URLs per request: **10 URLs** to prevent abuse

> [!NOTE]
> **Storage & Cleanup**:
> - Temporary XML files will be stored in Node.js temp directory or scratchpad
> - Files will be **deleted immediately after import** (success or failure)
> - Cleanup guaranteed via `finally` blocks to prevent disk space issues

## Proposed Changes

### Database

No database schema changes required. Existing audit log and import tables are sufficient.

### Backend API

#### [NEW] [server/src/services/geds-download.service.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/server/src/services/geds-download.service.ts)

**Purpose**: Handle secure downloading and validation of GEDS XML files

**Functions**:
- `validateGedsUrl(url: string): boolean`
  - Validates URL format and domain (whitelist: `.gc.ca`, `canada.ca`)
  - Returns `true` if valid, throws error if invalid

- `downloadGedsXml(url: string, destPath: string): Promise<void>`
  - Downloads XML file using Node.js `https` module
  - Enforces 30-second timeout
  - Enforces 50MB file size limit
  - Streams to disk to avoid memory issues
  - Throws error on network failure or timeout

- `cleanupTempFile(path: string): Promise<void>`
  - Safely deletes temporary file
  - Swallows errors (file already deleted, etc.)

**Error Handling**:
- `InvalidUrlError` - URL fails validation
- `DownloadTimeoutError` - Download exceeds 30 seconds
- `FileSizeLimitError` - File exceeds 50MB
- `NetworkError` - Connection/DNS/SSL errors

#### [NEW] [server/src/services/geds-parser.service.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/server/src/services/geds-parser.service.ts)

**Purpose**: Extract parsing logic from script into reusable service

**Functions**:
- `parseGedsXml(filePath: string): Promise<ParsedGedsData>`
  - Reads and parses GEDS XML file
  - Returns structured data: `{ departments: Department[], people: Person[] }`
  - Handles French characters (Latin-1 encoding)
  - Throws `ParseError` on invalid XML

**Refactoring**:
- Extract core parsing logic from `scripts/parse-geds-xml.ts`
- Script becomes thin wrapper around service for CLI usage
- Service can be used by both CLI and API routes

#### [NEW] [server/src/routes/geds-import.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/server/src/routes/geds-import.ts)

**Endpoint**: `POST /api/organizations/:id/import/geds-urls`

**Request Body**:
```typescript
{
  urls: string[]  // Array of GEDS XML download URLs (max 10)
}
```

**Response**:
```typescript
{
  results: Array<{
    url: string,
    status: 'success' | 'failed',
    message: string,
    stats?: {
      departments: number,
      people: number
    },
    error?: string
  }>
}
```

**Implementation Logic**:
1. Validate user has admin/owner role for organization
2. Validate request body (max 10 URLs, all URLs valid format)
3. For each URL (sequential processing):
   ```typescript
   const tempFile = path.join(os.tmpdir(), `geds-${Date.now()}-${index}.xml`);
   try {
     // Download
     await downloadGedsXml(url, tempFile);

     // Parse
     const parsed = await parseGedsXml(tempFile);

     // Import (use existing import service logic)
     await importDepartments(orgId, parsed.departments);
     await importPeople(orgId, parsed.people);

     // Audit log
     await logAction({
       organizationId: orgId,
       userId: req.user.id,
       action: 'imported',
       entityType: 'geds_url',
       entityId: url,
       snapshot: { stats: { departments: X, people: Y } }
     });

     // Emit socket event
     emitToOrg(orgId, 'organization:updated', { ... });

     results.push({ url, status: 'success', stats, message: 'Imported successfully' });
   } catch (error) {
     results.push({ url, status: 'failed', error: error.message });
   } finally {
     await cleanupTempFile(tempFile);
   }
   ```

4. Return results array with per-URL status

**Error Handling**:
- Per-URL failures: Log and continue to next URL
- Authorization failures: Return 403 immediately
- Database errors: Return 500 after cleanup

#### [MODIFY] [server/src/index.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/server/src/index.ts)

- Import and mount new GEDS import route:
  ```typescript
  import gedsImportRoutes from './routes/geds-import.js';
  app.use('/api/organizations', gedsImportRoutes);
  ```

#### [MODIFY] [scripts/parse-geds-xml.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/scripts/parse-geds-xml.ts)

**Refactoring**:
- Extract parsing logic into `geds-parser.service.ts`
- Script becomes thin wrapper:
  ```typescript
  import { parseGedsXml } from '../src/services/geds-parser.service.js';

  const parsed = await parseGedsXml(inputFile);
  await fs.writeFile(outputFile, JSON.stringify(parsed, null, 2));
  ```

### Frontend

#### [NEW] [src/components/admin/GedsUrlImporter.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/admin/GedsUrlImporter.tsx)

**Purpose**: UI for pasting and importing GEDS URLs

**Features**:
- Textarea for pasting URLs (one per line)
- Client-side URL validation (show invalid URLs immediately)
- "Import from GEDS URLs" button with loading state
- Progress modal showing:
  - Current URL being processed (X of Y)
  - Status for each URL: pending → downloading → importing → success/failed
  - Real-time progress updates
- Results summary:
  - Total succeeded/failed
  - Expandable details per URL (stats or error message)
  - Option to dismiss or retry failed URLs

**Component Structure**:
```typescript
interface GedsUrlImporterProps {
  organizationId: string;
  onImportComplete: () => void;
}

interface ImportResult {
  url: string;
  status: 'pending' | 'downloading' | 'importing' | 'success' | 'failed';
  message?: string;
  stats?: { departments: number; people: number };
  error?: string;
}
```

**UX Flow**:
1. User pastes URLs in textarea
2. Component validates URLs on blur (highlight invalid)
3. Click "Import from URLs" → Open progress modal
4. Show progress for each URL with icons (⏳ pending, ⬇️ downloading, 📥 importing, ✅ success, ❌ failed)
5. On completion: Show summary, auto-refresh org data, emit toast notification

#### [MODIFY] [src/components/admin/DepartmentManager.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/admin/DepartmentManager.tsx)

**Integration**:
- Add new tab/section: "Import from GEDS URLs"
- Include `<GedsUrlImporter />` component alongside existing file upload import
- Show help text with example GEDS URL format

**UI Layout**:
```
┌─────────────────────────────────────┐
│ Import Data                         │
├─────────────────────────────────────┤
│ [Upload CSV] [Upload GEDS XML]      │
│ [Import from GEDS URLs]   ← NEW     │
└─────────────────────────────────────┘
```

#### [NEW] [src/api/geds.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/src/api/geds.ts)

**Purpose**: API client functions for GEDS import

**Functions**:
```typescript
export interface GedsImportResult {
  url: string;
  status: 'success' | 'failed';
  message: string;
  stats?: { departments: number; people: number };
  error?: string;
}

export async function importGedsUrls(
  organizationId: string,
  urls: string[]
): Promise<{ results: GedsImportResult[] }> {
  return request(`/api/organizations/${organizationId}/import/geds-urls`, {
    method: 'POST',
    body: JSON.stringify({ urls }),
  });
}
```

## Verification Plan

### Automated Tests

#### Backend Tests

**[server/src/services/geds-download.service.test.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/server/src/services/geds-download.service.test.ts)**:
- ✅ Valid URL passes validation (`.gc.ca` domain)
- ✅ Invalid domain fails validation
- ✅ Non-HTTPS URL fails validation
- ✅ Download timeout after 30 seconds
- ✅ File size limit enforced (reject >50MB)
- ✅ Cleanup deletes temp file on success
- ✅ Cleanup deletes temp file on error
- ✅ Cleanup silently handles already-deleted files

**[server/src/services/geds-parser.service.test.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/server/src/services/geds-parser.service.test.ts)**:
- ✅ Valid GEDS XML parses correctly
- ✅ French characters preserved (accents, special chars)
- ✅ Invalid XML throws ParseError
- ✅ Missing required fields handled gracefully

**[server/src/routes/geds-import.test.ts](file:///Users/ojdavis/Claude%20Code/OrgTree/server/src/routes/geds-import.test.ts)**:
- ✅ Requires authentication
- ✅ Requires admin/owner role
- ✅ Rejects >10 URLs per request
- ✅ Returns results array with per-URL status
- ✅ Successful import creates audit log
- ✅ Failed URLs don't stop batch processing
- ✅ Temp files cleaned up after success
- ✅ Temp files cleaned up after failure
- ✅ Socket event emitted on successful import

#### Frontend Tests

**[src/components/admin/GedsUrlImporter.test.tsx](file:///Users/ojdavis/Claude%20Code/OrgTree/src/components/admin/GedsUrlImporter.test.tsx)**:
- ✅ Validates URLs on blur
- ✅ Shows error for invalid URLs
- ✅ Disables import button when no valid URLs
- ✅ Shows progress modal on import start
- ✅ Updates progress for each URL
- ✅ Shows success summary on completion
- ✅ Shows error details for failed URLs
- ✅ Calls `onImportComplete` on success

### Manual Verification

1. **Single URL Import**:
   - Paste one valid GEDS URL
   - Click "Import from URLs"
   - Verify progress modal shows download → import → success
   - Verify organization data updated (departments/people visible)
   - Verify audit log entry created

2. **Multiple URLs (Mixed Success/Failure)**:
   - Paste 5 URLs (3 valid, 2 invalid domains)
   - Click "Import from URLs"
   - Verify invalid URLs fail immediately with validation error
   - Verify valid URLs process sequentially
   - Verify final summary shows 3 success, 2 failed
   - Verify all temp files deleted (check temp directory)

3. **Error Handling**:
   - Paste URL to non-existent file (404)
   - Verify error message shown in results
   - Paste URL to timeout (simulate slow server)
   - Verify timeout error after 30 seconds
   - Paste URL to >50MB file
   - Verify file size limit error

4. **Authorization**:
   - Login as viewer role
   - Attempt to import GEDS URLs
   - Verify 403 Forbidden error

5. **Cleanup Verification**:
   - Import 3 URLs
   - Check temp directory during import (files should exist)
   - Check temp directory after import (files should be deleted)
   - Simulate error mid-import
   - Verify partial files still cleaned up

## Implementation Phases

### Phase 1: Backend Foundation
- [ ] Create `geds-download.service.ts` with URL validation and download
- [ ] Create `geds-parser.service.ts` by extracting from script
- [ ] Refactor `scripts/parse-geds-xml.ts` to use parser service
- [ ] Write unit tests for download and parser services
- [ ] Create `geds-import.ts` route with import logic
- [ ] Write integration tests for import endpoint
- [ ] Mount route in `server/src/index.ts`

### Phase 2: Frontend UI
- [ ] Create `GedsUrlImporter.tsx` component
- [ ] Create `src/api/geds.ts` API client
- [ ] Write component tests
- [ ] Integrate into `DepartmentManager.tsx`
- [ ] Add progress modal with real-time updates
- [ ] Add error handling and user feedback

### Phase 3: Polish & Verification
- [ ] Manual testing (all scenarios above)
- [ ] Add helpful error messages
- [ ] Add inline help text with example URLs
- [ ] Update audit log to include source URL
- [ ] Add Socket.IO real-time progress updates (optional enhancement)
- [ ] Performance testing (10 URLs with large files)

## Future Enhancements (Out of Scope)

- **Parallel Downloads**: Process multiple URLs concurrently (currently sequential)
- **Progress Bar**: Show download/import percentage per URL
- **URL History**: Save recently imported URLs for re-import
- **Scheduled Imports**: Cron job to auto-import from saved URLs
- **Diff Preview**: Show what will change before importing
- **Incremental Updates**: Only import changed departments/people
