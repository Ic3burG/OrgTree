import fs from 'fs';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

// Detect and read XML file with proper encoding
function readXMLFile(filePath) {
  // First, try to detect encoding from XML declaration
  const firstBytes = fs.readFileSync(filePath, { encoding: 'utf-8', flag: 'r' }).substring(0, 200);
  const encodingMatch = firstBytes.match(/encoding=["']([^"']+)["']/i);

  if (encodingMatch) {
    const declaredEncoding = encodingMatch[1].toLowerCase();
    console.log(`  Detected encoding from XML declaration: ${declaredEncoding}`);

    // Map common encoding names to Node.js encoding names
    const encodingMap = {
      'utf-8': 'utf-8',
      'utf8': 'utf-8',
      'iso-8859-1': 'latin1',
      'latin1': 'latin1',
      'windows-1252': 'latin1',
      'cp1252': 'latin1',
    };

    const nodeEncoding = encodingMap[declaredEncoding] || 'utf-8';
    return fs.readFileSync(filePath, nodeEncoding);
  }

  // Try UTF-8 first (most common modern encoding)
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Check if content has replacement characters
    if (!content.includes('�')) {
      return content;
    }
    console.log(`  UTF-8 read found replacement characters, trying latin1...`);
  } catch (err) {
    console.log(`  UTF-8 read failed, trying latin1...`);
  }

  // Fall back to latin1
  return fs.readFileSync(filePath, 'latin1');
}

function getText(field) {
  if (!field) return '';
  if (Array.isArray(field)) {
    if (field.length === 0) return '';
    const value = field[0];
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object' && value._) return value._.trim();
    return '';
  }
  if (typeof field === 'string') return field.trim();
  return '';
}

async function testFile(filePath) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${filePath}`);
  console.log('='.repeat(60));

  const xmlContent = readXMLFile(filePath);

  if (xmlContent.includes('�')) {
    console.log(`  ⚠️  WARNING: File contains replacement characters (�)`);
    console.log(`  ⚠️  Source file may be corrupted or encoded incorrectly`);
  } else {
    console.log(`  ✅ No replacement characters found - encoding looks good!`);
  }

  const result = await parseXML(xmlContent);
  const person = result.gedsPerson;

  const firstName = getText(person.firstName);
  const lastName = getText(person.lastName);
  const fullName = `${firstName} ${lastName}`.trim();

  console.log(`  First Name: ${firstName}`);
  console.log(`  Last Name: ${lastName}`);
  console.log(`  Full Name: ${fullName}`);
}

async function main() {
  console.log('\nGEDS XML Encoding Test');
  console.log('Testing encoding detection and French character support\n');

  const files = [
    './gac-xml-sample/LEVEQUE_2C_ALEXANDRE.xml',
    './gac-xml-sample/LEVEQUE_2C_ALEXANDRE-FIXED.xml',
    './gac-xml-sample/REGISME_2C_BARBARA.xml',
    './gac-xml-sample/REGISME_2C_BARBARA-FIXED.xml',
  ];

  for (const file of files) {
    if (fs.existsSync(file)) {
      await testFile(file);
    } else {
      console.log(`\n⚠️  File not found: ${file}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log('  - Fixed files (-FIXED.xml) should show proper French names');
  console.log('  - Original files may show replacement characters (�)');
  console.log('  - Parser now auto-detects encoding from XML declaration');
  console.log('='.repeat(60) + '\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
