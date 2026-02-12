# GEDS URL Import - Manual Testing Guide

**Feature**: Import organizational data by pasting GEDS XML download URLs
**Status**: Ready for testing
**Phase**: Phase 3 - Manual Verification

## Prerequisites

1. **Run the application**:

   ```bash

   # Terminal 1 - Backend
   cd server && npm run dev

   # Terminal 2 - Frontend
   npm run dev

   ```

2. **Login** as a user with **admin** or **owner** role for an organization

3. **Navigate** to the organization's Admin Panel → Import section

## Test Scenarios

### ✅ Scenario 1: Single Valid URL Import

**Goal**: Verify successful import of one GEDS XML URL

**Steps**:

1. Navigate to **Admin Panel** → **Import** → **GEDS URLs** tab
2. Paste a valid GEDS URL in the textarea:

   ```texttext

   https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=ou%3DTBS-SCT%2Cou%3DTBS-SCT%2Cou%3DGOC%2Co%3DGC%2Cc%3DCA

   ```

3. Click **"Import from 1 GEDS URL"** button
4. Observe the progress modal

**Expected Results**:

- ✅ Button text updates to "Importing..."
- ✅ Modal appears with spinner and message "Importing GEDS data from 1 URL..."
- ✅ After processing, modal shows "Import Summary"
- ✅ Success count shows: "Successful: 1"
- ✅ Result item shows green checkmark (✓)
- ✅ Stats displayed: "Imported X departments and Y person"
- ✅ Success toast notification appears
- ✅ Organization data refreshes automatically
- ✅ Close button dismisses the modal
- ✅ Departments/people visible in the org chart

**Verification**:

- Check **Audit Log** for entry:
  - Action: "import"
  - Entity Type: "geds_url"
  - Snapshot includes: URL, stats (departmentsCreated, peopleCreated, etc.)

---

### ✅ Scenario 2: Multiple URLs (All Valid)

**Goal**: Verify batch import of multiple GEDS URLs

**Steps**:

1. Paste 3 valid GEDS URLs (one per line):

   ```texttext

   https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=ou%3DTBS-SCT%2Cou%3DTBS-SCT%2Cou%3DGOC%2Co%3DGC%2Cc%3DCA
   https://canada.ca/some/geds/export
   https://sage-geds.gc.ca/another/export

   ```

2. Verify validation summary shows: "✓ 3 valid URLs"
3. Click **"Import from 3 GEDS URLs"** button

**Expected Results**:

- ✅ Modal shows "Importing GEDS data from 3 URLs..."
- ✅ URLs processed sequentially
- ✅ Success summary shows all 3 succeeded
- ✅ Each result shows stats individually
- ✅ Success toast: "Successfully imported 3 GEDS files"
- ✅ 3 separate audit log entries created

---

### ⚠️ Scenario 3: Mixed Valid/Invalid URLs

**Goal**: Verify client-side validation and partial success handling

**Steps**:

1. Paste a mix of valid and invalid URLs:

   ```texttext

   https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test1
   https://evil.com/fake-geds-export
   http://geds-sage.gc.ca/insecure
   https://canada.ca/valid-geds
   not-a-url

   ```

2. Observe validation summary

**Expected Results**:

- ✅ Summary shows: "✓ 2 valid URLs"
- ✅ Summary shows: "✗ 3 invalid URLs" in red
- ✅ Button text: "Import from 2 GEDS URLs" (only valid count)
- ✅ Click import → only 2 valid URLs are sent to backend
- ✅ Invalid URLs are ignored (not sent in API request)
- ✅ Success toast for 2 imports

**Invalid URL Examples**:

- Non-HTTPS: `http://geds-sage.gc.ca/...` ❌
- Wrong domain: `https://evil.com/...` ❌
- Not a URL: `not-a-url` ❌

---

### ❌ Scenario 4: Server-Side Error Handling (404)

**Goal**: Verify graceful handling of non-existent files

**Steps**:

1. Paste a valid-looking but non-existent GEDS URL:

   ```texttext

   https://geds-sage.gc.ca/en/GEDS?pgid=999&dn=nonexistent

   ```

2. Click **"Import from 1 GEDS URL"**

**Expected Results**:

- ✅ Import starts normally
- ✅ Modal shows failure result with red cross (✗)
- ✅ Error message displayed: "HTTP 404" or similar
- ✅ Error toast notification appears
- ✅ No data imported to organization
- ✅ Audit log entry NOT created (failed import)
- ✅ Temporary file deleted from server

**Check Server Logs**:

- Should see error logged but not crash
- Temp file path mentioned in cleanup log

---

### ⏱️ Scenario 5: Timeout Handling

**Goal**: Verify 30-second timeout enforcement

**Steps**:

1. Find or simulate a GEDS URL that responds very slowly
2. Paste URL and click import

**Expected Results**:

- ✅ After 30 seconds, import fails with timeout error
- ✅ Result shows: "Download timeout" or "Request timeout"
- ✅ No partial data imported
- ✅ Error toast appears
- ✅ User can close modal and continue

**Note**: This is difficult to test without a slow server. May skip if unavailable.

---

### 📏 Scenario 6: File Size Limit

**Goal**: Verify 50MB file size limit enforcement

**Steps**:

1. Find or create a GEDS XML URL that returns >50MB file
2. Paste URL and click import

**Expected Results**:

- ✅ Import fails with "File size limit exceeded" error
- ✅ Download stops when 50MB threshold reached
- ✅ No data imported
- ✅ Temp file cleaned up

**Note**: This may be difficult to test with real GEDS URLs. May skip if unavailable.

---

### 🚫 Scenario 7: URL Limit (Max 10)

**Goal**: Verify max 10 URLs per request

**Steps**:

1. Paste 12 valid GEDS URLs (one per line)
2. Observe validation

**Expected Results**:

- ✅ Summary shows: "✓ 12 valid URLs"
- ✅ **Warning** appears: "⚠ Maximum 10 URLs allowed (you have 12)" in orange
- ✅ Import button is **disabled** (cannot proceed)
- ✅ User must remove 2 URLs to enable import

---

### 🔐 Scenario 8: Authorization Check

**Goal**: Verify only admins/owners can import

**Steps**:

1. **Logout** and login as a user with **viewer** or **editor** role
2. Navigate to the organization
3. Try to access Admin Panel → Import

**Expected Results**:

- ✅ Either:
  - Import button/tab is hidden for non-admins, OR
  - Import button is disabled, OR
  - API returns 403 Forbidden when attempting import
- ✅ Error toast: "You don't have permission to import data"

**Test with Different Roles**:

- Viewer: ❌ Should NOT be able to import
- Editor: ❌ Should NOT be able to import
- Admin: ✅ Should be able to import
- Owner: ✅ Should be able to import

---

### 🧹 Scenario 9: Cleanup Verification

**Goal**: Verify temporary files are deleted after import

**Steps**:

1. Before import, check temp directory:

   ```bash

   # On Mac/Linux
   ls -la /tmp/geds-*
   # Or
   ls -la /private/tmp/claude/-Users-ojdavis-Claude-Code-OrgTree/*/scratchpad/geds-*

   ```

2. Import 3 GEDS URLs
3. **During** import, check temp directory again (files should exist briefly)
4. **After** import completes, check temp directory again

**Expected Results**:

- ✅ Before: No geds-\*.xml files exist
- ✅ During: 1-3 geds-\*.xml files exist temporarily
- ✅ After: All geds-\*.xml files deleted
- ✅ Even if import fails, files still deleted (check with failed URL)

**Server Logs**:

- Should see cleanup messages: "Cleaned up temp file: /tmp/geds-..."

---

### 🔄 Scenario 10: Duplicate Department Handling

**Goal**: Verify duplicate departments are reused (not re-created)

**Steps**:

1. Import a GEDS URL
2. Note the number of departments created (e.g., 5 departments)
3. **Import the same URL again**

**Expected Results**:

- ✅ Second import succeeds
- ✅ Stats show:
  - `departmentsCreated: 0` (no new departments)
  - `departmentsReused: 5` (existing departments matched)
  - `peopleCreated: X` (new people added if any)
  - `peopleSkipped: Y` (duplicate people skipped)
- ✅ No duplicate departments appear in org chart
- ✅ Audit log shows both import events

**Verification**:

- Check **Department Manager** → Count remains same after re-import
- Check **Audit Log** → Two import entries with different stats

---

### 🎨 Scenario 11: UI/UX Polish

**Goal**: Verify user experience is smooth and informative

**Checklist**:

- ✅ Placeholder text shows example URL format
- ✅ Help text explains: "One per line, max 10 URLs"
- ✅ Domain whitelist displayed: `.gc.ca, canada.ca`
- ✅ Validation updates in real-time as user types
- ✅ Button disabled when no valid URLs
- ✅ Loading state prevents double-clicks
- ✅ Modal backdrop click closes modal (when complete)
- ✅ Close button (X) visible and functional
- ✅ Success/failure results clearly color-coded (green/red)
- ✅ Error messages are user-friendly (not technical jargon)
- ✅ Toast notifications auto-dismiss after 4 seconds

---

## Performance Testing

### 📊 Scenario 12: 10 URLs with Large Files

**Goal**: Verify system handles max load gracefully

**Steps**:

1. Paste **10 valid GEDS URLs**
2. Click import
3. Monitor:
   - Browser performance (no freezing)
   - Server CPU/memory usage
   - Import duration

**Expected Results**:

- ✅ UI remains responsive during import
- ✅ Progress modal shows accurate state
- ✅ All 10 URLs process sequentially (not concurrently)
- ✅ Total time: ~30-60 seconds (depending on file sizes)
- ✅ Memory usage stays reasonable
- ✅ Server doesn't crash or hang

**Metrics to Check**:

- Frontend: React DevTools performance tab
- Backend: Server logs for timing info
- Database: Check for new departments/people via SQL query

---

## Regression Testing

### 🔙 Ensure Existing Features Still Work

After testing GEDS URL import, verify these existing features:

1. **CSV Import**: Still works via first tab
2. **XML File Upload**: Still works via second tab
3. **Organization switching**: Doesn't break import state
4. **Real-time updates**: Socket.IO events still fire
5. **Dark mode**: Import modal renders correctly
6. **Mobile view**: Import UI is responsive

---

## Bug Reporting Template

If you encounter issues during testing, please report with:

```markdown
**Scenario**: [e.g., Single Valid URL Import]
**Steps**:

1. ...
2. ...

**Expected**: [what should happen]
**Actual**: [what actually happened]

**Browser**: [Chrome 120, Safari, etc.]
**Console Errors**: [paste any errors from browser console]
**Server Logs**: [paste relevant server output]
**Screenshots**: [if applicable]
```

---

## Sign-Off Checklist

Once all scenarios pass, the feature is ready for production:

- [ ] All ✅ scenarios pass without errors
- [ ] Authorization works correctly (admin/owner only)
- [ ] Cleanup verified (no temp files left behind)
- [ ] Audit logs created for successful imports
- [ ] Performance acceptable with 10 URLs
- [ ] UI/UX is polished and user-friendly
- [ ] No console errors or warnings
- [ ] No server crashes or memory leaks
- [ ] Existing features still work (regression tests pass)

---

## Next Steps After Testing

1. **If bugs found**: Report using template above, developer will fix
2. **If all tests pass**: Feature is ready for deployment
3. **Optional enhancements** (Future):
   - Real-time progress updates via Socket.IO
   - Parallel downloads (faster batch imports)
   - Download progress bars
   - URL history/favorites
   - Scheduled/automated imports

---

**Testing completed by**: **\*\***\_\_\_**\*\***
**Date**: **\*\***\_\_\_**\*\***
**Status**: ⬜ Pass / ⬜ Fail (with bugs reported)
