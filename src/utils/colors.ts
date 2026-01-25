/**
 * Depth-based color system for department cards
 * Supports multiple color themes
 */

interface ColorConfig {
  bg: string;
  hex: string;
  text: string;
  hover: string;
}

interface Theme {
  name: string;
  colors: ColorConfig[];
  swatch: string;
}

interface ThemeList {
  id: string;
  name: string;
  swatch: string;
}

const themes: Record<string, Theme> = {
  blue: {
    name: 'Blue',
    colors: [
      { bg: 'bg-blue-700', hex: '#1d4ed8', text: 'text-white', hover: 'hover:bg-blue-600' },
      { bg: 'bg-blue-600', hex: '#2563eb', text: 'text-white', hover: 'hover:bg-blue-500' },
      { bg: 'bg-blue-500', hex: '#3b82f6', text: 'text-white', hover: 'hover:bg-blue-400' },
      { bg: 'bg-blue-400', hex: '#60a5fa', text: 'text-blue-900', hover: 'hover:bg-blue-300' },
      { bg: 'bg-blue-300', hex: '#93c5fd', text: 'text-blue-900', hover: 'hover:bg-blue-200' },
    ],
    swatch: '#2563eb',
  },
  emerald: {
    name: 'Emerald',
    colors: [
      { bg: 'bg-emerald-700', hex: '#047857', text: 'text-white', hover: 'hover:bg-emerald-600' },
      { bg: 'bg-emerald-600', hex: '#059669', text: 'text-white', hover: 'hover:bg-emerald-500' },
      { bg: 'bg-emerald-500', hex: '#10b981', text: 'text-white', hover: 'hover:bg-emerald-400' },
      {
        bg: 'bg-emerald-400',
        hex: '#34d399',
        text: 'text-emerald-900',
        hover: 'hover:bg-emerald-300',
      },
      {
        bg: 'bg-emerald-300',
        hex: '#6ee7b7',
        text: 'text-emerald-900',
        hover: 'hover:bg-emerald-200',
      },
    ],
    swatch: '#059669',
  },
  violet: {
    name: 'Violet',
    colors: [
      { bg: 'bg-violet-700', hex: '#6d28d9', text: 'text-white', hover: 'hover:bg-violet-600' },
      { bg: 'bg-violet-600', hex: '#7c3aed', text: 'text-white', hover: 'hover:bg-violet-500' },
      { bg: 'bg-violet-500', hex: '#8b5cf6', text: 'text-white', hover: 'hover:bg-violet-400' },
      {
        bg: 'bg-violet-400',
        hex: '#a78bfa',
        text: 'text-violet-900',
        hover: 'hover:bg-violet-300',
      },
      {
        bg: 'bg-violet-300',
        hex: '#c4b5fd',
        text: 'text-violet-900',
        hover: 'hover:bg-violet-200',
      },
    ],
    swatch: '#7c3aed',
  },
  amber: {
    name: 'Amber',
    colors: [
      { bg: 'bg-amber-700', hex: '#b45309', text: 'text-white', hover: 'hover:bg-amber-600' },
      { bg: 'bg-amber-600', hex: '#d97706', text: 'text-white', hover: 'hover:bg-amber-500' },
      { bg: 'bg-amber-500', hex: '#f59e0b', text: 'text-white', hover: 'hover:bg-amber-400' },
      { bg: 'bg-amber-400', hex: '#fbbf24', text: 'text-amber-900', hover: 'hover:bg-amber-300' },
      { bg: 'bg-amber-300', hex: '#fcd34d', text: 'text-amber-900', hover: 'hover:bg-amber-200' },
    ],
    swatch: '#d97706',
  },
  rose: {
    name: 'Rose',
    colors: [
      { bg: 'bg-rose-700', hex: '#be123c', text: 'text-white', hover: 'hover:bg-rose-600' },
      { bg: 'bg-rose-600', hex: '#e11d48', text: 'text-white', hover: 'hover:bg-rose-500' },
      { bg: 'bg-rose-500', hex: '#f43f5e', text: 'text-white', hover: 'hover:bg-rose-400' },
      { bg: 'bg-rose-400', hex: '#fb7185', text: 'text-rose-900', hover: 'hover:bg-rose-300' },
      { bg: 'bg-rose-300', hex: '#fda4af', text: 'text-rose-900', hover: 'hover:bg-rose-200' },
    ],
    swatch: '#e11d48',
  },
  slate: {
    name: 'Slate',
    colors: [
      { bg: 'bg-slate-700', hex: '#334155', text: 'text-white', hover: 'hover:bg-slate-600' },
      { bg: 'bg-slate-600', hex: '#475569', text: 'text-white', hover: 'hover:bg-slate-500' },
      { bg: 'bg-slate-500', hex: '#64748b', text: 'text-white', hover: 'hover:bg-slate-400' },
      { bg: 'bg-slate-400', hex: '#94a3b8', text: 'text-slate-900', hover: 'hover:bg-slate-300' },
      { bg: 'bg-slate-300', hex: '#cbd5e1', text: 'text-slate-900', hover: 'hover:bg-slate-200' },
    ],
    swatch: '#475569',
  },
  rainbow: {
    name: 'Rainbow',
    colors: [
      // Depth 0: Red
      { bg: 'bg-red-500', hex: '#ef4444', text: 'text-white', hover: 'hover:bg-red-400' },
      // Depth 1: Orange
      {
        bg: 'bg-orange-400',
        hex: '#fb923c',
        text: 'text-orange-900',
        hover: 'hover:bg-orange-300',
      },
      // Depth 2: Yellow/Amber
      { bg: 'bg-amber-400', hex: '#fbbf24', text: 'text-amber-900', hover: 'hover:bg-amber-300' },
      // Depth 3: Green
      { bg: 'bg-lime-500', hex: '#84cc16', text: 'text-white', hover: 'hover:bg-lime-400' },
      // Depth 4: Cyan/Blue
      { bg: 'bg-cyan-500', hex: '#06b6d4', text: 'text-white', hover: 'hover:bg-cyan-400' },
      // Depth 5: Blue
      { bg: 'bg-blue-500', hex: '#3b82f6', text: 'text-white', hover: 'hover:bg-blue-400' },
      // Depth 6: Purple
      { bg: 'bg-purple-500', hex: '#a855f7', text: 'text-white', hover: 'hover:bg-purple-400' },
    ],
    swatch: '#ef4444', // Red swatch for theme picker
  },
};

/**
 * Get depth-based colors for a specific theme
 */
export function getDepthColors(depth: number, themeName: string = 'blue'): ColorConfig {
  const theme = themes[themeName] || themes['blue'];
  if (!theme) {
    throw new Error(`Theme not found: ${themeName}`);
  }
  const safeDepth = Math.max(0, depth || 0);

  // For rainbow theme, cycle through colors instead of capping
  if (themeName === 'rainbow') {
    const index = safeDepth % theme.colors.length;
    return theme.colors[index] as ColorConfig;
  }

  // For other themes, cap at last color
  const index = Math.min(safeDepth, theme.colors.length - 1);
  return (theme.colors[index] || theme.colors[0]) as ColorConfig;
}

/**
 * Get list of all available themes
 */
export function getThemeList(): ThemeList[] {
  return Object.entries(themes).map(([key, theme]) => ({
    id: key,
    name: theme.name,
    swatch: theme.swatch,
  }));
}

/**
 * Get swatch color for a theme
 */
export function getThemeSwatch(themeName: string): string {
  return themes[themeName]?.swatch || themes['slate']?.swatch || '#475569';
}

/**
 * Get lighter background color for person cards
 * Person cards should be slightly lighter than their parent department
 */
export function getPersonCardColor(parentDepth: number): string {
  const backgrounds = ['bg-slate-100', 'bg-slate-50', 'bg-white', 'bg-white', 'bg-white'];

  const index = Math.min(parentDepth, backgrounds.length - 1);
  return backgrounds[index] as string;
}
