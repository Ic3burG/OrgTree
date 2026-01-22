import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { ChevronRight, Star, MoreHorizontal } from 'lucide-react';
import { getInitials } from '../utils/helpers';
import type { Person } from '../types/index.js';

interface EditablePersonCardProps {
  person: Person;
  onSelect?: (person: Person) => void;
  onUpdate?: (personId: string, updates: Partial<Person>) => Promise<void>;
  onOpenFullEdit?: (person: Person) => void;
  isLast?: boolean;
  isEditing?: boolean;
  onEditStart?: (personId: string) => void;
  onEditEnd?: () => void;
}

interface FormState {
  name: string;
  title: string;
  email: string;
  phone: string;
  is_starred: boolean;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Validates person data for quick inline edits
 */
import { validatePerson } from '../utils/personValidation';

/**
 * EditablePersonCard - Person card with inline editing capabilities
 */
const EditablePersonCard = memo(function EditablePersonCard({
  person,
  onSelect,
  onUpdate,
  onOpenFullEdit,
  isLast,
  isEditing = false,
  onEditStart,
  onEditEnd,
}: EditablePersonCardProps): React.JSX.Element {
  const initials = getInitials(person.name);
  const [formData, setFormData] = useState<FormState>({
    name: person.name,
    title: person.title || '',
    email: person.email || '',
    phone: person.phone || '',
    is_starred: person.is_starred || false,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form data when editing starts or person changes
  useEffect(() => {
    if (isEditing) {
      setFormData({
        name: person.name,
        title: person.title || '',
        email: person.email || '',
        phone: person.phone || '',
        is_starred: person.is_starred || false,
      });
      setErrors({});
      // Focus name input when editing starts
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isEditing, person]);

  // Handle click outside to save/cancel
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        // If dirty, we could show confirmation, but for quick edit UI pattern,
        // usually clicking outside either saves or cancels.
        // Let's cancel for safety unless we implement auto-save.
        onEditEnd?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, onEditEnd]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onEditStart && onUpdate) {
        onEditStart(person.id);
      } else if (onSelect) {
        onSelect(person);
      }
    },
    [onEditStart, onUpdate, onSelect, person]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isEditing && onSelect) {
        onSelect(person);
      }
    },
    [isEditing, onSelect, person]
  );

  const handleChange = (field: keyof FormState, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for field when modified
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!onUpdate) return;

    const newErrors = validatePerson(formData);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(person.id, {
        name: formData.name,
        title: formData.title,
        email: formData.email,
        phone: formData.phone,
        is_starred: formData.is_starred,
      });
      onEditEnd?.();
    } catch (error) {
      console.error('Failed to update person:', error);
      // Could show error toast here
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditEnd?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onEditEnd?.();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      handleSave();
    }
  };

  // 1. EDIT MODE VIEW
  if (isEditing) {
    return (
      <div
        ref={cardRef}
        className={`
          p-3 bg-white dark:bg-slate-800 
          border-y first:border-t-0 ${isLast ? '' : 'border-b'} border-slate-200 dark:border-slate-700
          shadow-lg z-10 relative -my-px
        `}
        onClick={e => e.stopPropagation()}
      >
        <div className="space-y-3">
          {/* Header Row: Name & Star */}
          <div className="flex items-start gap-2">
            <div className="flex-grow space-y-1">
              {/* Name Input */}
              <div>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Full Name"
                  className={`
                    w-full px-2 py-1 text-sm font-medium border rounded
                    focus:outline-none focus:ring-1 focus:ring-blue-500
                    bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100
                    ${errors.name ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}
                  `}
                />
                {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
              </div>

              {/* Title Input */}
              <input
                type="text"
                value={formData.title}
                onChange={e => handleChange('title', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Job Title"
                className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded
                  focus:outline-none focus:ring-1 focus:ring-blue-500
                  bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              />
            </div>

            {/* Star Toggle */}
            <button
              onClick={() => handleChange('is_starred', !formData.is_starred)}
              className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                formData.is_starred ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'
              }`}
              title={formData.is_starred ? 'Remove star' : 'Mark as starred'}
            >
              <Star size={18} fill={formData.is_starred ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Contact Details */}
          <div className="space-y-2 pt-1">
            <input
              type="text"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Email"
              className={`
                w-full px-2 py-1 text-xs border rounded
                focus:outline-none focus:ring-1 focus:ring-blue-500
                bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300
                ${errors.email ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}
              `}
            />
            {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}

            <input
              type="text"
              value={formData.phone}
              onChange={e => handleChange('phone', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Phone"
              className="w-full px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded
                focus:outline-none focus:ring-1 focus:ring-blue-500
                bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded shadow-sm transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-2 py-1 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium rounded transition-colors"
              >
                Cancel
              </button>
            </div>

            {onOpenFullEdit && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onOpenFullEdit(person);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                More Options...
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. READ MODE VIEW (Standard Card)
  return (
    <div
      className={`
        px-3 py-3 lg:py-2 cursor-pointer
        hover:bg-slate-50 dark:hover:bg-slate-700 
        active:bg-slate-100 dark:active:bg-slate-600
        transition-colors touch-manipulation group relative
        flex items-center gap-2.5
        ${!isLast ? 'border-b border-slate-100 dark:border-slate-700' : ''}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title="Double-click to quick edit"
    >
      {/* Initials Avatar */}
      <div className="flex-shrink-0">
        <div
          className="w-9 h-9 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
          flex items-center justify-center text-white font-semibold text-xs shadow-sm"
        >
          {initials}
        </div>
      </div>

      {/* Name and Title */}
      <div className="flex-grow min-w-0">
        <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
          {person.name}
          {person.is_starred && (
            <Star size={12} className="text-amber-400 flex-shrink-0" fill="currentColor" />
          )}
        </div>
        {person.title && (
          <div className="text-xs text-slate-600 dark:text-slate-400 truncate">{person.title}</div>
        )}
      </div>

      {/* Quick Edit Hover Icon (Desktop only) */}
      {!isEditing && onEditStart && (
        <div
          className="hidden group-hover:flex absolute right-10 top-1/2 -translate-y-1/2 
            p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-600
            text-slate-400 hover:text-blue-600 hover:border-blue-200"
          onClick={e => {
            e.stopPropagation();
            onEditStart(person.id);
          }}
          title="Quick Edit"
        >
          <MoreHorizontal size={14} />
        </div>
      )}

      {/* Chevron */}
      <div className="flex-shrink-0">
        <ChevronRight size={18} className="lg:w-4 lg:h-4 text-slate-400" />
      </div>
    </div>
  );
});

export default EditablePersonCard;
