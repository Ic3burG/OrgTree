import { useState } from 'react';
import { X } from 'lucide-react';
import { importGedsUrls, GedsImportResult } from '../../api/geds';
import { useToast } from '../ui/Toast';

interface GedsUrlImporterProps {
  organizationId: string;
  onImportComplete: () => void;
}

type ImportStatus = 'idle' | 'validating' | 'importing' | 'complete';

const ALLOWED_DOMAINS = ['.gc.ca', 'canada.ca', '.canada.ca'];
const MAX_URLS = 10;

/**
 * Validates if a URL is from an allowed GEDS domain
 */
function isValidGedsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Must be HTTPS
    if (urlObj.protocol !== 'https:') {
      return false;
    }

    // Check if hostname ends with allowed domain
    const hostname = urlObj.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(domain => hostname.endsWith(domain));
  } catch {
    return false;
  }
}

export default function GedsUrlImporter({
  organizationId,
  onImportComplete,
}: GedsUrlImporterProps) {
  const toast = useToast();
  const [urlsText, setUrlsText] = useState('');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [results, setResults] = useState<GedsImportResult[]>([]);
  const [showModal, setShowModal] = useState(false);

  const urls = urlsText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && line.startsWith('http'));

  const validUrls = urls.filter(isValidGedsUrl);
  const invalidUrls = urls.filter(url => !isValidGedsUrl(url));

  const canImport = validUrls.length > 0 && validUrls.length <= MAX_URLS && status === 'idle';

  const handleImport = async () => {
    if (!canImport) return;

    setStatus('importing');
    setShowModal(true);
    setResults([]);

    try {
      const response = await importGedsUrls(organizationId, validUrls);
      setResults(response.results);
      setStatus('complete');

      // Count successes and failures
      const successCount = response.results.filter(r => r.status === 'success').length;
      const failureCount = response.results.filter(r => r.status === 'failed').length;

      if (successCount > 0) {
        toast.success(
          `Successfully imported ${successCount} GEDS file${successCount === 1 ? '' : 's'}`
        );
        onImportComplete();
      }

      if (failureCount > 0) {
        toast.error(`${failureCount} import${failureCount === 1 ? '' : 's'} failed`);
      }
    } catch (error) {
      setStatus('idle');
      setShowModal(false);
      toast.error(error instanceof Error ? error.message : 'Failed to import GEDS URLs');
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setStatus('idle');
    setUrlsText('');
    setResults([]);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const failureCount = results.filter(r => r.status === 'failed').length;

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="geds-urls"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          GEDS XML URLs
        </label>
        <textarea
          id="geds-urls"
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
          placeholder="Paste GEDS XML download URLs here (one per line, max 10)&#10;Example: https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=..."
          value={urlsText}
          onChange={e => setUrlsText(e.target.value)}
          disabled={status === 'importing'}
        />
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          <p>Paste GEDS XML export URLs (one per line). Maximum {MAX_URLS} URLs.</p>
          <p className="mt-1">
            URLs must be from: <span className="font-mono">{ALLOWED_DOMAINS.join(', ')}</span>
          </p>
        </div>
      </div>

      {/* Validation Summary */}
      {urls.length > 0 && (
        <div className="space-y-2">
          {validUrls.length > 0 && (
            <div className="text-sm text-green-600 dark:text-green-400">
              ✓ {validUrls.length} valid URL{validUrls.length === 1 ? '' : 's'}
            </div>
          )}
          {invalidUrls.length > 0 && (
            <div className="text-sm text-red-600 dark:text-red-400">
              ✗ {invalidUrls.length} invalid URL{invalidUrls.length === 1 ? '' : 's'}
            </div>
          )}
          {validUrls.length > MAX_URLS && (
            <div className="text-sm text-orange-600 dark:text-orange-400">
              ⚠ Maximum {MAX_URLS} URLs allowed (you have {validUrls.length})
            </div>
          )}
        </div>
      )}

      {/* Import Button */}
      <button
        onClick={handleImport}
        disabled={!canImport}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'importing'
          ? 'Importing...'
          : `Import from ${validUrls.length || 0} GEDS URL${validUrls.length === 1 ? '' : 's'}`}
      </button>

      {/* Progress Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={status === 'complete' ? handleClose : undefined}
          ></div>

          <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  GEDS URL Import
                </h2>
                {status === 'complete' && (
                  <button
                    onClick={handleClose}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X size={24} />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {status === 'importing' && (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-300">
                      Importing GEDS data from {validUrls.length} URL
                      {validUrls.length === 1 ? '' : 's'}
                      ...
                    </p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      This may take a few moments
                    </p>
                  </div>
                )}

                {status === 'complete' && (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                        Import Summary
                      </h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Total URLs:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {results.length}
                          </span>
                        </div>
                        {successCount > 0 && (
                          <div className="flex justify-between text-green-600 dark:text-green-400">
                            <span>Successful:</span>
                            <span className="font-medium">{successCount}</span>
                          </div>
                        )}
                        {failureCount > 0 && (
                          <div className="flex justify-between text-red-600 dark:text-red-400">
                            <span>Failed:</span>
                            <span className="font-medium">{failureCount}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detailed Results */}
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {results.map((result, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            result.status === 'success'
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg">
                              {result.status === 'success' ? '✓' : '✗'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
                                {result.url}
                              </div>
                              {result.status === 'success' && result.stats && (
                                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                  Imported {result.stats.departments} department
                                  {result.stats.departments === 1 ? '' : 's'} and{' '}
                                  {result.stats.people} person
                                </div>
                              )}
                              {result.status === 'failed' && result.error && (
                                <div className="mt-1 text-sm text-red-700 dark:text-red-300">
                                  {result.error}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Close Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
