import https from 'https';
import { IncomingMessage } from 'http';
import fs from 'fs';
import { pipeline } from 'stream/promises';

/**
 * Custom error classes for GEDS download operations
 */
export class InvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUrlError';
  }
}

export class DownloadTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DownloadTimeoutError';
  }
}

export class FileSizeLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileSizeLimitError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Configuration constants
 */
const ALLOWED_DOMAINS = ['.gc.ca', 'canada.ca', '.canada.ca'];
const DOWNLOAD_TIMEOUT_MS = 30000; // 30 seconds
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Normalizes a GEDS URL by ensuring it uses the XML export pgid (026)
 * if it's currently using the profile page pgid (015).
 *
 * @param url - The GEDS URL to normalize
 * @returns The normalized URL
 */
export function normalizeGedsUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.searchParams.get('pgid') === '015') {
      urlObj.searchParams.set('pgid', '026');
      return urlObj.toString();
    }
  } catch {
    // If URL parsing fails, return original and let validateGedsUrl handle it
  }
  return url;
}

/**
 * Validates that a URL is from an allowed GEDS domain
 *
 * @param url - The URL to validate
 * @returns true if valid
 * @throws InvalidUrlError if URL is invalid or from disallowed domain
 */
export function validateGedsUrl(url: string): boolean {
  // Basic URL format validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new InvalidUrlError('Invalid URL format');
  }

  // Must be HTTPS
  if (parsedUrl.protocol !== 'https:') {
    throw new InvalidUrlError('URL must use HTTPS protocol');
  }

  // Check if hostname ends with allowed domain
  const hostname = parsedUrl.hostname.toLowerCase();
  const isAllowedDomain = ALLOWED_DOMAINS.some(domain => hostname.endsWith(domain));

  if (!isAllowedDomain) {
    throw new InvalidUrlError(`URL must be from an allowed domain: ${ALLOWED_DOMAINS.join(', ')}`);
  }

  return true;
}

/**
 * Downloads a GEDS XML file from a URL to a destination path
 *
 * @param url - The GEDS XML download URL
 * @param destPath - Path where the file should be saved
 * @throws InvalidUrlError if URL fails validation
 * @throws DownloadTimeoutError if download exceeds timeout
 * @throws FileSizeLimitError if file exceeds size limit
 * @throws NetworkError if download fails
 */
export async function downloadGedsXml(url: string, destPath: string): Promise<void> {
  // Normalize URL first (e.g. pgid=015 -> pgid=026)
  const normalizedUrl = normalizeGedsUrl(url);

  // Validate URL first
  validateGedsUrl(normalizedUrl);

  return new Promise((resolve, reject) => {
    const request = https.get(normalizedUrl, response => {
      // Check for redirects or errors
      if (
        response.statusCode === 301 ||
        response.statusCode === 302 ||
        response.statusCode === 307
      ) {
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          return reject(new NetworkError('Redirect without location header'));
        }
        // Follow redirect (only one level to prevent redirect loops)
        https
          .get(redirectUrl, redirectResponse => {
            handleResponse(redirectResponse, destPath, resolve, reject);
          })
          .on('error', error => {
            reject(new NetworkError(`Redirect failed: ${error.message}`));
          });
        return;
      }

      handleResponse(response, destPath, resolve, reject);
    });

    // Set timeout
    request.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
      request.destroy();
      reject(
        new DownloadTimeoutError(`Download timed out after ${DOWNLOAD_TIMEOUT_MS / 1000} seconds`)
      );
    });

    // Handle request errors
    request.on('error', error => {
      reject(new NetworkError(`Download failed: ${error.message}`));
    });
  });
}

/**
 * Handles the HTTP response and streams to file
 */
function handleResponse(
  response: IncomingMessage,
  destPath: string,
  resolve: () => void,
  reject: (error: Error) => void
): void {
  // Check status code
  if (response.statusCode !== 200) {
    reject(new NetworkError(`HTTP ${response.statusCode}: ${response.statusMessage}`));
    return;
  }

  // Check content length if available
  const contentLength = parseInt(response.headers['content-length'] || '0', 10);
  if (contentLength > MAX_FILE_SIZE_BYTES) {
    reject(
      new FileSizeLimitError(
        `File size (${(contentLength / 1024 / 1024).toFixed(2)}MB) exceeds limit of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`
      )
    );
    return;
  }

  // Create write stream
  const fileStream = fs.createWriteStream(destPath);
  let downloadedBytes = 0;

  // Track downloaded bytes to enforce size limit
  response.on('data', (chunk: Buffer) => {
    downloadedBytes += chunk.length;
    if (downloadedBytes > MAX_FILE_SIZE_BYTES) {
      response.destroy();
      fileStream.destroy();
      // Clean up partial file
      fs.unlink(destPath, () => {});
      reject(
        new FileSizeLimitError(
          `File size exceeds limit of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB during download`
        )
      );
    }
  });

  // Pipe response to file
  pipeline(response, fileStream)
    .then(() => resolve())
    .catch(error => {
      // Clean up partial file
      fs.unlink(destPath, () => {});
      reject(new NetworkError(`Download failed: ${error.message}`));
    });
}

/**
 * Safely deletes a temporary file
 * Swallows errors (file already deleted, etc.)
 *
 * @param filePath - Path to the file to delete
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // Silently ignore errors (file might already be deleted)
    // This is intentional - cleanup should never throw
  }
}
