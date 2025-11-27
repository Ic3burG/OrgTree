import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumbs - Navigation breadcrumb trail
 * Shows current location in the organization hierarchy
 */
export default function Breadcrumbs({ path, onNavigate }) {
  if (!path || path === '/') {
    return null;
  }

  const segments = path.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-2 text-sm text-slate-600 mb-4" aria-label="Breadcrumb">
      <button
        onClick={() => onNavigate('/')}
        className="flex items-center gap-1 hover:text-slate-900 transition-colors"
        aria-label="Go to home"
      >
        <Home size={16} />
        <span>Home</span>
      </button>

      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const segmentPath = '/' + segments.slice(0, index + 1).join('/');
        const displayName = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        return (
          <div key={segmentPath} className="flex items-center gap-2">
            <ChevronRight size={16} className="text-slate-400" />
            {isLast ? (
              <span className="font-semibold text-slate-900">{displayName}</span>
            ) : (
              <button
                onClick={() => onNavigate(segmentPath)}
                className="hover:text-slate-900 transition-colors"
                aria-label={`Go to ${displayName}`}
              >
                {displayName}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
