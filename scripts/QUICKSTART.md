# Quick Start Guide

## Convert GEDS XML to OrgTree CSV in 3 Steps

### 1. Add Your XML Files

```bash
# Copy your XML files to the xml-files directory
cp /path/to/your/*.xml scripts/xml-files/
```

### 2. Run the Parser

```bash
# From the project root
node scripts/parse-geds-xml.js
```

You'll see output like:
```
Starting GEDS XML parsing...
Found 50 XML files
Processing file1.xml...
...
Parsed 50 people
Found 25 unique departments
CSV written to scripts/output/geds-import.csv
```

### 3. Import to OrgTree

1. Open OrgTree in your browser
2. Navigate to Dashboard → Import CSV
3. Upload `scripts/output/geds-import.csv`
4. Done!

## Example Output

From this XML structure:
```
Canada (skipped)
└── Immigration, Refugees and Citizenship Canada
    └── National Headquarters
        └── Office of the Deputy Minister
            ├── John Smith (Director General)
            └── Melanie Toppa (Student)
```

You get this CSV:
```csv
Path,Type,Name,Title,Email,Phone,Description
/IRCC,department,"Immigration, Refugees and Citizenship Canada",,,,
/IRCC/NH,department,National Headquarters,,,,
/IRCC/NH/ODM,department,Office of the Deputy Minister,,,,
/IRCC/NH/ODM/john-smith,person,John Smith,Director General,john.smith@ircc.gc.ca,613-555-1234,
/IRCC/NH/ODM/melanie-toppa,person,Melanie Toppa,Student,,,
```

## Notes

- **Sample files included**: Check `xml-files/sample.xml` and `xml-files/sample2.xml`
- **Test first**: Run with samples before processing all 50 files
- **Validation**: Script shows count summary after processing
- **Deduplication**: Departments appear only once, even if multiple people share them

## Troubleshooting

**Issue**: "No XML files found"
**Fix**: Ensure files are in `scripts/xml-files/` with `.xml` extension

**Issue**: Parsing errors
**Fix**: Verify XML files are well-formed and follow GEDS schema

For detailed information, see [README.md](README.md)
