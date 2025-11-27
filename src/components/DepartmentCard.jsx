import { ChevronRight, Folder, FolderOpen, Users } from 'lucide-react';
import { getDepthColors } from '../utils/colors';
import { getChildCounts } from '../utils/filterTree';
import PersonCard from './PersonCard';

/**
 * DepartmentCard - Expandable card for departments
 * Shows department name, child count, and recursive children
 */
export default function DepartmentCard({
  department,
  isExpanded,
  onToggle,
  expandedNodes,
  onPersonSelect,
  searchQuery
}) {
  const colors = getDepthColors(department.depth);
  const counts = getChildCounts(department);
  const hasChildren = department.children && department.children.length > 0;

  // Separate children into departments and people
  const childDepartments = department.children?.filter(c => c.type === 'department') || [];
  const childPeople = department.children?.filter(c => c.type === 'person') || [];

  // Count display
  const countText = [];
  if (counts.departments > 0) countText.push(`${counts.departments} dept${counts.departments > 1 ? 's' : ''}`);
  if (counts.people > 0) countText.push(`${counts.people} ${counts.people > 1 ? 'people' : 'person'}`);

  const handleClick = (e) => {
    console.log('🟢 DepartmentCard clicked:', department.path, 'depth:', department.depth);
    e.stopPropagation();
    onToggle(department.path);
  };

  return (
    <div className="mb-2">
      {/* Department Header */}
      <button
        className={`w-full ${colors.bg} ${colors.text} ${colors.hover} rounded-lg p-3
          flex items-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
        `}
        onClick={handleClick}
        aria-expanded={isExpanded}
        aria-label={`${department.name}, ${countText.join(', ')}. ${isExpanded ? 'Expanded' : 'Collapsed'}`}
      >
        {/* Chevron Icon */}
        <ChevronRight
          size={20}
          className={`flex-shrink-0 transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />

        {/* Folder Icon */}
        {isExpanded ? (
          <FolderOpen size={20} className="flex-shrink-0" />
        ) : (
          <Folder size={20} className="flex-shrink-0" />
        )}

        {/* Department Name */}
        <span
          className="flex-grow text-left font-semibold truncate"
          dangerouslySetInnerHTML={{ __html: department.highlightedName || department.name }}
        />

        {/* Count Badge */}
        {hasChildren && (
          <div className={`flex items-center gap-2 ${colors.text} opacity-90`}>
            <Users size={16} />
            <span className="text-sm font-medium">
              {countText.join(', ')}
            </span>
          </div>
        )}
      </button>

      {/* Children Container */}
      {isExpanded && hasChildren && (
        <div className="mt-2 ml-6 pl-4 border-l-2 border-slate-300 space-y-2">
          {/* Child Departments */}
          {childDepartments.map(childDept => (
            <DepartmentCard
              key={childDept.path}
              department={childDept}
              isExpanded={expandedNodes.has(childDept.path)}
              onToggle={onToggle}
              expandedNodes={expandedNodes}
              onPersonSelect={onPersonSelect}
              searchQuery={searchQuery}
            />
          ))}

          {/* Child People */}
          {childPeople.map(person => (
            <PersonCard
              key={person.path}
              person={person}
              depth={department.depth}
              onSelect={onPersonSelect}
              isHighlighted={person.isMatch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
