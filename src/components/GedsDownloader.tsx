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

import { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { Download, FileText, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { UrlProcessor, GedsFetcher } from '../utils/gedsDownloader';

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export default function GedsDownloader() {
  const [urls, setUrls] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ total: 0, success: 0, error: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        message,
        type,
      },
    ]);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleClear = () => {
    if (isDownloading) return;
    setUrls('');
    setLogs([]);
    setProgress(0);
    setStats({ total: 0, success: 0, error: 0 });
  };

  const processDownloads = async (mode: 'zip' | 'individual') => {
    const urlList = UrlProcessor.parseUrls(urls);
    if (urlList.length === 0) {
      alert('Please enter at least one valid GEDS URL.');
      return;
    }

    setIsDownloading(true);
    setLogs([]);
    setStats({ total: urlList.length, success: 0, error: 0 });
    setProgress(0);
    addLog(
      `Starting ${mode === 'zip' ? 'ZIP' : 'individual'} download for ${urlList.length} items...`
    );

    const zip = mode === 'zip' ? new JSZip() : null;
    let successCount = 0;
    let errorCount = 0;

    let i = 0;
    for (const url of urlList) {
      if (!url) continue;
      const fileName = UrlProcessor.extractNameFromUrl(url);

      try {
        addLog(`Processing: ${fileName}...`);
        const xml = await GedsFetcher.fetchXml(url);

        if (mode === 'zip' && zip) {
          zip.file(`${fileName}.xml`, xml);
        } else {
          const blob = new Blob([xml], { type: 'application/xml' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${fileName}.xml`;
          link.click();
        }

        successCount++;
        addLog(`✓ Successfully fetched ${fileName}`, 'success');
      } catch (err) {
        errorCount++;
        addLog(
          `✗ Failed ${fileName}: ${err instanceof Error ? err.message : 'Unknown error'}`,
          'error'
        );
      }

      const completed = i + 1;
      setStats(prev => ({ ...prev, success: successCount, error: errorCount }));
      setProgress(Math.round((completed / urlList.length) * 100));
      i++;

      // Throttle to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, mode === 'zip' ? 100 : 500));
    }

    if (mode === 'zip' && zip && successCount > 0) {
      addLog('Generating ZIP package...', 'info');
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `geds_bulk_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      addLog('✓ ZIP download started successfully', 'success');
    }

    addLog(
      `Finished! ${successCount} successful, ${errorCount} failed.`,
      successCount > 0 ? 'success' : 'error'
    );
    setIsDownloading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          GEDS XML Bulk Downloader
        </h1>
        <p className="text-gray-600 dark:text-slate-400">
          Paste GEDS profile URLs below to scrape and download their XML data.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-700">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
            GEDS Source URLs
          </label>
          <textarea
            className="w-full h-40 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-slate-200"
            placeholder="https://geds-sage.gc.ca/en/GEDS?pgid=015&dn=...&#10;https://geds-sage.gc.ca/en/GEDS?pgid=015&dn=..."
            value={urls}
            onChange={e => setUrls(e.target.value)}
            disabled={isDownloading}
          />
        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 flex gap-3">
          <button
            onClick={() => processDownloads('zip')}
            disabled={isDownloading || !urls.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-lg font-semibold transition-all shadow-sm"
          >
            {isDownloading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Download size={18} />
            )}
            Download ZIP
          </button>
          <button
            onClick={() => processDownloads('individual')}
            disabled={isDownloading || !urls.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 py-2.5 rounded-lg font-semibold transition-all shadow-sm"
          >
            <FileText size={18} />
            Individual Files
          </button>
          <button
            onClick={handleClear}
            disabled={isDownloading}
            className="flex items-center justify-center gap-2 px-4 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 py-2.5 rounded-lg font-semibold transition-all"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {(isDownloading || logs.length > 0) && (
          <div className="flex-1 flex flex-col p-4 border-t border-gray-100 dark:border-slate-700 min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-tighter">
                Download Monitor
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-gray-400">Total:</span>
                  <span className="font-mono font-bold dark:text-slate-200 text-gray-700">
                    {stats.total}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle2 size={14} className="text-green-500" />
                  <span className="font-mono font-bold text-green-600">{stats.success}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <AlertCircle size={14} className="text-red-500" />
                  <span className="font-mono font-bold text-red-600">{stats.error}</span>
                </div>
              </div>
            </div>

            <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-4">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex-1 bg-gray-900 rounded-lg p-3 font-mono text-xs overflow-y-auto text-blue-100 space-y-1 scrollbar-thin scrollbar-thumb-gray-700">
              {logs.map(log => (
                <div
                  key={log.id}
                  className={`${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : ''}`}
                >
                  <span className="opacity-50 mr-2">[{log.timestamp}]</span>
                  {log.message}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
