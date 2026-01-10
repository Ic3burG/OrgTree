import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  FileCode,
} from 'lucide-react';
import { parseCSV, validateCSVData } from '../../utils/csvImport';
import { processXmlFiles } from '../../utils/xmlImport';
import type { CSVRow, CSVImportResult } from '../../utils/csvImport';
import api from '../../api/client';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  onSuccess: () => void;
}

interface PreviewData {
  rows: CSVRow[];
  departments: number;
  people: number;
}

type ImportType = 'csv' | 'xml';

export default function ImportModal({
  isOpen,
  onClose,
  orgId,
  onSuccess,
}: ImportModalProps): React.JSX.Element | null {
  const [importType, setImportType] = useState<ImportType>('csv');
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CSVImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setFiles(selectedFiles);
    setErrors([]);
    setWarnings([]);
    setResult(null);

    // Reset preview
    setPreview(null);

    if (importType === 'csv') {
      const file = selectedFiles[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>): void => {
        try {
          const result = event.target?.result;
          if (typeof result !== 'string') return;

          const rows = parseCSV(result);
          const validationErrors = validateCSVData(rows);

          if (validationErrors.length > 0) {
            setErrors(validationErrors);
            setPreview(null);
          } else {
            setPreview({
              rows,
              departments: rows.filter((r: CSVRow) => r.type?.toLowerCase() === 'department')
                .length,
              people: rows.filter((r: CSVRow) => r.type?.toLowerCase() === 'person').length,
            });
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setErrors(['Failed to parse CSV file: ' + errorMessage]);
        }
      };
      reader.readAsText(file);
    } else {
      // XML Import
      setLoading(true);
      try {
        const {
          rows,
          errors: xmlErrors,
          warnings: xmlWarnings,
        } = await processXmlFiles(selectedFiles);

        if (xmlErrors.length > 0) {
          setErrors(xmlErrors);
        }

        if (xmlWarnings.length > 0) {
          setWarnings(xmlWarnings);
        }

        if (rows.length > 0) {
          const validationErrors = validateCSVData(rows);
          if (validationErrors.length > 0) {
            setErrors(prev => [...prev, ...validationErrors]);
          } else {
            setPreview({
              rows,
              departments: rows.filter((r: CSVRow) => r.type?.toLowerCase() === 'department')
                .length,
              people: rows.filter((r: CSVRow) => r.type?.toLowerCase() === 'person').length,
            });
          }
        } else if (xmlErrors.length === 0) {
          setErrors(['No valid data found in the selected XML files.']);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setErrors([errorMessage]);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClose = (): void => {
    setFiles([]);
    setPreview(null);
    setErrors([]);
    setWarnings([]);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Consider untoggling mode? No, keep user preference or reset.
    // Usually standard to reset state.
    // Resetting mode to CSV or keeping it is fine.
    onClose();
  };

  const handleImport = async (): Promise<void> => {
    if (!preview) return;

    setLoading(true);
    try {
      const importResult = (await api.importOrganization(orgId, preview.rows)) as CSVImportResult;
      setResult(importResult);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import data';
      setErrors([errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose}></div>

      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              Import Data
            </h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>

          {result ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">
                Import Successful!
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Created {result.departmentsCreated} department(s) and {result.peopleCreated}{' '}
                person(s).
              </p>
              {result.departmentsReused !== undefined && result.departmentsReused > 0 && (
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                  Reused {result.departmentsReused} existing department(s).
                </p>
              )}
              {result.peopleSkipped > 0 && (
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                  Skipped {result.peopleSkipped} person(s) (duplicates).
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Import Type Selection */}
              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 mb-6">
                <button
                  className={`flex-1 py-1 px-3 text-sm font-medium rounded-md transition-colors ${
                    importType === 'csv'
                      ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  onClick={() => {
                    setImportType('csv');
                    setFiles([]);
                    setPreview(null);
                    setErrors([]);
                    setWarnings([]);
                  }}
                  disabled={loading}
                >
                  CSV Import
                </button>
                <button
                  className={`flex-1 py-1 px-3 text-sm font-medium rounded-md transition-colors ${
                    importType === 'xml'
                      ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  onClick={() => {
                    setImportType('xml');
                    setFiles([]);
                    setPreview(null);
                    setErrors([]);
                    setWarnings([]);
                  }}
                  disabled={loading}
                >
                  GEDS XML
                </button>
              </div>

              {/* File upload area */}
              <div
                onClick={() => !loading && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={importType === 'csv' ? '.csv' : '.xml'}
                  multiple={importType === 'xml'}
                  onChange={handleFileChange}
                  disabled={loading}
                  className="hidden"
                />

                {importType === 'csv' ? (
                  <Upload className="mx-auto text-slate-400 dark:text-slate-500 mb-2" size={32} />
                ) : (
                  <FileCode className="mx-auto text-slate-400 dark:text-slate-500 mb-2" size={32} />
                )}

                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  {files.length > 0
                    ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
                    : `Click to select ${importType === 'csv' ? 'a CSV file' : 'XML files'}`}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {importType === 'csv'
                    ? 'Format: Path, Type, Name, Title, Email, Phone...'
                    : 'Select multiple .xml files to process them together'}
                </p>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium mb-2">
                    <AlertCircle size={20} />
                    Validation Errors
                  </div>
                  <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside space-y-1">
                    {errors.slice(0, 10).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {errors.length > 10 && (
                      <li className="font-medium">...and {errors.length - 10} more error(s)</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-2">
                    <AlertTriangle size={20} />
                    Warnings
                  </div>
                  <ul className="text-sm text-amber-700 dark:text-amber-400 list-disc list-inside space-y-1">
                    {warnings.slice(0, 10).map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                    {warnings.length > 10 && (
                      <li className="font-medium">...and {warnings.length - 10} more warning(s)</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview */}
              {preview && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-medium mb-2">
                    <FileText size={20} />
                    Preview
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Ready to import: {preview.departments} department(s) and {preview.people}{' '}
                    person(s)
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!preview || loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Importing...' : 'Import'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
