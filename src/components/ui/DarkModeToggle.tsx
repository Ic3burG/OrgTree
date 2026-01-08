import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface DarkModeToggleProps {
  className?: string;
}

/**
 * DarkModeToggle - Reusable dark mode toggle button
 * Shows sun icon in dark mode, moon icon in light mode
 */
export default function DarkModeToggle({ className = '' }: DarkModeToggleProps): React.JSX.Element {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <button
      onClick={toggleDarkMode}
      className={`p-2 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${className}`}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <Sun size={20} className="text-slate-400 hover:text-slate-300 transition-colors" />
      ) : (
        <Moon size={20} className="text-slate-600 hover:text-slate-700 transition-colors" />
      )}
    </button>
  );
}
