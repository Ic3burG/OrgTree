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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import logger from './logger.js';

describe('Logger Utility', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log info messages', () => {
    logger.info('test info', { foo: 'bar' });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('INFO: test info'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('{"foo":"bar"}'));
  });

  it('should log warn messages', () => {
    logger.warn('test warn');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('WARN: test warn'));
  });

  it('should log error messages', () => {
    logger.error('test error', { err: new Error('fail') });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('ERROR: test error'));
  });

  it('should log debug messages in development', () => {
    // NODE_ENV is usually 'test' in vitest, which is not 'production'
    logger.debug('test debug');
    expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('DEBUG: test debug'));
  });
});
