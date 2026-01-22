# GEDS XML Import Guide

## French Character Encoding Issues

### The Problem

GEDS XML files contain French names with accented characters (é, è, ê, ô, etc.). If these files are downloaded or converted with incorrect encoding settings, French characters become corrupted (`�` or other garbled text).

### Common Encoding Issues

1. **UTF-8 with Replacement Characters**: File saved as UTF-8 but contains `�` (U+FFFD)
   - Original: `Lévêque` → Corrupted: `L�v�que`
   - Cause: File was converted from one encoding to another incorrectly

2. **Latin-1/Windows-1252 Misread as UTF-8**: File is Latin-1 but read as UTF-8
   - Original: `Régismé` → Corrupted: Shows as `RÃ©gismÃ©`
   - Cause: Byte sequence `é` (0xE9 in Latin-1) interpreted as UTF-8

3. **UTF-8 Misread as Latin-1**: File is UTF-8 but read as Latin-1
   - Original: `Lévêque` → Corrupted: `Lï¿½vï¿½que`
   - Cause: UTF-8 multi-byte sequences (0xC3 0xA9 for é) read as separate Latin-1 chars

## Solution: Updated Parser

The `parse-geds-xml.js` script now includes automatic encoding detection:

### Features

1. **XML Declaration Detection**: Reads `<?xml encoding="..."?>` header
2. **UTF-8 First**: Tries UTF-8 encoding first (most modern files)
3. **Replacement Character Detection**: Warns if `�` characters found
4. **Latin-1 Fallback**: Falls back to Latin-1 for legacy files
5. **UTF-8 BOM Output**: CSV output includes UTF-8 BOM for Excel compatibility

### How It Works

```javascript
// 1. Check XML declaration for encoding
<?xml version="1.0" encoding="UTF-8"?>

// 2. Try UTF-8 first, detect replacement characters
const content = fs.readFileSync(filePath, 'utf-8');
if (!content.includes('�')) return content;

// 3. Fall back to Latin-1 if needed
return fs.readFileSync(filePath, 'latin1');
```

## Best Practices for GEDS XML Downloads

### 1. Check XML Declaration

Ensure downloaded files have proper XML declarations:

```xml
<?xml version="1.0" encoding="UTF-8"?>
```

or

```xml
<?xml version="1.0" encoding="ISO-8859-1"?>
```

### 2. Verify Encoding After Download

Use command-line tools to verify:

```bash
# Check file encoding
file -b --mime-encoding your-file.xml

# Inspect raw bytes of French characters
grep "fullName" your-file.xml | hexdump -C
```

**Correct UTF-8 encoding of "Lévêque":**
- `c3 a9` = é
- `c3 aa` = ê

**Incorrect (replacement character):**
- `ef bf bd` = �

### 3. Download Directly from GEDS API

If possible, download XML directly from the GEDS API/service without intermediate conversions. Each conversion step risks encoding corruption.

### 4. Avoid Copy-Paste

Copying XML content from web browsers or terminal windows can corrupt encoding. Always save/download as binary files.

### 5. Test with Sample Names

After download, test with known French names:
- Lévêque, Dupré, Côté, Noël, François, Hélène

If you see `�` or garbled characters, the encoding is incorrect.

## Fixing Corrupted Files

### If Files Are Already Corrupted

The parser will detect and warn about corruption:

```
⚠️  WARNING: File contains replacement characters (�)
⚠️  Source file may be corrupted or encoded incorrectly
```

**Options:**
1. **Re-download** from source with correct encoding
2. **Manual correction** if only a few files
3. **Continue with warning** - names will be imported with � characters

### Testing Your Files

Run the encoding test script:

```bash
cd scripts
node test-geds-encoding.js
```

This will check all XML files in `gac-xml-sample/` and report:
- Detected encoding
- Presence of replacement characters
- Correctly parsed names

## Import Workflow

### 1. Download GEDS XML Files

Place XML files in `scripts/xml-files/` directory.

### 2. Run Parser

```bash
cd scripts
node parse-geds-xml.js
```

### 3. Check Output

The parser will:
- Auto-detect encoding from each file
- Warn about corrupted files
- Generate `output/geds-import.csv` with UTF-8 encoding

### 4. Review CSV

Open `output/geds-import.csv` in Excel or a text editor:
- Excel: Will display French characters correctly (thanks to UTF-8 BOM)
- Text editor: Verify names look correct (Lévêque, not L�v�que)

### 5. Import to OrgTree

Use the CSV import feature in OrgTree to load the data.

## Technical Details

### Character Encoding Primer

**UTF-8**: Variable-length encoding (1-4 bytes per character)
- ASCII (a-z, A-Z): 1 byte
- French accents (é, è, ê): 2 bytes (e.g., é = 0xC3 0xA9)
- Universal, modern standard

**Latin-1 (ISO-8859-1)**: Fixed 1 byte per character
- ASCII (a-z, A-Z): same as UTF-8
- French accents (é, è, ê): 1 byte (e.g., é = 0xE9)
- Legacy encoding for Western European languages

**Windows-1252**: Superset of Latin-1
- Similar to Latin-1 but with additional characters in 0x80-0x9F range
- Common on Windows systems

### Byte Sequences for Common French Characters

| Character | UTF-8 Bytes | Latin-1 Byte |
|-----------|-------------|--------------|
| é         | C3 A9       | E9           |
| è         | C3 A8       | E8           |
| ê         | C3 AA       | EA           |
| à         | C3 A0       | E0           |
| ô         | C3 B4       | F4           |
| ç         | C3 A7       | E7           |

### Replacement Character

The Unicode replacement character (U+FFFD):
- UTF-8: `EF BF BD`
- Displayed as: �
- Indicates: Failed to decode a byte sequence

## Troubleshooting

### Problem: Names show as `L�v�que`

**Cause**: Original XML file is corrupted (contains UTF-8 replacement characters)

**Solution**: Re-download XML files from GEDS source

### Problem: Names show as `Lï¿½vï¿½que`

**Cause**: UTF-8 file read as Latin-1

**Solution**: Parser should auto-detect this. If not, manually specify encoding in XML declaration.

### Problem: Names show as `RÃ©gismÃ©`

**Cause**: Latin-1 file read as UTF-8

**Solution**: Parser will fall back to Latin-1 automatically

### Problem: CSV import shows garbled text in OrgTree

**Cause**: CSV file encoding issue or browser not reading UTF-8

**Solution**:
1. Verify CSV has UTF-8 BOM (first 3 bytes: EF BB BF)
2. Check browser console for encoding errors
3. Ensure CSV is served with `Content-Type: text/csv; charset=utf-8`

## Additional Resources

- [GEDS XML Bulk Downloader](../scripts/geds.ts)
- [Import Route](../server/src/routes/import.ts)
- [Character Encoding (Wikipedia)](https://en.wikipedia.org/wiki/Character_encoding)
- [UTF-8 (Wikipedia)](https://en.wikipedia.org/wiki/UTF-8)
