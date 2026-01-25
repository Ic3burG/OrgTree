import { request } from './client';

/**
 * Result for a single GEDS URL import
 */
export interface GedsImportResult {
  url: string;
  status: 'success' | 'failed';
  message: string;
  stats?: {
    departments: number;
    people: number;
  };
  error?: string;
}

/**
 * Response from GEDS URL import endpoint
 */
export interface GedsImportResponse {
  results: GedsImportResult[];
}

/**
 * Import GEDS organizational data from multiple XML URLs
 *
 * @param organizationId - The organization to import into
 * @param urls - Array of GEDS XML download URLs (max 10)
 * @returns Results for each URL with success/failure status
 */
export async function importGedsUrls(
  organizationId: string,
  urls: string[]
): Promise<GedsImportResponse> {
  return request<GedsImportResponse>(`/api/organizations/${organizationId}/import/geds-urls`, {
    method: 'POST',
    body: JSON.stringify({ urls }),
  });
}
