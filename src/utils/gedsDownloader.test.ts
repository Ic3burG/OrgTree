import { describe, it, expect } from 'vitest';
import { UrlProcessor } from './gedsDownloader';

describe('UrlProcessor', () => {
  it('should parse URLs correctly from multiline text', () => {
    const text = `
      https://geds-sage.gc.ca/en/GEDS?pgid=015&dn=abc
      invalid-url
      https://geds-sage.gc.ca/en/GEDS?pgid=015&dn=def
    `;
    const urls = UrlProcessor.parseUrls(text);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe('https://geds-sage.gc.ca/en/GEDS?pgid=015&dn=abc');
    expect(urls[1]).toBe('https://geds-sage.gc.ca/en/GEDS?pgid=015&dn=def');
  });

  it('should extract common name from DN parameter', () => {
    // CN=Doe\, John,OU=...
    const dn = window.btoa('CN=Doe\\, John,OU=GAC-AMC,O=GC,C=CA');
    const url = `https://geds-sage.gc.ca/en/GEDS?pgid=015&dn=${dn}`;
    const name = UrlProcessor.extractNameFromUrl(url);
    expect(name).toBe('Doe___John');
  });

  it('should handle LDAP escapes in DN correctly', () => {
    // CN=URBAN\2C CHERYL,OU=... (User's specific case)
    // In JS string: CN=URBAN\\2C CHERYL
    const rawDn = 'CN=URBAN\\2C CHERYL,OU=WGM-WGM,OU=GAC-AMC,O=GC,C=CA';
    const dn = window.btoa(rawDn);
    const url = `https://geds-sage.gc.ca/en/GEDS?pgid=015&dn=${dn}`;
    const name = UrlProcessor.extractNameFromUrl(url);
    // Logic replaces [^a-zA-Z0-9-_] with _
    // "URBAN\2C CHERYL" -> "URBAN_2C_CHERYL"
    expect(name).toBe('URBAN_2C_CHERYL');
  });

  it('should return a fallback name for invalid URLs', () => {
    const name = UrlProcessor.extractNameFromUrl('invalid');
    expect(name).toMatch(/^geds_/);
  });
});
