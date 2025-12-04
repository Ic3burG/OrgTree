import fs from 'fs';
import path from 'path';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

const INPUT_DIR = './xml-files';
const OUTPUT_FILE = './output/geds-import.csv';

// Slugify function for creating URL-safe paths
function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/&amp;/g, 'and')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Extract English acronym from "ENG-FRA" format
function extractAcronym(field) {
  if (!field) return null;
  const value = Array.isArray(field) ? field[0] : field;
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('-');
  return parts[0] || null;
}

// Get text value - handles xml2js array wrapping
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

// Parse a single XML file
async function parseXMLFile(filePath) {
  const xmlContent = fs.readFileSync(filePath, 'utf-8');
  const result = await parseXML(xmlContent);
  const person = result.gedsPerson;

  // Extract person details
  const firstName = getText(person.firstName);
  const lastName = getText(person.lastName);
  const fullName = `${firstName} ${lastName}`.trim();
  const title = getText(person.title);
  const email = getText(person.email);
  const phone = getText(person.workPhone);

  // Get acronyms
  const deptAcronym = extractAcronym(person.departmentAcronym);
  const orgAcronym = extractAcronym(person.organizationAcronym);

  // Extract hierarchy from orgStructure
  // IMPORTANT: xml2js converts <n> to "name" property!
  let departments = [];
  
  if (person.orgStructure && 
      Array.isArray(person.orgStructure) && 
      person.orgStructure.length > 0 &&
      person.orgStructure[0].org &&
      Array.isArray(person.orgStructure[0].org)) {
    
    const orgs = person.orgStructure[0].org;
    
    // Skip first element (Canada)
    for (let i = 1; i < orgs.length; i++) {
      const org = orgs[i];
      // xml2js parses <n> as "name" property
      if (org.name && Array.isArray(org.name) && org.name[0]) {
        let deptName = org.name[0];
        // Decode HTML entities
        deptName = deptName.replace(/&amp;/g, '&');
        departments.push(deptName);
      }
    }
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

// Build department path using acronyms where available
function buildPath(departments, deptAcronym, orgAcronym) {
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
    
    if (slug) {
      pathParts.push(slug);
    }
  }
  
  return pathParts;
}

// Escape CSV field
function escapeCSV(field) {
  if (!field) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

async function main() {
  console.log('Starting GEDS XML parsing...\n');
  
  // Create output directory if it doesn't exist
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read all XML files
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.toLowerCase().endsWith('.xml'));
  console.log(`Found ${files.length} XML files\n`);

  const allDepartments = new Map(); // path -> name
  const allPeople = [];
  let skippedCount = 0;

  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);
    console.log(`Processing: ${file}`);
    
    try {
      const data = await parseXMLFile(filePath);
      
      console.log(`  Person: ${data.person.name}`);
      console.log(`  Departments found: ${data.departments.length}`);
      
      if (data.departments.length === 0) {
        console.log(`  WARNING: No departments found, skipping person`);
        skippedCount++;
        continue;
      }

      // Log the departments found
      data.departments.forEach((d, i) => console.log(`    ${i + 1}. ${d}`));

      // Build path parts using acronyms
      const pathParts = buildPath(data.departments, data.deptAcronym, data.orgAcronym);
      console.log(`  Path: /${pathParts.join('/')}`);
      
      // Add each department level to the map
      let currentPath = '';
      for (let i = 0; i < pathParts.length; i++) {
        currentPath += '/' + pathParts[i];
        if (!allDepartments.has(currentPath)) {
          allDepartments.set(currentPath, data.departments[i]);
        }
      }
      
      // Add person with full path
      const personPath = currentPath + '/' + data.person.slug;
      allPeople.push({
        path: personPath,
        ...data.person
      });
      
    } catch (err) {
      console.error(`  ERROR processing ${file}:`, err.message);
    }
    
    console.log('');
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

  // Generate CSV
  const lines = ['Path,Type,Name,Title,Email,Phone,Description'];
  
  // Add departments
  for (const [deptPath, deptName] of sortedDepts) {
    lines.push(`${deptPath},department,${escapeCSV(deptName)},,,,`);
  }
  
  // Add people
  for (const person of allPeople) {
    lines.push([
      person.path,
      'person',
      escapeCSV(person.name),
      escapeCSV(person.title),
      escapeCSV(person.email),
      escapeCSV(person.phone),
      ''
    ].join(','));
  }

  // Write CSV with UTF-8 BOM
  const BOM = '\ufeff';
  fs.writeFileSync(OUTPUT_FILE, BOM + lines.join('\n'), 'utf-8');
  
  console.log('============================================================');
  console.log('Summary:');
  console.log(`  Departments: ${sortedDepts.length}`);
  console.log(`  People: ${allPeople.length}`);
  if (skippedCount > 0) {
    console.log(`  Skipped: ${skippedCount}`);
  }
  console.log(`  Output: ${OUTPUT_FILE}`);
  console.log('============================================================');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
