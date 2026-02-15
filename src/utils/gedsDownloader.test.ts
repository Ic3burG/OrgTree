/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

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
