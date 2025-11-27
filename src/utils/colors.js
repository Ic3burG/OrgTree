/**
 * Depth-based color system for department cards
 * Darker colors for top-level departments, lighter for nested ones
 */

export function getDepthColors(depth) {
  const colors = [
    { bg: 'bg-slate-700', hex: '#334155', text: 'text-white', hover: 'hover:bg-slate-600' },      // depth 0 - darkest
    { bg: 'bg-slate-600', hex: '#475569', text: 'text-white', hover: 'hover:bg-slate-500' },      // depth 1
    { bg: 'bg-slate-500', hex: '#64748b', text: 'text-white', hover: 'hover:bg-slate-400' },      // depth 2
    { bg: 'bg-slate-400', hex: '#94a3b8', text: 'text-slate-900', hover: 'hover:bg-slate-300' },  // depth 3
    { bg: 'bg-slate-300', hex: '#cbd5e1', text: 'text-slate-900', hover: 'hover:bg-slate-200' },  // depth 4+
  ];

  const index = Math.min(depth, colors.length - 1);

  return {
    bg: colors[index].bg,
    hex: colors[index].hex,
    text: colors[index].text,
    hover: colors[index].hover,
  };
}

/**
 * Get lighter background color for person cards
 * Person cards should be slightly lighter than their parent department
 */
export function getPersonCardColor(parentDepth) {
  const backgrounds = [
    'bg-slate-100',
    'bg-slate-50',
    'bg-white',
    'bg-white',
    'bg-white',
  ];

  const index = Math.min(parentDepth, backgrounds.length - 1);
  return backgrounds[index];
}
