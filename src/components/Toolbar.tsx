import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  ArrowRight,
  Palette,
  Moon,
  Sun,
  RotateCcw,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ThemePicker from './ThemePicker';

interface ToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onToggleLayout: () => void;
  layoutDirection: 'TB' | 'LR';
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  onResetLayout: () => void;
}

/**
 * Toolbar - Floating controls for org map interactions
 * Mobile: bottom-right with compact buttons (above bottom nav)
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
  onThemeChange,
  onResetLayout,
}: ToolbarProps): React.JSX.Element {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  // Mobile: compact buttons, bottom positioning
  // Desktop: standard buttons, top positioning
  const buttonClass = `
    p-2 lg:p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg
    hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500
    transition-all duration-150 shadow-md lg:shadow-sm hover:shadow-lg lg:hover:shadow-md
    focus:outline-none focus:ring-2 focus:ring-blue-400
    disabled:opacity-50 disabled:cursor-not-allowed
    group relative
    touch-manipulation
  `;

  const Tooltip = ({ children }: { children: React.ReactNode }) => (
    <span
      className="hidden lg:inline absolute right-full mr-2 px-2 py-1 bg-slate-800 text-white text-xs
      rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity
      pointer-events-none z-50"
    >
      {children}
    </span>
  );

  return (
    <div className="absolute bottom-20 right-4 lg:bottom-auto lg:top-4 lg:right-4 z-10 flex flex-col items-end gap-1.5 lg:gap-2">
      {/* Zoom In */}
      <button onClick={onZoomIn} className={buttonClass} aria-label="Zoom in">
        <ZoomIn size={20} className="lg:w-5 lg:h-5 text-slate-700 dark:text-slate-200" />
        <Tooltip>Zoom In</Tooltip>
      </button>

      {/* Zoom Out */}
      <button onClick={onZoomOut} className={buttonClass} aria-label="Zoom out">
        <ZoomOut size={20} className="lg:w-5 lg:h-5 text-slate-700 dark:text-slate-200" />
        <Tooltip>Zoom Out</Tooltip>
      </button>

      {/* Fit View */}
      <button onClick={onFitView} className={buttonClass} aria-label="Fit view">
        <Maximize2 size={20} className="lg:w-5 lg:h-5 text-slate-700 dark:text-slate-200" />
        <Tooltip>Fit to Screen</Tooltip>
      </button>

      {/* Divider */}
      <div className="h-px bg-slate-300 dark:bg-slate-600 my-0.5" />

      {/* Reset Layout */}
      <button onClick={onResetLayout} className={buttonClass} aria-label="Reset layout">
        <RotateCcw size={20} className="lg:w-5 lg:h-5 text-slate-700 dark:text-slate-200" />
        <Tooltip>Reset Layout</Tooltip>
      </button>

      {/* Divider */}
      <div className="h-px bg-slate-300 dark:bg-slate-600 my-0.5" />

      {/* Expand All */}
      <button onClick={onExpandAll} className={buttonClass} aria-label="Expand all departments">
        <ChevronDown size={20} className="lg:w-5 lg:h-5 text-slate-700 dark:text-slate-200" />
        <Tooltip>Expand All</Tooltip>
      </button>

      {/* Collapse All */}
      <button onClick={onCollapseAll} className={buttonClass} aria-label="Collapse all departments">
        <ChevronUp size={20} className="lg:w-5 lg:h-5 text-slate-700 dark:text-slate-200" />
        <Tooltip>Collapse All</Tooltip>
      </button>

      {/* Divider */}
      <div className="h-px bg-slate-300 dark:bg-slate-600 my-0.5" />

      {/* Layout Direction Toggle */}
      <button
        onClick={onToggleLayout}
        className={buttonClass}
        aria-label={`Switch to ${layoutDirection === 'TB' ? 'horizontal' : 'vertical'} layout`}
      >
        {layoutDirection === 'TB' ? (
          <>
            <ArrowRight size={20} className="lg:w-5 lg:h-5 text-slate-700 dark:text-slate-200" />
            <Tooltip>Horizontal Layout</Tooltip>
          </>
        ) : (
          <>
            <ArrowDown size={20} className="lg:w-5 lg:h-5 text-slate-700 dark:text-slate-200" />
            <Tooltip>Vertical Layout</Tooltip>
          </>
        )}
      </button>

      {/* Divider */}
      <div className="h-px bg-slate-300 dark:bg-slate-600 my-0.5" />

      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className={buttonClass}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? (
          <Sun size={20} className="lg:w-5 lg:h-5 text-slate-700 dark:text-slate-200" />
        ) : (
          <Moon size={20} className="lg:w-5 lg:h-5 text-slate-700 dark:text-slate-200" />
        )}
        <Tooltip>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</Tooltip>
      </button>

      {/* Theme Picker - Collapsible */}
      <div className="relative">
        <button
          onClick={() => setIsThemeOpen(!isThemeOpen)}
          className={buttonClass}
          aria-label="Change theme"
        >
          <Palette size={20} className="lg:w-5 lg:h-5 text-slate-700 dark:text-slate-200" />
          <Tooltip>Theme</Tooltip>
        </button>

        {/* Theme Drawer */}
        {isThemeOpen && (
          <>
            {/* Backdrop for mobile */}
            <div
              className="fixed inset-0 z-40 lg:hidden"
              onClick={() => setIsThemeOpen(false)}
              aria-hidden="true"
            />

            {/* Theme options */}
            <div className="absolute right-full mr-2 top-0 z-50 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-3 shadow-xl animate-in slide-in-from-right-2 duration-200">
              <ThemePicker
                currentTheme={currentTheme}
                onThemeChange={(theme: string) => {
                  onThemeChange(theme);
                  setIsThemeOpen(false);
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
