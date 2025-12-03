import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseString } from 'xml2js';
import { promisify } from 'util';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const parseXML = promisify(parseString);

// Configuration
const INPUT_DIR = path.join(__dirname, 'xml-files');
const OUTPUT_FILE = path.join(__dirname, 'output', 'geds-import.csv');

/**
 * Main function to orchestrate the parsing
 */
async function main() {
  try {
    console.log('Starting GEDS XML parsing...');

    // Read all XML files
    const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.xml'));
    console.log(`Found ${files.length} XML files`);

    if (files.length === 0) {
      console.error('No XML files found in', INPUT_DIR);
      process.exit(1);
    }

    // Parse all files
    const allPeople = [];
    const departmentMap = new Map(); // key: path, value: department info

    for (const file of files) {
      const filePath = path.join(INPUT_DIR, file);
      console.log(`Processing ${file}...`);

      try {
        const result = await parseXMLFile(filePath);

        // Add person to list
        allPeople.push(result.person);

        // Add all departments in hierarchy to map
        result.hierarchy.forEach(dept => {
          if (!departmentMap.has(dept.path)) {
            departmentMap.set(dept.path, dept);
          }
        });
      } catch (err) {
        console.error(`Error processing ${file}:`, err.message);
      }
    }

    console.log(`\nParsed ${allPeople.length} people`);
    console.log(`Found ${departmentMap.size} unique departments`);

    // Generate CSV
    const csv = generateCSV(departmentMap, allPeople);

    // Write output
    fs.writeFileSync(OUTPUT_FILE, csv);
    console.log(`\nCSV written to ${OUTPUT_FILE}`);

    // Validation
    console.log('\n--- Validation ---');
    console.log(`Total entries: ${departmentMap.size + allPeople.length}`);
    console.log(`Departments: ${departmentMap.size}`);
    console.log(`People: ${allPeople.length}`);

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

/**
 * Parse a single XML file and extract person + hierarchy
 */
async function parseXMLFile(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8');
  const result = await parseXML(xml);

  const gedsPerson = result.gedsPerson;

  // Extract person info
  const firstName = getString(gedsPerson.firstName);
  const lastName = getString(gedsPerson.lastName);
  const fullName = cleanName(`${firstName} ${lastName}`.trim());
  const title = getString(gedsPerson.title);
  const email = getString(gedsPerson.email);
  const phone = getString(gedsPerson.workPhone);

  // Build hierarchy from orgStructure
  const orgStructure = gedsPerson.orgStructure?.[0]?.org || [];
  const hierarchy = buildHierarchy(orgStructure);

  // Create person path
  const personSlug = slugify(fullName);
  const basePath = hierarchy.length > 0 ? hierarchy[hierarchy.length - 1].path : '';
  const personPath = `${basePath}/${personSlug}`;

  const person = {
    path: personPath,
    type: 'person',
    name: fullName,
    title: title || '',
    email: email || '',
    phone: phone || '',
    description: ''
  };

  return { person, hierarchy };
}

/**
 * Build department hierarchy from orgStructure, skipping "Canada"
 */
function buildHierarchy(orgStructure) {
  const hierarchy = [];
  let currentPath = '';

  for (let i = 0; i < orgStructure.length; i++) {
    const org = orgStructure[i];
    const name = getString(org.n);

    // Skip "Canada" (first org in hierarchy)
    if (i === 0 && name.toLowerCase().includes('canada')) {
      continue;
    }

    // Try to find acronym from the name or DN
    // The DN is base64 encoded, but we don't need to decode it for acronyms
    // We'll look for patterns like "IRCC-IRCC" in the name or use the name itself
    let pathSegment = '';

    // Check if the name has format "Full Name (ACRONYM)" or contains recognizable acronym
    const acronymMatch = name.match(/\(([A-Z]{2,})\)/);
    if (acronymMatch) {
      pathSegment = acronymMatch[1];
    } else {
      // Create a simple acronym from uppercase letters or use slug
      const upperLetters = name.match(/[A-Z]/g);
      if (upperLetters && upperLetters.length >= 2 && upperLetters.length <= 5) {
        pathSegment = upperLetters.join('');
      } else {
        pathSegment = slugify(name);
      }
    }

    currentPath += `/${pathSegment}`;

    hierarchy.push({
      path: currentPath,
      type: 'department',
      name: name,
      title: '',
      email: '',
      phone: '',
      description: ''
    });
  }

  return hierarchy;
}

/**
 * Extract acronym from "ENG-FRA" format
 */
function extractAcronym(acronymField) {
  if (!acronymField) return null;
  const parts = acronymField.split('-');
  return parts[0]?.trim() || null;
}

/**
 * Create slug from name
 */
function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim hyphens
}

/**
 * Clean name from XML (handle backslash escapes)
 */
function cleanName(name) {
  if (!name) return '';
  // Remove backslash escapes like "Toppa\, Melanie" -> "Toppa, Melanie"
  return name.replace(/\\/g, '').trim();
}

/**
 * Safely get string value from XML parsed array
 */
function getString(field) {
  if (!field) return '';
  if (Array.isArray(field)) {
    return field[0] || '';
  }
  return String(field);
}

/**
 * Generate CSV content
 */
function generateCSV(departmentMap, people) {
  const rows = [];

  // CSV Header
  rows.push('Path,Type,Name,Title,Email,Phone,Description');

  // Sort departments by path depth (shallower first)
  const departments = Array.from(departmentMap.values())
    .sort((a, b) => {
      const depthA = a.path.split('/').length;
      const depthB = b.path.split('/').length;
      if (depthA !== depthB) return depthA - depthB;
      return a.path.localeCompare(b.path);
    });

  // Add departments
  departments.forEach(dept => {
    rows.push(formatCSVRow(dept));
  });

  // Sort people by path
  const sortedPeople = people.sort((a, b) => a.path.localeCompare(b.path));

  // Handle duplicate person names
  const personPaths = new Set();
  sortedPeople.forEach(person => {
    let finalPath = person.path;
    let counter = 2;

    // If path already exists, append number
    while (personPaths.has(finalPath)) {
      const basePath = person.path.replace(/-\d+$/, ''); // Remove any existing number
      finalPath = `${basePath}-${counter}`;
      counter++;
    }

    personPaths.add(finalPath);
    person.path = finalPath;

    rows.push(formatCSVRow(person));
  });

  return rows.join('\n');
}

/**
 * Format a single CSV row, escaping fields as needed
 */
function formatCSVRow(item) {
  const fields = [
    item.path,
    item.type,
    escapeCSV(item.name),
    escapeCSV(item.title),
    escapeCSV(item.email),
    escapeCSV(item.phone),
    escapeCSV(item.description)
  ];

  return fields.join(',');
}

/**
 * Escape CSV field if it contains comma, quote, or newline
 */
function escapeCSV(field) {
  if (!field) return '';

  const stringField = String(field);

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
}

// Run main function
main();
