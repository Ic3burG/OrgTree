import React, { useState, useRef, useEffect } from 'react';
import { Download, Image, FileText, ChevronDown } from 'lucide-react';

interface ExportButtonProps {
  onExportPng: () => void;
  onExportPdf: () => void;
  loading: boolean;
}

export default function ExportButton({
  onExportPng,
  onExportPdf,
  loading,
}: ExportButtonProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-100 border border-transparent dark:border-slate-700 rounded-lg shadow hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Download size={18} />
        <span className="text-sm font-medium">Export</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[160px] z-50"
          role="menu"
          aria-label="Export options"
        >
          <button
            onClick={() => {
              onExportPng();
              setIsOpen(false);
            }}
            disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-left dark:text-slate-100 disabled:opacity-50 transition-colors"
            role="menuitem"
          >
            <Image size={18} className="text-blue-500" />
            <span className="text-sm">Export as PNG</span>
          </button>
          <button
            onClick={() => {
              onExportPdf();
              setIsOpen(false);
            }}
            disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-left dark:text-slate-100 disabled:opacity-50 transition-colors"
            role="menuitem"
          >
            <FileText size={18} className="text-red-500" />
            <span className="text-sm">Export as PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
