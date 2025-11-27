import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Folder, FolderOpen, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { getDepthColors } from '../utils/colors';
import PersonRowCard from './PersonRowCard';

/**
 * DepartmentNode - Custom React Flow node for departments
 * Displays department info and can expand to show people
 */
function DepartmentNode({ data, selected }) {
  const { name, depth, people, isExpanded, onToggleExpand, onSelectPerson, isHighlighted } = data;
  const colors = getDepthColors(depth);
  const peopleCount = people?.length || 0;

  const handleHeaderClick = (e) => {
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand();
    }
  };

  return (
    <div
      className={`
        rounded-lg shadow-lg transition-all duration-200
        ${isHighlighted ? 'ring-4 ring-blue-400 ring-opacity-75' : ''}
        ${selected ? 'ring-2 ring-blue-500' : ''}
      `}
      style={{
        width: isExpanded ? '280px' : '220px',
        backgroundColor: 'white'
      }}
    >
      {/* Top handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#94a3b8', width: 10, height: 10 }}
      />

      {/* Department Header */}
      <div
        className={`${colors.bg} ${colors.text} rounded-t-lg p-3 cursor-pointer
          hover:opacity-90 transition-opacity`}
        onClick={handleHeaderClick}
      >
        <div className="flex items-center gap-2 mb-2">
          {isExpanded ? (
            <FolderOpen size={18} className="flex-shrink-0" />
          ) : (
            <Folder size={18} className="flex-shrink-0" />
          )}
          <span className="font-semibold text-sm leading-tight flex-grow">
            {name}
          </span>
          {isExpanded ? (
            <ChevronUp size={16} className="flex-shrink-0" />
          ) : (
            <ChevronDown size={16} className="flex-shrink-0" />
          )}
        </div>

        {/* People count */}
        <div className="flex items-center gap-1.5 text-xs opacity-90">
          <Users size={14} />
          <span>
            {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
          </span>
        </div>
      </div>

      {/* Expanded People List */}
      {isExpanded && peopleCount > 0 && (
        <div className="bg-white rounded-b-lg border-t border-slate-200">
          <div className="max-h-96 overflow-y-auto">
            {people.map((person, index) => (
              <PersonRowCard
                key={person.id}
                person={person}
                onSelect={onSelectPerson}
                isLast={index === people.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom handle for outgoing connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#94a3b8', width: 10, height: 10 }}
      />
    </div>
  );
}

// Memo to prevent unnecessary re-renders
export default memo(DepartmentNode);
