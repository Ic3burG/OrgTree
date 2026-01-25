import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

/**
 * Error class for GEDS parsing failures
 */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Parsed GEDS data structure
 */
export interface ParsedGedsData {
  departments: Department[];
  people: Person[];
}

export interface Department {
  path: string;
  type: 'department';
  name: string;
  description?: string;
}

export interface Person {
  path: string;
  type: 'person';
  name: string;
  title?: string;
  email?: string;
  phone?: string;
}

/**
 * Slugify function for creating URL-safe paths
 */
function slugify(text: string): string {
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

/**
 * Extract English acronym from "ENG-FRA" format
 * Returns lowercase acronym for use in slugs
 */
function extractAcronym(field: unknown): string | null {
  if (!field) return null;
  const value = Array.isArray(field) ? field[0] : field;
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('-');
  // Return lowercase for consistent slugs
  return parts[0] ? parts[0].toLowerCase() : null;
}

/**
 * Get text value - handles xml2js array wrapping
 */
function getText(field: unknown): string {
  if (!field) return '';
  if (Array.isArray(field)) {
    if (field.length === 0) return '';
    const value = field[0];
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object' && value !== null && '_' in value) {
      const textValue = (value as { _: unknown })._;
      if (typeof textValue === 'string') return textValue.trim();
    }
    return '';
  }
  if (typeof field === 'string') return field.trim();
  return '';
}

/**
 * Build department path using acronyms where available
 */
function buildPath(departments: string[], acronymMap: Map<string, string>): string[] {
  const pathParts: string[] = [];

  for (const deptName of departments) {
    const slug = acronymMap.get(deptName) || slugify(deptName);
    if (slug) {
      pathParts.push(slug);
    }
  }

  return pathParts;
}

/**
 * Parse a single GEDS XML person record
 */
async function parsePersonXml(xmlContent: string): Promise<{
  person: Person;
  departments: string[];
  deptAcronym: string | null;
  orgAcronym: string | null;
}> {
  try {
    const result = await parseXML(xmlContent);
    const person = result.gedsPerson;

    if (!person) {
      throw new ParseError('Invalid GEDS XML: missing gedsPerson root element');
    }

    // Extract person details
    const firstName = getText(person.firstName);
    const lastName = getText(person.lastName);
    const fullName = `${firstName} ${lastName}`.trim();
    const title = getText(person.title);
    const email = getText(person.email);
    const phone = getText(person.workPhone);

    if (!fullName) {
      throw new ParseError('Invalid GEDS XML: person must have a name');
    }

    // Get acronyms
    const deptAcronym = extractAcronym(person.departmentAcronym);
    const orgAcronym = extractAcronym(person.organizationAcronym);

    // Extract hierarchy from orgStructure
    // IMPORTANT: xml2js converts <n> to "name" property!
    const departments: string[] = [];

    if (
      person.orgStructure &&
      Array.isArray(person.orgStructure) &&
      person.orgStructure.length > 0 &&
      person.orgStructure[0].org &&
      Array.isArray(person.orgStructure[0].org)
    ) {
      const orgs = person.orgStructure[0].org;

      // Skip first element (Canada)
      for (let i = 1; i < orgs.length; i++) {
        const org = orgs[i];
        // xml2js parses <n> as "name" property
        if (org.name && Array.isArray(org.name) && org.name[0]) {
          let deptName = org.name[0];
          // Decode HTML entities and trim whitespace
          deptName = deptName.replace(/&amp;/g, '&').trim();
          departments.push(deptName);
        }
      }
    }

    return {
      person: {
        path: '', // Will be set later with full path
        type: 'person',
        name: fullName,
        title: title || undefined,
        email: email || undefined,
        phone: phone || undefined,
      },
      departments,
      deptAcronym,
      orgAcronym,
    };
  } catch (err) {
    if (err instanceof ParseError) {
      throw err;
    }
    throw new ParseError(
      `Failed to parse GEDS XML: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse GEDS XML content and return structured department/person data
 *
 * @param xmlContent - Raw XML content from GEDS
 * @returns Parsed departments and people with hierarchical paths
 * @throws ParseError if XML is invalid or missing required fields
 */
export async function parseGedsXml(xmlContent: string): Promise<ParsedGedsData> {
  try {
    // Parse the single XML record
    const parsed = await parsePersonXml(xmlContent);

    if (parsed.departments.length === 0) {
      throw new ParseError('No departments found in GEDS XML');
    }

    // Build acronym map from this record
    const acronymMap = new Map<string, string>();
    if (parsed.deptAcronym && parsed.departments.length > 0) {
      acronymMap.set(parsed.departments[0], parsed.deptAcronym);
    }
    if (parsed.orgAcronym && parsed.departments.length > 0) {
      acronymMap.set(parsed.departments[parsed.departments.length - 1], parsed.orgAcronym);
    }

    // Build path parts using the acronym map
    const pathParts = buildPath(parsed.departments, acronymMap);

    // Create department records
    const departments: Department[] = [];
    let currentPath = '';

    for (let i = 0; i < pathParts.length; i++) {
      currentPath += '/' + pathParts[i];
      departments.push({
        path: currentPath,
        type: 'department',
        name: parsed.departments[i],
        description: undefined,
      });
    }

    // Create person record with full path
    const personSlug = slugify(parsed.person.name);
    const personPath = currentPath + '/' + personSlug;
    const person: Person = {
      ...parsed.person,
      path: personPath,
    };

    return {
      departments,
      people: [person],
    };
  } catch (err) {
    if (err instanceof ParseError) {
      throw err;
    }
    throw new ParseError(
      `Failed to parse GEDS XML: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
}

/**
 * Parse multiple GEDS XML files and merge results
 *
 * @param xmlContents - Array of raw XML content strings
 * @returns Merged and deduplicated departments and people
 */
export async function parseMultipleGedsXml(xmlContents: string[]): Promise<ParsedGedsData> {
  const allDepartments = new Map<string, Department>();
  const allPeople: Person[] = [];

  for (const xmlContent of xmlContents) {
    const parsed = await parseGedsXml(xmlContent);

    // Merge departments (deduplicate by path)
    for (const dept of parsed.departments) {
      if (!allDepartments.has(dept.path)) {
        allDepartments.set(dept.path, dept);
      }
    }

    // Add all people (duplicates will be handled by import logic)
    allPeople.push(...parsed.people);
  }

  // Sort departments by path depth and alphabetically
  const sortedDepts = Array.from(allDepartments.values()).sort((a, b) => {
    const depthA = a.path.split('/').length;
    const depthB = b.path.split('/').length;
    if (depthA !== depthB) return depthA - depthB;
    return a.path.localeCompare(b.path);
  });

  // Sort people by path
  allPeople.sort((a, b) => a.path.localeCompare(b.path));

  return {
    departments: sortedDepts,
    people: allPeople,
  };
}
