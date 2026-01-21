# GEDS XML to OrgTree CSV Parser

This script parses Government of Canada Employee Directory (GEDS) XML files and converts them into a CSV file that can be imported into OrgTree.

## Prerequisites

- Node.js installed
- `xml2js` package (installed via `npm install`)

## Directory Structure

```
scripts/
├── parse-geds-xml.js      # Main parsing script
├── xml-files/             # Place your XML files here
├── output/                # Generated CSV will be here
└── README.md             # This file
```

## Usage

### 1. Prepare XML Files

Place all your GEDS XML files (`.xml` format) in the `scripts/xml-files/` directory.

### 2. Run the Parser

From the project root:

```bash
node scripts/parse-geds-xml.js
```

Or from the scripts directory:

```bash
cd scripts
node parse-geds-xml.js
```

### 3. Find Output

The generated CSV file will be at `scripts/output/geds-import.csv`

### 4. Import to OrgTree

1. Log in to OrgTree
2. Navigate to your organization's Dashboard
3. Click "Import CSV"
4. Upload the generated `geds-import.csv` file

## XML File Format

The script expects XML files in the GEDS format:

```xml
<gedsPerson>
  <fullName>Lastname\, Firstname</fullName>
  <firstName>Firstname</firstName>
  <lastName>Lastname</lastName>
  <title>Job Title</title>
  <workPhone>555-1234</workPhone>
  <email>user@example.gc.ca</email>
  <department>Department Name</department>
  <departmentAcronym>DEPT-DEPT</departmentAcronym>
  <organization>Organization Unit</organization>
  <organizationAcronym>ORG-ORG</organizationAcronym>
  <orgStructure>
    <org>
      <n>Canada</n>
      <DN>...</DN>
    </org>
    <org>
      <n>Department Name</n>
      <DN>...</DN>
    </org>
    <org>
      <n>Branch Name</n>
      <DN>...</DN>
    </org>
  </orgStructure>
</gedsPerson>
```

## How It Works

### Hierarchy Processing

1. **Skips "Canada"**: The root "Canada" organization is automatically skipped
2. **Builds Paths**: Creates hierarchical paths from the `<orgStructure>` section
3. **Uses Acronyms**: Prefers short acronyms for path segments when available
4. **Generates Slugs**: Falls back to slugified names for organizations without acronyms

### Department Deduplication

- Departments are automatically deduplicated
- Each unique department path appears only once in the output
- People are assigned to their respective departments

### Person Handling

- Names are cleaned (removes backslash escapes)
- Duplicate person names get numbered suffixes (-2, -3, etc.)
- Empty fields are left blank (no null/undefined values)

## Output Format

The generated CSV has the following columns:

- **Path**: Hierarchical path (e.g., `/IRCC/NHQ/DMO` or `/IRCC/NHQ/DMO/john-smith`)
- **Type**: Either `department` or `person`
- **Name**: Full name of department or person
- **Title**: Job title (for people only)
- **Email**: Email address (for people only)
- **Phone**: Phone number (for people only)
- **Description**: Additional notes (usually empty)

### Example Output

```csv
Path,Type,Name,Title,Email,Phone,Description
/IRCC,department,Immigration Refugees and Citizenship Canada,,,,
/IRCC/NHQ,department,National Headquarters,,,,
/IRCC/NHQ/DMO,department,Office of the Deputy Minister,,,,
/IRCC/NHQ/DMO/melanie-toppa,person,Melanie Toppa,Student,,,
/IRCC/NHQ/DMO/john-smith,person,John Smith,Director,john.smith@ircc.gc.ca,613-555-1234,
```

## Validation

After running the script, you'll see a summary:

```
Starting GEDS XML parsing...
Found 50 XML files
Processing file1.xml...
Processing file2.xml...
...

Parsed 50 people
Found 25 unique departments

CSV written to scripts/output/geds-import.csv

--- Validation ---
Total entries: 75
Departments: 25
People: 50
```

## Troubleshooting

### No XML files found

- Ensure XML files are in `scripts/xml-files/` directory
- Check that files have `.xml` extension

### Parsing errors

- Verify XML files are valid and well-formed
- Check that files follow the GEDS schema

### Missing departments

- The script automatically creates all parent departments
- If a department is missing, check the `<orgStructure>` section in the source XML

### Duplicate paths

- If you see duplicate person names, the script will automatically append numbers
- Check the output CSV for `-2`, `-3` suffixes on person paths

## Advanced Usage

### Custom Input/Output Paths

Edit the configuration at the top of `parse-geds-xml.js`:

```javascript
const INPUT_DIR = path.join(__dirname, 'xml-files'); // Change this
const OUTPUT_FILE = path.join(__dirname, 'output', 'geds-import.csv'); // Change this
```

### Modifying Path Generation

To customize how paths are generated, edit the `buildHierarchy()` function in the script.

### Handling Special Cases

The script includes handling for:

- Accented characters (é, ô, etc.)
- Special characters in names
- Empty/missing fields
- Varying hierarchy depths
- Duplicate names

## Support

For issues or questions:

1. Check the validation output from the script
2. Verify your XML files are properly formatted
3. Review the generated CSV manually before importing
4. Test with a small sample first (1-2 XML files)
