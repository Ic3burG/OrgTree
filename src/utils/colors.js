/**
 * Depth-based color system for department cards
 * Darker colors for top-level departments, lighter for nested ones
 */

export function getDepthColors(depth) {
  const backgrounds = [
    'bg-slate-700', // depth 0 - darkest
    'bg-slate-600', // depth 1
    'bg-slate-500', // depth 2
    'bg-slate-400', // depth 3
    'bg-slate-300', // depth 4+ - lightest
  ];

  const textColors = [
    'text-white',      // depth 0-2: white text on dark bg
    'text-white',
    'text-white',
    'text-slate-900',  // depth 3-4: dark text on light bg
    'text-slate-900',
  ];

  const hoverBackgrounds = [
    'hover:bg-slate-600',
    'hover:bg-slate-500',
    'hover:bg-slate-400',
    'hover:bg-slate-300',
    'hover:bg-slate-200',
  ];

  const index = Math.min(depth, backgrounds.length - 1);

  return {
    bg: backgrounds[index],
    text: textColors[index],
    hover: hoverBackgrounds[index],
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
