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
 * Slugify function for creating URL-safe paths
 */
function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')                   // Normalize accented characters
    .replace(/[\u0300-\u036f]/g, '')    // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')       // Remove special chars
    .replace(/\s+/g, '-')               // Spaces to hyphens
    .replace(/-+/g, '-')                // Remove multiple hyphens
    .replace(/^-|-$/g, '');             // Trim hyphens
}

/**
 * Extract English acronym from "ENG-FRA" format
 */
function extractAcronym(acronymField) {
  if (!acronymField || !acronymField[0]) return null;
  const value = acronymField[0].trim();
  if (!value) return null;
  // "IRCC-IRCC" → "IRCC"
  const parts = value.split('-');
  return parts[0] || null;
}

/**
 * Get text value from xml2js array wrapper
 */
function getText(field) {
  if (!field || !field[0]) return '';
  const value = field[0];
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value._) return value._.trim();
  return '';
}

/**
 * Clean name (remove backslash escapes)
 */
function cleanName(name) {
  if (!name) return '';
  // Remove backslash escapes like "Toppa\, Melanie" -> "Toppa, Melanie"
  return name.replace(/\\/g, '').trim();
}

/**
 * Parse a single XML file
 */
async function parseXMLFile(filePath) {
  // Read with UTF-8 encoding
  const xmlContent = fs.readFileSync(filePath, 'utf-8');
  const result = await parseXML(xmlContent);
  const person = result.gedsPerson;

  // Extract person details
  const firstName = getText(person.firstName);
  const lastName = getText(person.lastName);
  const fullName = cleanName(`${firstName} ${lastName}`.trim());
  const title = getText(person.title);
  const email = getText(person.email);
  const phone = getText(person.workPhone);

  // Debug logging
  console.log(`  Person: ${fullName}`);

  // Extract hierarchy from orgStructure
  // xml2js structure: orgStructure[0].org is array of org objects
  const orgStructure = person.orgStructure?.[0]?.org || [];

  // Debug: log raw structure
  if (orgStructure.length === 0) {
    console.warn(`  WARNING: No orgStructure found for ${fullName}`);
  }

  // Skip "Canada" (first element) and build hierarchy
  const departments = [];
  for (let i = 0; i < orgStructure.length; i++) {
    const org = orgStructure[i];
    const deptName = getText(org.n);

    // Skip "Canada" (first org in hierarchy)
    if (i === 0 && deptName.toLowerCase().includes('canada')) {
      continue;
    }

    if (deptName) {
      departments.push(deptName);
    }
  }

  // Get acronyms for path segments
  const deptAcronym = extractAcronym(person.departmentAcronym);
  const orgAcronym = extractAcronym(person.organizationAcronym);

  // Debug
  if (departments.length > 0) {
    console.log(`  Departments: ${departments.join(' > ')}`);
    if (deptAcronym) console.log(`  Dept Acronym: ${deptAcronym}`);
    if (orgAcronym) console.log(`  Org Acronym: ${orgAcronym}`);
  }

  return {
    person: {
      name: fullName,
      slug: slugify(fullName),
      title,
      email,
      phone
    },
    departments,
    deptAcronym,
    orgAcronym
  };
}

/**
 * Build department path with acronyms where possible
 */
function buildDepartmentPath(departments, deptAcronym, orgAcronym) {
  const pathParts = [];

  for (let i = 0; i < departments.length; i++) {
    const deptName = departments[i];
    let slug;

    // Use acronym for first level (main department) if available
    if (i === 0 && deptAcronym) {
      slug = deptAcronym;
    }
    // Use acronym for last level (immediate org) if available
    else if (i === departments.length - 1 && orgAcronym) {
      slug = orgAcronym;
    }
    else {
      slug = slugify(deptName);
    }

    pathParts.push(slug);
  }

  return pathParts;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting GEDS XML parsing...\n');

    // Read all XML files
    const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.xml'));
    console.log(`Found ${files.length} XML files\n`);

    if (files.length === 0) {
      console.error('No XML files found in', INPUT_DIR);
      process.exit(1);
    }

    const allDepartments = new Map(); // path -> name
    const allPeople = [];

    for (const file of files) {
      const filePath = path.join(INPUT_DIR, file);
      console.log(`Processing: ${file}`);

      try {
        const data = await parseXMLFile(filePath);

        if (data.departments.length === 0) {
          console.warn(`  WARNING: No departments found, skipping person`);
          continue;
        }

        // Build path parts using acronyms where available
        const pathParts = buildDepartmentPath(
          data.departments,
          data.deptAcronym,
          data.orgAcronym
        );

        // Add each department level to the map
        let currentPath = '';
        for (let i = 0; i < pathParts.length; i++) {
          currentPath += '/' + pathParts[i];
          if (!allDepartments.has(currentPath)) {
            allDepartments.set(currentPath, data.departments[i]);
            console.log(`  Added dept: ${currentPath} -> "${data.departments[i]}"`);
          }
        }

        // Add person with full path
        const personPath = currentPath + '/' + data.person.slug;
        allPeople.push({
          path: personPath,
          ...data.person
        });

        console.log(`  Person path: ${personPath}\n`);

      } catch (err) {
        console.error(`  ERROR: ${err.message}\n`);
      }
    }

    console.log('='.repeat(60));
    console.log('Summary:');
    console.log(`  Departments: ${allDepartments.size}`);
    console.log(`  People: ${allPeople.length}`);
    console.log('='.repeat(60) + '\n');

    if (allDepartments.size === 0) {
      console.error('ERROR: No departments were extracted! Check XML structure.');
      process.exit(1);
    }

    // Sort departments by path depth and alphabetically
    const sortedDepts = Array.from(allDepartments.entries())
      .sort((a, b) => {
        const depthA = a[0].split('/').length;
        const depthB = b[0].split('/').length;
        if (depthA !== depthB) return depthA - depthB;
        return a[0].localeCompare(b[0]);
      });

    // Sort people by path
    allPeople.sort((a, b) => a.path.localeCompare(b.path));

    // Handle duplicate person paths
    const usedPaths = new Set();
    for (const person of allPeople) {
      let finalPath = person.path;
      let counter = 2;

      while (usedPaths.has(finalPath)) {
        const basePath = person.path.replace(/-\d+$/, '');
        finalPath = `${basePath}-${counter}`;
        counter++;
      }

      usedPaths.add(finalPath);
      person.path = finalPath;
    }

    // Generate CSV with UTF-8 BOM for Excel compatibility
    const lines = ['Path,Type,Name,Title,Email,Phone,Description'];

    // Add departments
    for (const [deptPath, deptName] of sortedDepts) {
      const escapedName = deptName.replace(/"/g, '""');
      lines.push(`${deptPath},department,"${escapedName}",,,,`);
    }

    // Add people
    for (const person of allPeople) {
      const name = person.name.replace(/"/g, '""');
      const title = (person.title || '').replace(/"/g, '""');
      const email = person.email || '';
      const phone = person.phone || '';
      lines.push(`${person.path},person,"${name}","${title}",${email},${phone},`);
    }

    // Write CSV with UTF-8 BOM for Excel compatibility
    const BOM = '\ufeff';
    const csvContent = BOM + lines.join('\n');
    fs.writeFileSync(OUTPUT_FILE, csvContent, 'utf-8');

    console.log(`✓ CSV written to ${OUTPUT_FILE}`);
    console.log(`✓ Total entries: ${sortedDepts.length + allPeople.length}`);

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main().catch(console.error);
