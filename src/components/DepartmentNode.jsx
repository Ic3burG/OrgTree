import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Folder, FolderOpen, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { getDepthColors } from '../utils/colors';
import PersonRowCard from './PersonRowCard';
import DepartmentTooltip from './DepartmentTooltip';

/**
 * DepartmentNode - Custom React Flow node for departments
 * Displays department info and can expand to show people
 */
function DepartmentNode({ data, selected }) {
  const { name, depth, people, description, isExpanded, onToggleExpand, onSelectPerson, isHighlighted } = data;
  const colors = getDepthColors(depth);
  const peopleCount = people?.length || 0;

  // Hover state for tooltip
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);

  const handleHeaderClick = (e) => {
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand();
    }
  };

  // Show tooltip after 500ms delay to avoid flashing on quick mouse passes
  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setIsHovered(true);
    }, 500);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setIsHovered(false);
  };

  return (
    <div
      className={`
        rounded-lg shadow-lg transition-all duration-200 relative
        ${isHighlighted ? 'ring-4 ring-blue-400 ring-opacity-75' : ''}
        ${selected ? 'ring-2 ring-blue-500' : ''}
      `}
      style={{
        width: isExpanded ? '280px' : '220px',
        backgroundColor: 'white'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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

      {/* Tooltip - show when hovered and description exists */}
      {isHovered && description && (
        <div
          className={`
            absolute left-1/2 -translate-x-1/2 top-full mt-3 z-50
            transition-all duration-150 ease-out
            ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
          `}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
        >
          <DepartmentTooltip
            description={description}
            depthColor={colors}
            placement="bottom"
          />
        </div>
      )}
    </div>
  );
}

// Memo to prevent unnecessary re-renders
export default memo(DepartmentNode);
