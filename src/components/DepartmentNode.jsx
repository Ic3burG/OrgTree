import { memo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const nodeRef = useRef(null);

  const handleHeaderClick = (e) => {
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand();
    }
  };

  // Calculate tooltip position in viewport coordinates
  const updateTooltipPosition = () => {
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 12 // 12px gap below node
      });
    }
  };

  // Show tooltip after 500ms delay to avoid flashing on quick mouse passes
  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      updateTooltipPosition();
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

  // Update tooltip position when hovered (in case of canvas pan/zoom)
  useEffect(() => {
    if (isHovered && description) {
      updateTooltipPosition();

      // Update position on scroll or resize
      const handleUpdate = () => updateTooltipPosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);

      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isHovered, description]);

  return (
    <>
      <div
        ref={nodeRef}
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
    </div>

    {/* Tooltip - rendered via Portal to ensure it appears above all other elements */}
    {isHovered && description && createPortal(
      <div
        className="fixed z-[9999] transition-all duration-150 ease-out"
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`,
          transform: 'translateX(-50%)',
          pointerEvents: 'auto'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        <DepartmentTooltip
          description={description}
          depthColor={colors}
          placement="bottom"
        />
      </div>,
      document.body
    )}
    </>
  );
}

// Memo to prevent unnecessary re-renders
export default memo(DepartmentNode);
