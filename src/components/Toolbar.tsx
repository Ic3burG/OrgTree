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
  Wrench,
  X,
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

interface ToolbarButtonProps {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  className?: string;
}

/**
 * Toolbar - Floating controls for org map interactions
 * Mobile: collapsible FAB that expands into a grid panel (above bottom nav)
 * Desktop: vertical column at top-right with tooltips
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
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const buttonClass = `
    p-2 lg:p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg
    hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500
    transition-all duration-150 shadow-md lg:shadow-sm hover:shadow-lg lg:hover:shadow-md
    focus:outline-none focus:ring-2 focus:ring-blue-400
    disabled:opacity-50 disabled:cursor-not-allowed
    group relative
    touch-manipulation
  `;

  const mobileGridButtonClass = `
    flex flex-col items-center justify-center gap-1 p-3
    bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl
    active:bg-slate-100 dark:active:bg-slate-700
    transition-colors duration-100 touch-manipulation
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

  const MobileButton = ({ onClick, label, icon }: ToolbarButtonProps) => (
    <button
      onClick={() => {
        onClick();
        // Close panel after action (except for theme which has its own panel)
        if (label !== 'Theme') setIsMobileExpanded(false);
      }}
      className={mobileGridButtonClass}
      aria-label={label}
    >
      {icon}
      <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{label}</span>
    </button>
  );

  const iconClass = 'text-slate-700 dark:text-slate-200';

  return (
    <>
      {/* ── Mobile: FAB + expandable grid panel ── */}
      <div className="lg:hidden">
        {/* Backdrop */}
        {isMobileExpanded && (
          <div
            className="fixed inset-0 z-10 bg-black/20"
            onClick={() => {
              setIsMobileExpanded(false);
              setIsThemeOpen(false);
            }}
            aria-hidden="true"
          />
        )}

        {/* Expanded grid panel */}
        {isMobileExpanded && (
          <div className="absolute bottom-36 right-4 z-20 w-56 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="grid grid-cols-3 gap-1.5">
              <MobileButton
                onClick={onZoomIn}
                label="Zoom In"
                icon={<ZoomIn size={20} className={iconClass} />}
              />
              <MobileButton
                onClick={onZoomOut}
                label="Zoom Out"
                icon={<ZoomOut size={20} className={iconClass} />}
              />
              <MobileButton
                onClick={onFitView}
                label="Fit View"
                icon={<Maximize2 size={20} className={iconClass} />}
              />
              <MobileButton
                onClick={onResetLayout}
                label="Reset"
                icon={<RotateCcw size={20} className={iconClass} />}
              />
              <MobileButton
                onClick={onExpandAll}
                label="Expand"
                icon={<ChevronDown size={20} className={iconClass} />}
              />
              <MobileButton
                onClick={onCollapseAll}
                label="Collapse"
                icon={<ChevronUp size={20} className={iconClass} />}
              />
              <MobileButton
                onClick={onToggleLayout}
                label={layoutDirection === 'TB' ? 'Horizontal' : 'Vertical'}
                icon={
                  layoutDirection === 'TB' ? (
                    <ArrowRight size={20} className={iconClass} />
                  ) : (
                    <ArrowDown size={20} className={iconClass} />
                  )
                }
              />
              <MobileButton
                onClick={toggleDarkMode}
                label={isDarkMode ? 'Light' : 'Dark'}
                icon={
                  isDarkMode ? (
                    <Sun size={20} className={iconClass} />
                  ) : (
                    <Moon size={20} className={iconClass} />
                  )
                }
              />
              <MobileButton
                onClick={() => setIsThemeOpen(!isThemeOpen)}
                label="Theme"
                icon={<Palette size={20} className={iconClass} />}
              />
            </div>

            {/* Theme picker (inside grid panel on mobile) */}
            {isThemeOpen && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <ThemePicker
                  currentTheme={currentTheme}
                  onThemeChange={(theme: string) => {
                    onThemeChange(theme);
                    setIsThemeOpen(false);
                    setIsMobileExpanded(false);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* FAB toggle */}
        <button
          onClick={() => {
            setIsMobileExpanded(!isMobileExpanded);
            if (isMobileExpanded) setIsThemeOpen(false);
          }}
          className="absolute bottom-20 right-4 z-20 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg active:scale-95 transition-all duration-150 touch-manipulation"
          aria-label={isMobileExpanded ? 'Close toolbar' : 'Open toolbar'}
        >
          {isMobileExpanded ? <X size={22} /> : <Wrench size={22} />}
        </button>
      </div>

      {/* ── Desktop: vertical column (unchanged) ── */}
      <div className="hidden lg:flex absolute top-4 right-4 z-10 flex-col items-end gap-2">
        {/* Zoom In */}
        <button onClick={onZoomIn} className={buttonClass} aria-label="Zoom in">
          <ZoomIn size={20} className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          <Tooltip>Zoom In</Tooltip>
        </button>

        {/* Zoom Out */}
        <button onClick={onZoomOut} className={buttonClass} aria-label="Zoom out">
          <ZoomOut size={20} className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          <Tooltip>Zoom Out</Tooltip>
        </button>

        {/* Fit View */}
        <button onClick={onFitView} className={buttonClass} aria-label="Fit view">
          <Maximize2 size={20} className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          <Tooltip>Fit to Screen</Tooltip>
        </button>

        {/* Divider */}
        <div className="h-px w-full bg-slate-300 dark:bg-slate-600 my-0.5" />

        {/* Reset Layout */}
        <button onClick={onResetLayout} className={buttonClass} aria-label="Reset layout">
          <RotateCcw size={20} className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          <Tooltip>Reset Layout</Tooltip>
        </button>

        {/* Divider */}
        <div className="h-px w-full bg-slate-300 dark:bg-slate-600 my-0.5" />

        {/* Expand All */}
        <button onClick={onExpandAll} className={buttonClass} aria-label="Expand all departments">
          <ChevronDown size={20} className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          <Tooltip>Expand All</Tooltip>
        </button>

        {/* Collapse All */}
        <button
          onClick={onCollapseAll}
          className={buttonClass}
          aria-label="Collapse all departments"
        >
          <ChevronUp size={20} className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          <Tooltip>Collapse All</Tooltip>
        </button>

        {/* Divider */}
        <div className="h-px w-full bg-slate-300 dark:bg-slate-600 my-0.5" />

        {/* Layout Direction Toggle */}
        <button
          onClick={onToggleLayout}
          className={buttonClass}
          aria-label={`Switch to ${layoutDirection === 'TB' ? 'horizontal' : 'vertical'} layout`}
        >
          {layoutDirection === 'TB' ? (
            <>
              <ArrowRight size={20} className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              <Tooltip>Horizontal Layout</Tooltip>
            </>
          ) : (
            <>
              <ArrowDown size={20} className="w-5 h-5 text-slate-700 dark:text-slate-200" />
              <Tooltip>Vertical Layout</Tooltip>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="h-px w-full bg-slate-300 dark:bg-slate-600 my-0.5" />

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className={buttonClass}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? (
            <Sun size={20} className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          ) : (
            <Moon size={20} className="w-5 h-5 text-slate-700 dark:text-slate-200" />
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
            <Palette size={20} className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            <Tooltip>Theme</Tooltip>
          </button>

          {/* Theme Drawer */}
          {isThemeOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsThemeOpen(false)}
                aria-hidden="true"
              />
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
    </>
  );
}
