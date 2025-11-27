import { ChevronRight } from 'lucide-react';
import { getInitials } from '../utils/helpers';

/**
 * PersonRowCard - Compact person card for display inside department nodes
 * Shown when a department is expanded
 */
export default function PersonRowCard({ person, onSelect, isLast }) {
  const initials = getInitials(person.name);

  const handleClick = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(person);
    }
  };

  return (
    <div
      className={`
        px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors
        flex items-center gap-2.5
        ${!isLast ? 'border-b border-slate-100' : ''}
      `}
      onClick={handleClick}
    >
      {/* Initials Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
          flex items-center justify-center text-white font-semibold text-xs shadow-sm">
          {initials}
        </div>
      </div>

      {/* Name and Title */}
      <div className="flex-grow min-w-0">
        <div className="font-medium text-sm text-slate-900 truncate">
          {person.name}
        </div>
        {person.title && (
          <div className="text-xs text-slate-600 truncate">
            {person.title}
          </div>
        )}
      </div>

      {/* Chevron */}
      <div className="flex-shrink-0">
        <ChevronRight size={16} className="text-slate-400" />
      </div>
    </div>
  );
}
