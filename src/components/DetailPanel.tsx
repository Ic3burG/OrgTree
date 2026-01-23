import React from 'react';
import { X, Mail, Phone, Building, Info, Pencil, Star } from 'lucide-react';
import { getInitials } from '../utils/helpers';
import type { Person, CustomFieldDefinition, Department } from '../types/index.js';
import OrganizationalHierarchy from './OrganizationalHierarchy';
import InlineEdit from './ui/InlineEdit';
import { buildHierarchyChain } from '../utils/departmentHierarchy';

interface DetailPanelProps {
  person: Person | null;
  onClose: () => void;
  fieldDefinitions?: CustomFieldDefinition[];
  onEdit?: (person: Person) => void;
  onUpdate?: (personId: string, updates: Partial<Person>) => Promise<void>;
  departments?: Department[];
  onNavigateToDepartment?: (departmentId: string) => void;
}

/**
 * DetailPanel - Slide-in panel showing full person details
 * Mobile: Full-screen overlay from right
 * Desktop: Side panel with max width
 */
export default function DetailPanel({
  person,
  onClose,
  fieldDefinitions = [],
  onEdit,
  onUpdate,
  departments,
  onNavigateToDepartment,
}: DetailPanelProps): React.JSX.Element | null {
  if (!person) return null;

  const initials = getInitials(person.name);

  // Get department path for display (if available)
  const personWithPath = person as Person & { path?: string };
  const pathSegments = personWithPath.path ? personWithPath.path.split('/').filter(Boolean) : [];
  const departmentPath = pathSegments.length > 1 ? pathSegments.slice(0, -1).join(' / ') : null;

  // Build hierarchy if departments are available
  const hierarchy = departments ? buildHierarchyChain(person.department_id, departments) : [];

  // Filter and pair custom field definitions with values
  const personFieldDefs = fieldDefinitions.filter(d => d.entity_type === 'person');
  const activeCustomFields = personFieldDefs
    .map(def => ({
      def,
      value: person.custom_fields?.[def.field_key] || person.custom_fields?.[def.id],
    }))
    .filter(f => f.value && f.value.trim() !== '');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full lg:max-w-md bg-white dark:bg-slate-800 shadow-2xl z-50
          overflow-y-auto animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-panel-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 lg:p-6 flex items-center justify-between">
          <h2
            id="detail-panel-title"
            className="text-lg lg:text-xl font-bold text-slate-900 dark:text-slate-100"
          >
            Contact Details
          </h2>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(person)}
                className="p-2.5 lg:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors touch-manipulation"
                aria-label="Edit contact"
                title="Edit contact"
              >
                <Pencil size={20} className="text-slate-600 dark:text-slate-300" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2.5 lg:p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors touch-manipulation"
              aria-label="Close panel"
            >
              <X size={24} className="text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6 space-y-6">
          {/* Avatar and Name */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div
                className={`w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
                flex items-center justify-center text-white font-bold text-2xl lg:text-3xl shadow-lg mb-4 ${
                  onUpdate ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
                }`}
                onClick={() => {
                  if (onUpdate) {
                    onUpdate(person.id, { is_starred: !person.is_starred });
                  }
                }}
                title={onUpdate ? (person.is_starred ? 'Remove star' : 'Star contact') : undefined}
              >
                {initials}
              </div>
              <div
                className={`absolute -top-1 -right-1 rounded-full p-1.5 shadow-lg cursor-pointer transition-colors ${
                  person.is_starred
                    ? 'bg-amber-400 hover:bg-amber-500'
                    : 'bg-slate-200 dark:bg-slate-600 hover:bg-amber-200'
                } ${!person.is_starred && !onUpdate ? 'hidden' : ''}`}
                onClick={e => {
                  e.stopPropagation();
                  if (onUpdate) {
                    onUpdate(person.id, { is_starred: !person.is_starred });
                  }
                }}
              >
                <Star
                  size={14}
                  className={
                    person.is_starred ? 'text-white' : 'text-slate-400 dark:text-slate-300'
                  }
                  fill={person.is_starred ? 'currentColor' : 'none'}
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 w-full">
              {onUpdate ? (
                <InlineEdit
                  value={person.name}
                  onSave={async val => onUpdate(person.id, { name: val })}
                  label="Name"
                  className="font-bold text-xl lg:text-2xl text-slate-900 dark:text-slate-100 justify-center text-center"
                />
              ) : (
                <h3 className="text-xl lg:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {person.name}
                </h3>
              )}

              {onUpdate ? (
                <InlineEdit
                  value={person.title || ''}
                  onSave={async val => onUpdate(person.id, { title: val })}
                  label="Title"
                  placeholder="Add job title"
                  className="text-base lg:text-lg text-slate-600 dark:text-slate-400 justify-center text-center"
                />
              ) : (
                <p className="text-base lg:text-lg text-slate-600 dark:text-slate-400 mt-1">
                  {person.title}
                </p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Contact Information
            </h4>

            {person.email && (
              <div className="flex items-start gap-3">
                <Mail
                  size={20}
                  className="text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0"
                />
                <div className="flex-grow">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">Email</p>
                  {onUpdate ? (
                    <InlineEdit
                      value={person.email || ''}
                      onSave={async val => onUpdate(person.id, { email: val })}
                      label="Email"
                      type="email"
                      placeholder="Add email address"
                      className="text-blue-600 dark:text-blue-400"
                    />
                  ) : (
                    <a
                      href={`mailto:${person.email}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline break-all touch-manipulation"
                    >
                      {person.email}
                    </a>
                  )}
                </div>
              </div>
            )}

            {person.phone && (
              <div className="flex items-start gap-3">
                <Phone
                  size={20}
                  className="text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0"
                />
                <div className="flex-grow">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">Phone</p>
                  {onUpdate ? (
                    <InlineEdit
                      value={person.phone || ''}
                      onSave={async val => onUpdate(person.id, { phone: val })}
                      label="Phone"
                      type="tel"
                      placeholder="Add phone number"
                      className="text-blue-600 dark:text-blue-400"
                    />
                  ) : (
                    <a
                      href={`tel:${person.phone}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline touch-manipulation"
                    >
                      {person.phone}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Custom Fields */}
          {activeCustomFields.length > 0 && (
            <div className="space-y-4 bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Additional Information
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {activeCustomFields.map(({ def, value }) => (
                  <div key={def.id} className="flex items-start gap-3">
                    <Info
                      size={20}
                      className="text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-grow">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">
                        {def.name}
                      </p>
                      <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words min-h-[1.5rem]">
                        {onUpdate ? (
                          <InlineEdit
                            value={value || ''}
                            onSave={async val => {
                              const newCustomFields = { ...person.custom_fields, [def.id]: val };
                              await onUpdate(person.id, { custom_fields: newCustomFields });
                            }}
                            label={def.name}
                            type={def.field_type === 'text' ? 'textarea' : 'text'}
                            placeholder={`Add ${def.name}`}
                          />
                        ) : def.field_type === 'url' ? (
                          <a
                            href={value?.startsWith('http') ? value : `https://${value}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {value}
                          </a>
                        ) : (
                          value
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Department Path or Hierarchy */}
          {hierarchy.length > 0 ? (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building size={18} className="text-slate-500 dark:text-slate-400" />
                Organizational Hierarchy
              </h4>
              <OrganizationalHierarchy
                hierarchy={hierarchy}
                currentDepartmentId={person.department_id}
                onNavigate={onNavigateToDepartment}
                showIcons={true}
              />
            </div>
          ) : departmentPath ? (
            <div className="space-y-2 bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Department</h4>
              <div className="flex items-start gap-3">
                <Building
                  size={20}
                  className="text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0"
                />
                <p className="text-slate-700 dark:text-slate-300">{departmentPath}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
