import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemePicker from './ThemePicker';

/**
 * Toolbar - Floating controls for org map interactions
 * Mobile: bottom-right with larger buttons (above bottom nav)
 * Desktop: top-right with standard buttons
 */
export default function Toolbar({
  onZoomIn,
  onZoomOut,
  onFitView,
  onExpandAll,
  onCollapseAll,
  onToggleLayout,
  layoutDirection,
  currentTheme,
  onThemeChange
}) {
  const { user, logout } = useAuth();

  // Mobile: larger buttons, bottom positioning
  // Desktop: standard buttons, top positioning
  const buttonClass = `
    p-3 lg:p-2.5 bg-white border border-slate-300 rounded-full lg:rounded-lg
    hover:bg-slate-50 hover:border-slate-400
    transition-all duration-150 shadow-lg lg:shadow-sm hover:shadow-xl lg:hover:shadow-md
    focus:outline-none focus:ring-2 focus:ring-blue-400
    disabled:opacity-50 disabled:cursor-not-allowed
    group relative
    touch-manipulation
  `;

  const Tooltip = ({ children }) => (
    <span className="hidden lg:inline absolute right-full mr-2 px-2 py-1 bg-slate-800 text-white text-xs
      rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity
      pointer-events-none z-50">
      {children}
    </span>
  );

  return (
    <div className="absolute bottom-20 right-4 lg:bottom-auto lg:top-4 lg:right-4 z-10 flex flex-col gap-2 lg:gap-2">
      {/* Zoom In */}
      <button
        onClick={onZoomIn}
        className={buttonClass}
        aria-label="Zoom in"
      >
        <ZoomIn size={24} className="lg:w-5 lg:h-5 text-slate-700" />
        <Tooltip>Zoom In</Tooltip>
      </button>

      {/* Zoom Out */}
      <button
        onClick={onZoomOut}
        className={buttonClass}
        aria-label="Zoom out"
      >
        <ZoomOut size={24} className="lg:w-5 lg:h-5 text-slate-700" />
        <Tooltip>Zoom Out</Tooltip>
      </button>

      {/* Fit View */}
      <button
        onClick={onFitView}
        className={buttonClass}
        aria-label="Fit view"
      >
        <Maximize2 size={24} className="lg:w-5 lg:h-5 text-slate-700" />
        <Tooltip>Fit to Screen</Tooltip>
      </button>

      {/* Divider */}
      <div className="h-px bg-slate-300 my-1" />

      {/* Expand All */}
      <button
        onClick={onExpandAll}
        className={buttonClass}
        aria-label="Expand all departments"
      >
        <ChevronDown size={24} className="lg:w-5 lg:h-5 text-slate-700" />
        <Tooltip>Expand All</Tooltip>
      </button>

      {/* Collapse All */}
      <button
        onClick={onCollapseAll}
        className={buttonClass}
        aria-label="Collapse all departments"
      >
        <ChevronUp size={24} className="lg:w-5 lg:h-5 text-slate-700" />
        <Tooltip>Collapse All</Tooltip>
      </button>

      {/* Divider */}
      <div className="h-px bg-slate-300 my-1" />

      {/* Layout Direction Toggle */}
      <button
        onClick={onToggleLayout}
        className={buttonClass}
        aria-label={`Switch to ${layoutDirection === 'TB' ? 'horizontal' : 'vertical'} layout`}
      >
        {layoutDirection === 'TB' ? (
          <>
            <ArrowRight size={24} className="lg:w-5 lg:h-5 text-slate-700" />
            <Tooltip>Horizontal Layout</Tooltip>
          </>
        ) : (
          <>
            <ArrowDown size={24} className="lg:w-5 lg:h-5 text-slate-700" />
            <Tooltip>Vertical Layout</Tooltip>
          </>
        )}
      </button>

      {/* Divider */}
      <div className="h-px bg-slate-300 my-1" />

      {/* Theme Picker */}
      <div className="bg-white border border-slate-300 rounded-full lg:rounded-lg p-2 shadow-lg lg:shadow-sm">
        <ThemePicker currentTheme={currentTheme} onThemeChange={onThemeChange} />
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-300 my-1" />

      {/* Logout Button */}
      <button
        onClick={logout}
        className={buttonClass}
        aria-label={`Logout (${user?.name})`}
        title={`Logout (${user?.name})`}
      >
        <LogOut size={24} className="lg:w-5 lg:h-5 text-slate-700" />
        <Tooltip>Logout {user?.name && `(${user.name})`}</Tooltip>
      </button>
    </div>
  );
}
