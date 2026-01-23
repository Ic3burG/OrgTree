import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Pencil } from 'lucide-react';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  label: string;
  type?: 'text' | 'textarea' | 'email' | 'tel' | 'url';
  className?: string;
  placeholder?: string;
}

export default function InlineEdit({
  value,
  onSave,
  label,
  type = 'text',
  className = '',
  placeholder = '',
}: InlineEditProps): React.JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (tempValue.trim() === value.trim()) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onSave(tempValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      // Keep edit mode open on error so user can retry
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 w-full ${className}`}>
        {type === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={tempValue}
            onChange={e => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow p-2 border border-blue-400 rounded bg-white dark:bg-slate-700 dark:text-white dark:border-blue-500 outline-none focus:ring-2 focus:ring-blue-500/29 min-h-[80px]"
            placeholder={placeholder}
            disabled={isSaving}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            value={tempValue}
            onChange={e => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow p-1.5 border border-blue-400 rounded bg-white dark:bg-slate-700 dark:text-white dark:border-blue-500 outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder={placeholder}
            disabled={isSaving}
          />
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400 dark:hover:bg-green-900/60 disabled:opacity-50"
          aria-label="Save"
        >
          <Check size={18} />
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400 dark:hover:bg-red-900/60 disabled:opacity-50"
          aria-label="Cancel"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`group flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 -m-1.5 p-1.5 rounded transition-colors ${className}`}
      role="button"
      tabIndex={0}
      aria-label={`Edit ${label}`}
    >
      <span className={!value ? 'text-slate-400 italic' : ''}>
        {value || placeholder || 'Click to edit'}
      </span>
      <Pencil
        size={14}
        className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity flex-shrink-0"
      />
    </div>
  );
}
