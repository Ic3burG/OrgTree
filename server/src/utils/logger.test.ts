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
