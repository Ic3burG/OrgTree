import type { CSVRow } from './csvImport';

interface GedsPerson {
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  email: string;
  phone: string;
  department: string;
  departmentAcronym: string | null;
  organization: string;
  organizationAcronym: string | null;
  departments: string[];
}

interface DeptPathInfo {
  name: string;
  slug: string;
}

// Slugify function for creating URL-safe paths (ported from script)
function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD') // Normalize to decompose accented characters (e.g., é -> e + ´)
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/&amp;/g, 'and')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/-+/g, '-') // Replace multiple - with single -
    .replace(/^-|-$/g, ''); // Trim - from start/end
}

// Extract text content from XML element safely
function getElementText(parent: Element, tagName: string): string {
  const element = parent.getElementsByTagName(tagName)[0];
  return element?.textContent?.trim() || '';
}

// Parse a single XML file content
async function parseGedsXMLContent(content: string): Promise<GedsPerson | null> {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      console.error('XML Parsing Error', parserError[0]?.textContent);
      return null;
    }

    const root = xmlDoc.getElementsByTagName('gedsPerson')[0];
    if (!root) return null;

    const firstName = getElementText(root, 'firstName');
    const lastName = getElementText(root, 'lastName');
    // Always construct name in "First Last" order (XML fullName is in "Last, First" format)
    const fullName = `${firstName} ${lastName}`.trim();

    const title = getElementText(root, 'title');
    const email = getElementText(root, 'email');
    const phone = getElementText(root, 'workPhone');

    // Extract acronyms
    const deptAcronymRaw = getElementText(root, 'departmentAcronym');
    const orgAcronymRaw = getElementText(root, 'organizationAcronym');

    // Helper to extract acronym from "ENG-FRA" format
    const extractAcronym = (raw: string) => {
      if (!raw) return null;
      const parts = raw.split('-');
      return parts[0]?.trim() || null;
    };

    const deptAcronym = extractAcronym(deptAcronymRaw);
    const orgAcronym = extractAcronym(orgAcronymRaw);

    // Extract hierarchy
    const departments: string[] = [];
    const orgStructure = root.getElementsByTagName('orgStructure')[0];

    if (orgStructure) {
      const orgs = orgStructure.getElementsByTagName('org');
      // Skip the first one (Canada)
      for (let i = 1; i < orgs.length; i++) {
        const org = orgs[i];
        if (!org) continue;
        const nameTag = org.getElementsByTagName('name')[0]; // <name> tag contains department name
        if (nameTag && nameTag.textContent) {
          const deptName = nameTag.textContent.trim();
          // Decode basic entities if DOMParser didn't (it usually does automatically)
          departments.push(deptName);
        }
      }
    }

    // Fallback if orgStructure is missing/empty but department/org tags exist
    if (departments.length === 0) {
      const dept = getElementText(root, 'department');
      if (dept) departments.push(dept);
      const org = getElementText(root, 'organization');
      if (org && org !== dept) departments.push(org);
    }

    return {
      firstName,
      lastName,
      fullName,
      title,
      email,
      phone,
      department: getElementText(root, 'department'),
      departmentAcronym: deptAcronym,
      organization: getElementText(root, 'organization'),
      organizationAcronym: orgAcronym,
      departments,
    };
  } catch (err) {
    console.error('Error parsing XML content', err);
    return null;
  }
}

// Build department path using acronyms where available
function buildPath(departments: string[], acronymMap: Map<string, string>): DeptPathInfo[] {
  const pathInfo: DeptPathInfo[] = [];
  for (const deptName of departments) {
    const slug = acronymMap.get(deptName) || slugify(deptName);
    if (slug) {
      pathInfo.push({ name: deptName, slug });
    }
  }
  return pathInfo;
}

/**
 * Process multiple XML files and return rows for import
 */
export async function processXmlFiles(
  files: File[]
): Promise<{ rows: CSVRow[]; errors: string[]; warnings: string[] }> {
  const acronymMap = new Map<string, string>();
  const parsedPeople: GedsPerson[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Pass 1: Read all files and collect acronyms
  for (const file of files) {
    try {
      const text = await readFileAsText(file, 'ISO-8859-1');
      const data = await parseGedsXMLContent(text);

      if (data) {
        parsedPeople.push(data);

        // Map first department to its acronym
        if (data.departments.length > 0 && data.departmentAcronym) {
          const firstDept = data.departments[0];
          // We checked departments.length > 0 so firstDept is defined.
          // TS might not know index 0 is valid, but it's string[].
          if (firstDept && !acronymMap.has(firstDept)) {
            acronymMap.set(firstDept, data.departmentAcronym);
          }
        }

        // Map last department to its acronym
        if (data.departments.length > 0 && data.organizationAcronym) {
          const lastDept = data.departments[data.departments.length - 1];
          if (lastDept && !acronymMap.has(lastDept)) {
            acronymMap.set(lastDept, data.organizationAcronym);
          }
        }
      }
    } catch (err) {
      errors.push(
        `Failed to read ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  const rows: CSVRow[] = [];
  const processedPaths = new Set<string>(); // avoid duplicates in output
  const seenEmails = new Set<string>(); // track emails to detect duplicates
  let duplicateCount = 0;

  for (const person of parsedPeople) {
    if (person.departments.length === 0) continue;

    const pathInfo = buildPath(person.departments, acronymMap);

    // Add departments to rows
    let currentPath = '';
    for (const part of pathInfo) {
      currentPath += '/' + part.slug;
      const deptName = part.name;

      if (!processedPaths.has(currentPath)) {
        processedPaths.add(currentPath);
        rows.push({
          path: currentPath,
          type: 'department',
          name: deptName,
          title: '',
          email: '',
          phone: '',
          description: '',
        });
      }
    }

    // Check for duplicate email within the XML files
    if (person.email) {
      const emailLower = person.email.toLowerCase().trim();
      if (seenEmails.has(emailLower)) {
        // Skip this person - duplicate email detected
        duplicateCount++;
        warnings.push(`Duplicate email detected: ${person.email} (${person.fullName}) - skipped`);
        continue; // Skip adding this person to rows
      }
      seenEmails.add(emailLower);
    }

    // Add person
    const personSlug = slugify(person.fullName);

    let personPath = currentPath + '/' + personSlug;
    let counter = 1;
    while (processedPaths.has(personPath)) {
      counter++;
      personPath = currentPath + '/' + personSlug + '-' + counter;
    }
    processedPaths.add(personPath);

    rows.push({
      path: personPath,
      type: 'person',
      name: person.fullName,
      title: person.title,
      email: person.email,
      phone: person.phone,
      description: '',
    });
  }

  // Add summary warning if duplicates were found
  if (duplicateCount > 0) {
    warnings.unshift(
      `Found ${duplicateCount} duplicate email(s) within the XML files. Duplicates were not included in the import.`
    );
  }

  return { rows, errors, warnings };
}

function readFileAsText(file: File, encoding: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, encoding);
  });
}
