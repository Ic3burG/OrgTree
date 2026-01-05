import { getThemeList } from '../utils/colors';

/**
 * ThemePicker - Color theme selector with circular swatches
 */
export default function ThemePicker({ currentTheme, onThemeChange }) {
  const themes = getThemeList();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 mr-1">Theme:</span>
      <div className="flex gap-1.5">
        {themes.map(theme => (
          <button
            key={theme.id}
            onClick={() => onThemeChange(theme.id)}
            className={`
              w-5 h-5 rounded-full transition-all
              ${
                currentTheme === theme.id
                  ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                  : 'hover:scale-110'
              }
            `}
            style={{ backgroundColor: theme.swatch }}
            title={theme.name}
            aria-label={`${theme.name} theme`}
          />
        ))}
      </div>
    </div>
  );
}
