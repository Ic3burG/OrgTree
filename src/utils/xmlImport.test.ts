import { describe, it, expect } from 'vitest';
import { processXmlFiles } from './xmlImport';

describe('XML Import - GEDS Format', () => {
  it('should extract full department hierarchy from orgStructure', async () => {
    // Sample GEDS XML with nested department structure
    const sampleXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<gedsPerson>
  <firstName>Jennifer</firstName>
  <lastName>Reynolds</lastName>
  <title>Senior Communications Advisor</title>
  <email>jennifer.reynolds@example.gc.ca</email>
  <workPhone>613-555-0100</workPhone>
  <department>Immigration, Refugees and Citizenship Canada</department>
  <departmentAcronym>IRCC-IRCC</departmentAcronym>
  <organization>Asylum &amp; Migration Integrity</organization>
  <organizationAcronym>ASY-ASI</organizationAcronym>
  <orgStructure>
    <org>
      <name>Canada</name>
      <DN>base</DN>
    </org>
    <org>
      <name>Immigration, Refugees and Citizenship Canada</name>
      <DN>dept1</DN>
    </org>
    <org>
      <name>National Headquarters</name>
      <DN>dept2</DN>
    </org>
    <org>
      <name>Office of the Deputy Minister</name>
      <DN>dept3</DN>
    </org>
    <org>
      <name>People and Communications Sector</name>
      <DN>dept4</DN>
    </org>
    <org>
      <name>Public Affairs &amp; Strategic Communications Branch</name>
      <DN>dept5</DN>
    </org>
    <org>
      <name>Asylum &amp; Migration Integrity</name>
      <DN>dept6</DN>
    </org>
  </orgStructure>
</gedsPerson>`;

    // Create a File object from the XML string
    const blob = new Blob([sampleXml], { type: 'text/xml' });
    const file = new File([blob], 'test.xml', { type: 'text/xml' });

    const result = await processXmlFiles([file]);

    // Should have no errors
    expect(result.errors).toHaveLength(0);

    // Filter for department rows
    const deptRows = result.rows.filter(row => row.type === 'department');

    // Verify hierarchy is created with correct depth
    const paths = deptRows.map(d => d.path);

    // Should have departments at different levels
    const depths = paths
      .filter((p): p is string => p !== undefined)
      .map(p => p.split('/').filter(Boolean).length);
    expect(Math.max(...depths)).toBeGreaterThan(3); // Should have deep nesting

    // Should include the deepest department
    expect(deptRows.some(d => d.name === 'Asylum & Migration Integrity')).toBe(true);

    // Should include intermediate departments
    expect(deptRows.some(d => d.name === 'National Headquarters')).toBe(true);
    expect(deptRows.some(d => d.name === 'Office of the Deputy Minister')).toBe(true);

    // Verify people rows have the new fields
    const personRows = result.rows.filter(row => row.type === 'person');
    expect(personRows).toHaveLength(1);
    const person = personRows[0];
    expect(person?.name).toBe('Jennifer Reynolds');
    expect(person?.dept_acronym).toBe('IRCC'); // Extracted from IRCC-IRCC
    expect(person?.org_acronym).toBe('ASY'); // Extracted from ASY-ASI
  });

  it('should handle fallback when orgStructure is missing', async () => {
    // XML without orgStructure - should use department and organization tags
    const simpleXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<gedsPerson>
  <firstName>John</firstName>
  <lastName>Doe</lastName>
  <title>Manager</title>
  <email>john.doe@example.gc.ca</email>
  <department>Main Department</department>
  <organization>Sub Organization</organization>
</gedsPerson>`;

    const blob = new Blob([simpleXml], { type: 'text/xml' });
    const file = new File([blob], 'simple.xml', { type: 'text/xml' });

    const result = await processXmlFiles([file]);

    expect(result.errors).toHaveLength(0);

    const deptRows = result.rows.filter(row => row.type === 'department');

    // Should extract at least 2 departments from fallback
    expect(deptRows.length).toBeGreaterThanOrEqual(2);
    expect(deptRows.some(d => d.name === 'Main Department')).toBe(true);
    expect(deptRows.some(d => d.name === 'Sub Organization')).toBe(true);
  });

  it('should detect duplicate emails within XML files', async () => {
    const xml1 = `<?xml version="1.0" encoding="ISO-8859-1"?>
<gedsPerson>
  <firstName>John</firstName>
  <lastName>Doe</lastName>
  <email>duplicate@example.com</email>
  <department>Dept A</department>
</gedsPerson>`;

    const xml2 = `<?xml version="1.0" encoding="ISO-8859-1"?>
<gedsPerson>
  <firstName>Jane</firstName>
  <lastName>Smith</lastName>
  <email>DUPLICATE@example.com</email>
  <department>Dept B</department>
</gedsPerson>`;

    const blob1 = new Blob([xml1], { type: 'text/xml' });
    const blob2 = new Blob([xml2], { type: 'text/xml' });
    const file1 = new File([blob1], 'person1.xml', { type: 'text/xml' });
    const file2 = new File([blob2], 'person2.xml', { type: 'text/xml' });

    const result = await processXmlFiles([file1, file2]);

    // Should have warning about duplicate
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('Duplicate email'))).toBe(true);

    // Should only have 1 person (duplicate skipped)
    const personRows = result.rows.filter(row => row.type === 'person');
    expect(personRows.length).toBe(1);
  });
});
