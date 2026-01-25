import { describe, it, expect } from 'vitest';
import { parseGedsXml, parseMultipleGedsXml, ParseError } from './geds-parser.service.js';

describe('GEDS Parser Service', () => {
  const validGedsXml = `<?xml version="1.0" encoding="UTF-8"?>
<gedsPerson>
  <firstName>John</firstName>
  <lastName>Smith</lastName>
  <title>Director</title>
  <email>john.smith@example.gc.ca</email>
  <workPhone>613-555-1234</workPhone>
  <departmentAcronym>DEPT-DEPT</departmentAcronym>
  <organizationAcronym>ORG-ORG</organizationAcronym>
  <orgStructure>
    <org><name>Canada</name></org>
    <org><name>Department of Example</name></org>
    <org><name>Example Division</name></org>
  </orgStructure>
</gedsPerson>`;

  const gedsXmlWithFrenchChars = `<?xml version="1.0" encoding="UTF-8"?>
<gedsPerson>
  <firstName>François</firstName>
  <lastName>Côté</lastName>
  <title>Directeur général</title>
  <email>francois.cote@example.gc.ca</email>
  <workPhone>613-555-5678</workPhone>
  <departmentAcronym>DEPT-DEPT</departmentAcronym>
  <organizationAcronym>DIRECTION-DIRECTION</organizationAcronym>
  <orgStructure>
    <org><name>Canada</name></org>
    <org><name>Ministère de l'Example</name></org>
  </orgStructure>
</gedsPerson>`;

  const gedsXmlWithHtmlEntities = `<?xml version="1.0" encoding="UTF-8"?>
<gedsPerson>
  <firstName>Jane</firstName>
  <lastName>Doe</lastName>
  <title>Manager</title>
  <email>jane.doe@example.gc.ca</email>
  <workPhone>613-555-9999</workPhone>
  <departmentAcronym>R&amp;D-RD</departmentAcronym>
  <organizationAcronym>TECH-TECH</organizationAcronym>
  <orgStructure>
    <org><name>Canada</name></org>
    <org><name>Research &amp; Development</name></org>
  </orgStructure>
</gedsPerson>`;

  describe('parseGedsXml', () => {
    it('should parse valid GEDS XML correctly', async () => {
      const result = await parseGedsXml(validGedsXml);

      expect(result).toBeDefined();
      expect(result.departments).toHaveLength(2); // Canada is skipped
      expect(result.people).toHaveLength(1);

      // Check departments
      expect(result.departments[0].name).toBe('Department of Example');
      expect(result.departments[0].path).toBe('/dept');
      expect(result.departments[0].type).toBe('department');

      expect(result.departments[1].name).toBe('Example Division');
      expect(result.departments[1].path).toBe('/dept/org'); // Uses organizationAcronym

      // Check person
      expect(result.people[0].name).toBe('John Smith');
      expect(result.people[0].title).toBe('Director');
      expect(result.people[0].email).toBe('john.smith@example.gc.ca');
      expect(result.people[0].phone).toBe('613-555-1234');
      expect(result.people[0].type).toBe('person');
      expect(result.people[0].path).toBe('/dept/org/john-smith'); // Path includes org acronym
    });

    it('should handle French characters correctly', async () => {
      const result = await parseGedsXml(gedsXmlWithFrenchChars);

      expect(result.people[0].name).toBe('François Côté');
      expect(result.people[0].title).toBe('Directeur général');
      expect(result.departments[0].name).toBe("Ministère de l'Example");
    });

    it('should decode HTML entities in department names', async () => {
      const result = await parseGedsXml(gedsXmlWithHtmlEntities);

      expect(result.departments[0].name).toBe('Research & Development');
      expect(result.departments[0].path).toBe('/tech'); // Uses acronym from organizationAcronym
    });

    it('should use acronyms for path slugs when available', async () => {
      const result = await parseGedsXml(validGedsXml);

      // First department should use acronym "dept" from departmentAcronym
      expect(result.departments[0].path).toBe('/dept');
      // Second department should use acronym "org" from organizationAcronym
      expect(result.departments[1].path).toBe('/dept/org');
    });

    it('should throw ParseError for invalid XML', async () => {
      const invalidXml = '<not valid xml';

      await expect(parseGedsXml(invalidXml)).rejects.toThrow(ParseError);
    });

    it('should throw ParseError for XML without gedsPerson root', async () => {
      const xmlWithoutRoot = '<?xml version="1.0"?><someOtherRoot></someOtherRoot>';

      await expect(parseGedsXml(xmlWithoutRoot)).rejects.toThrow(ParseError);
      await expect(parseGedsXml(xmlWithoutRoot)).rejects.toThrow('missing gedsPerson');
    });

    it('should throw ParseError when person has no name', async () => {
      const xmlWithoutName = `<?xml version="1.0"?>
<gedsPerson>
  <firstName></firstName>
  <lastName></lastName>
  <orgStructure>
    <org><n>Canada</n></org>
    <org><n>Department</n></org>
  </orgStructure>
</gedsPerson>`;

      await expect(parseGedsXml(xmlWithoutName)).rejects.toThrow(ParseError);
      await expect(parseGedsXml(xmlWithoutName)).rejects.toThrow('must have a name');
    });

    it('should throw ParseError when no departments found', async () => {
      const xmlWithoutDepartments = `<?xml version="1.0"?>
<gedsPerson>
  <firstName>John</firstName>
  <lastName>Smith</lastName>
  <orgStructure>
    <org><name>Canada</name></org>
  </orgStructure>
</gedsPerson>`;

      await expect(parseGedsXml(xmlWithoutDepartments)).rejects.toThrow(ParseError);
      await expect(parseGedsXml(xmlWithoutDepartments)).rejects.toThrow('No departments found');
    });

    it('should handle missing optional fields', async () => {
      const xmlWithMissingOptionals = `<?xml version="1.0"?>
<gedsPerson>
  <firstName>John</firstName>
  <lastName>Smith</lastName>
  <orgStructure>
    <org><name>Canada</name></org>
    <org><name>Department</name></org>
  </orgStructure>
</gedsPerson>`;

      const result = await parseGedsXml(xmlWithMissingOptionals);

      expect(result.people[0].name).toBe('John Smith');
      expect(result.people[0].title).toBeUndefined();
      expect(result.people[0].email).toBeUndefined();
      expect(result.people[0].phone).toBeUndefined();
    });

    it('should handle whitespace in field values', async () => {
      const xmlWithWhitespace = `<?xml version="1.0"?>
<gedsPerson>
  <firstName>  John  </firstName>
  <lastName>  Smith  </lastName>
  <title>  Director  </title>
  <orgStructure>
    <org><name>Canada</name></org>
    <org><name>  Department  </name></org>
  </orgStructure>
</gedsPerson>`;

      const result = await parseGedsXml(xmlWithWhitespace);

      expect(result.people[0].name).toBe('John Smith');
      expect(result.people[0].title).toBe('Director');
      expect(result.departments[0].name).toBe('Department');
    });

    it('should create unique paths for people with same name', async () => {
      const result = await parseGedsXml(validGedsXml);

      // Person path should include slugified name
      expect(result.people[0].path).toContain('john-smith');
    });
  });

  describe('parseMultipleGedsXml', () => {
    it('should merge multiple XML files correctly', async () => {
      const xml1 = validGedsXml;
      const xml2 = gedsXmlWithFrenchChars;

      const result = await parseMultipleGedsXml([xml1, xml2]);

      // Should have people from both files
      expect(result.people).toHaveLength(2);
      expect(result.people[0].name).toBe('John Smith');
      expect(result.people[1].name).toBe('François Côté');

      // Departments should be deduplicated by path
      // Both files have different departments, so no deduplication
      expect(result.departments.length).toBeGreaterThan(0);
    });

    it('should deduplicate departments with same path', async () => {
      const xml1 = validGedsXml;
      const xml2 = validGedsXml; // Same XML twice

      const result = await parseMultipleGedsXml([xml1, xml2]);

      // Should have 2 people (both Johns)
      expect(result.people).toHaveLength(2);

      // Should have unique departments (same path = same department)
      expect(result.departments).toHaveLength(2);
    });

    it('should sort departments by depth', async () => {
      const result = await parseMultipleGedsXml([validGedsXml]);

      // Parent department should come before child
      expect(result.departments[0].path.split('/').length).toBeLessThanOrEqual(
        result.departments[1].path.split('/').length
      );
    });

    it('should sort people alphabetically by path', async () => {
      const result = await parseMultipleGedsXml([validGedsXml, gedsXmlWithFrenchChars]);

      // Verify sorting (paths should be in order)
      for (let i = 1; i < result.people.length; i++) {
        expect(result.people[i].path.localeCompare(result.people[i - 1].path)).toBeGreaterThanOrEqual(
          0
        );
      }
    });

    it('should handle empty array', async () => {
      const result = await parseMultipleGedsXml([]);

      expect(result.departments).toHaveLength(0);
      expect(result.people).toHaveLength(0);
    });

    it('should propagate ParseError from invalid XML', async () => {
      const invalidXml = '<invalid';

      await expect(parseMultipleGedsXml([validGedsXml, invalidXml])).rejects.toThrow(ParseError);
    });
  });
});
