# Troubleshooting "No departments extracted" Error

## The Problem

You're getting this error:

```
ERROR: No departments were extracted! Check XML structure.
```

This means the parser couldn't find department hierarchy information in your XML files.

## Quick Diagnosis

### Step 1: Test with One File

Move all but ONE of your XML files out of `scripts/xml-files/` temporarily, then run:

```bash
node scripts/parse-geds-xml.js
```

Look at the output carefully. You'll see debug information showing what the parser found.

### Step 2: Check the Debug Output

The parser will now show:

```
Processing: your-file.xml
  Person: John Doe
  Debug - First org object: { ... }
  WARNING: No orgStructure found
  Raw orgStructure: { ... }
```

## Common Causes & Solutions

### Cause 1: Empty orgStructure

**Symptom:**

```
WARNING: No orgStructure found for John Doe
Raw orgStructure: undefined
```

**Solution:** Your XML files might use a different structure. Check if they have these fields:

```xml
<department>Department Name</department>
<organization>Organization Unit</organization>
```

The parser now has a **fallback** that will try to use these fields if `orgStructure` is missing.

### Cause 2: All Departments are "Canada"

**Symptom:**

```
Skipping "Canada" (root org)
WARNING: No departments found, skipping person
```

**Solution:** Your XML files only have "Canada" in the hierarchy. You'll need to add the `<department>` and `<organization>` fields to your XML, or modify the parser to not skip Canada.

### Cause 3: Different XML Structure

**Symptom:**

```
Debug - First org object: null
```

**Solution:** Your XML structure is different. Please share a **sample** (with sensitive data removed) so I can adapt the parser.

## Share a Sample for Debugging

If the issue persists, please:

1. Pick ONE XML file
2. Remove sensitive information (replace names, emails with placeholders)
3. Share the XML structure

Example:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gedsPerson>
  <firstName>John</firstName>
  <lastName>Doe</lastName>
  <title>Manager</title>
  <department>Department Name</department>
  <departmentAcronym>DEPT-DEPT</departmentAcronym>
  <organization>Organization Unit</organization>
  <organizationAcronym>ORG-ORG</organizationAcronym>
  <orgStructure>
    <!-- Show your actual orgStructure here -->
  </orgStructure>
</gedsPerson>
```

## Manual Workaround

If you need to proceed immediately, you can:

1. **Option A:** Create a simpler CSV manually with just:

   ```csv
   Path,Type,Name,Title,Email,Phone,Description
   /DEPT,department,Department Name,,,,
   /DEPT/person1,person,John Doe,Manager,john@example.com,555-1234,
   ```

2. **Option B:** Modify the parser to accept your XML structure (I can help with this if you share a sample)

## Next Steps

Run the parser again with the improvements:

```bash
node scripts/parse-geds-xml.js
```

The new version will:

- Show detailed debug output
- Try fallback extraction from `<department>` and `<organization>` fields
- List which files have problems
- Give you specific error information to help diagnose the issue

Share the output and I can provide a targeted fix!
