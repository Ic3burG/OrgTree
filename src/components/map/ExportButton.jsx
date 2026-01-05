import { useState, useRef, useEffect } from 'react';
import { Download, Image, FileText, ChevronDown } from 'lucide-react';

export default function ExportButton({ onExportPng, onExportPdf, loading }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export"
      >
        <Download size={18} />
        <span className="text-sm font-medium">Export</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[160px] z-50">
          <button
            onClick={() => {
              onExportPng();
              setIsOpen(false);
            }}
            disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-left disabled:opacity-50 transition-colors"
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
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 text-left disabled:opacity-50 transition-colors"
          >
            <FileText size={18} className="text-red-500" />
            <span className="text-sm">Export as PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
