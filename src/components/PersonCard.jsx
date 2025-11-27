import { User } from 'lucide-react';
import { getInitials } from '../utils/filterTree';
import { getPersonCardColor } from '../utils/colors';
import ContactIcons from './ContactIcons';

/**
 * PersonCard - Contact card for individual people
 * Displays avatar, name, title, and contact information
 */
export default function PersonCard({ person, depth, onSelect, isHighlighted }) {
  const initials = getInitials(person.name);
  const bgColor = getPersonCardColor(depth);

  return (
    <div
      className={`${bgColor} border border-slate-200 rounded-lg p-3 cursor-pointer
        transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
        ${isHighlighted ? 'ring-2 ring-blue-400' : ''}
      `}
      onClick={() => onSelect(person)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(person);
        }
      }}
      aria-label={`View details for ${person.name}, ${person.title}`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
            {initials}
          </div>
        </div>

        {/* Name and Title */}
        <div className="flex-grow min-w-0">
          <div
            className="font-semibold text-slate-900 truncate"
            dangerouslySetInnerHTML={{ __html: person.highlightedName || person.name }}
          />
          <div
            className="text-sm text-slate-600 truncate"
            dangerouslySetInnerHTML={{ __html: person.highlightedTitle || person.title }}
          />
        </div>

        {/* Contact Icons */}
        <div className="flex-shrink-0">
          <ContactIcons
            email={person.email}
            phone={person.phone}
            office={person.office}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
