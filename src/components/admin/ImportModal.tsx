import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { parseCSV, validateCSVData } from '../../utils/csvImport';
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

export default function ImportModal({
  isOpen,
  onClose,
  orgId,
  onSuccess,
}: ImportModalProps): React.JSX.Element | null {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CSVImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setResult(null);

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
            departments: rows.filter((r: CSVRow) => r.type?.toLowerCase() === 'department').length,
            people: rows.filter((r: CSVRow) => r.type?.toLowerCase() === 'person').length,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setErrors(['Failed to parse CSV file: ' + errorMessage]);
      }
    };
    reader.readAsText(selectedFile);
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
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import data';
      setErrors([errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (): void => {
    setFile(null);
    setPreview(null);
    setErrors([]);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose}></div>

      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800">Import from CSV</h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
            >
              <X size={24} />
            </button>
          </div>

          {result ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
              <h3 className="text-lg font-medium text-slate-800 mb-2">Import Successful!</h3>
              <p className="text-slate-600">
                Created {result.departmentsCreated} department(s) and {result.peopleCreated}{' '}
                person(s).
              </p>
            </div>
          ) : (
            <>
              {/* File upload area */}
              <div
                onClick={() => !loading && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-slate-400 transition-colors ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="hidden"
                />
                <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                <p className="text-slate-600 font-medium">
                  {file ? file.name : 'Click to select a CSV file'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Format: Path, Type, Name, Title, Email, Phone, Description
                </p>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <AlertCircle size={20} />
                    Validation Errors
                  </div>
                  <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                    {errors.slice(0, 10).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {errors.length > 10 && (
                      <li className="font-medium">...and {errors.length - 10} more error(s)</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview */}
              {preview && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
                    <FileText size={20} />
                    Preview
                  </div>
                  <p className="text-sm text-blue-600">
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
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
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
