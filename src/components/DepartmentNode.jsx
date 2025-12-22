import { memo, useState, useRef, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from 'reactflow';
import { Folder, FolderOpen, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { getDepthColors } from '../utils/colors';
import { ThemeContext } from './OrgMap';
import PersonRowCard from './PersonRowCard';
import DepartmentTooltip from './DepartmentTooltip';

/**
 * DepartmentNode - Custom React Flow node for departments
 * Displays department info and can expand to show people
 * Mobile: Larger touch targets, no tooltips on hover
 * Desktop: Standard size with hover tooltips
 */
function DepartmentNode({ data, selected }) {
  const { name, depth, people, description, isExpanded, onToggleExpand, onSelectPerson, isHighlighted, theme: dataTheme } = data;
  const contextTheme = useContext(ThemeContext);
  // Use theme from data if provided (for memoized nodes), otherwise fall back to context
  const theme = dataTheme || contextTheme;
  const colors = getDepthColors(depth, theme);
  const peopleCount = people?.length || 0;

  // Hover state for tooltip (disabled on touch devices)
  const [isHovered, setIsHovered] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [leaveTimeout, setLeaveTimeout] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const headerRef = useRef(null);

  // Detect touch device
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleHeaderClick = (e) => {
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand();
    }
  };

  // Calculate tooltip position in viewport coordinates
  const updateTooltipPosition = () => {
    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 12 // 12px gap below header
      });
    }
  };

  // Show tooltip after 500ms delay to avoid flashing on quick mouse passes
  // Disabled on touch devices
  const handleMouseEnter = () => {
    if (isTouchDevice) return;

    // Clear any pending leave timeout
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
      setLeaveTimeout(null);
    }

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

    // Small delay before hiding tooltip to allow moving mouse to tooltip
    const timeout = setTimeout(() => {
      setIsHovered(false);
    }, 150);
    setLeaveTimeout(timeout);
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      if (leaveTimeout) clearTimeout(leaveTimeout);
    };
  }, [hoverTimeout, leaveTimeout]);

  return (
    <>
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
      >
      {/* Top handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#94a3b8', width: 10, height: 10 }}
      />

      {/* Department Header */}
      <div
        ref={headerRef}
        className={`${colors.bg} ${colors.text} rounded-t-lg p-4 lg:p-3 cursor-pointer
          hover:opacity-90 transition-opacity touch-manipulation active:opacity-75`}
        onClick={handleHeaderClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center gap-2 mb-2">
          {isExpanded ? (
            <FolderOpen size={20} className="lg:w-[18px] lg:h-[18px] flex-shrink-0" />
          ) : (
            <Folder size={20} className="lg:w-[18px] lg:h-[18px] flex-shrink-0" />
          )}
          <span className="font-semibold text-sm lg:text-sm leading-tight flex-grow">
            {name}
          </span>
          {isExpanded ? (
            <ChevronUp size={18} className="lg:w-4 lg:h-4 flex-shrink-0" />
          ) : (
            <ChevronDown size={18} className="lg:w-4 lg:h-4 flex-shrink-0" />
          )}
        </div>

        {/* People count */}
        <div className="flex items-center gap-1.5 text-xs lg:text-xs opacity-90">
          <Users size={16} className="lg:w-[14px] lg:h-[14px]" />
          <span>
            {peopleCount} {peopleCount === 1 ? 'person' : 'people'}
          </span>
        </div>
      </div>

      {/* Expanded People List */}
      {isExpanded && peopleCount > 0 && (
        <div className="bg-white rounded-b-lg border-t border-slate-200">
          <div className="max-h-96 overflow-y-auto touch-pan-y">
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
