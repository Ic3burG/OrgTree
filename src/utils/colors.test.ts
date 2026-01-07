import { describe, it, expect } from 'vitest';
import { getDepthColors, getThemeList, getThemeSwatch, getPersonCardColor } from './colors';

describe('Colors Utility', () => {
  describe('getDepthColors', () => {
    it('should return colors for depth 0', () => {
      const colors = getDepthColors(0);
      expect(colors).toHaveProperty('bg');
      expect(colors).toHaveProperty('hex');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('hover');
    });

    it('should return different colors for different depths', () => {
      const depth0 = getDepthColors(0);
      const depth1 = getDepthColors(1);
      const depth2 = getDepthColors(2);

      expect(depth0.hex).not.toBe(depth1.hex);
      expect(depth1.hex).not.toBe(depth2.hex);
    });

    it('should cap at maximum depth', () => {
      const depth4 = getDepthColors(4);
      const depth10 = getDepthColors(10);
      const depth100 = getDepthColors(100);

      expect(depth4.hex).toBe(depth10.hex);
      expect(depth10.hex).toBe(depth100.hex);
    });

    it('should support different themes', () => {
      const slate = getDepthColors(0, 'slate');
      const blue = getDepthColors(0, 'blue');
      const emerald = getDepthColors(0, 'emerald');

      expect(slate.hex).not.toBe(blue.hex);
      expect(blue.hex).not.toBe(emerald.hex);
    });

    it('should fallback to slate for invalid theme', () => {
      const invalid = getDepthColors(0, 'invalid-theme');
      const slate = getDepthColors(0, 'slate');

      expect(invalid.hex).toBe(slate.hex);
    });

    it('should return white text for dark colors', () => {
      const depth0 = getDepthColors(0);
      expect(depth0.text).toBe('text-white');
    });

    it('should return dark text for light colors', () => {
      const depth4 = getDepthColors(4, 'slate');
      expect(depth4.text).toContain('text-slate');
    });
  });

  describe('getThemeList', () => {
    it('should return array of themes', () => {
      const themes = getThemeList();
      expect(Array.isArray(themes)).toBe(true);
      expect(themes.length).toBeGreaterThan(0);
    });

    it('should include expected themes', () => {
      const themes = getThemeList();
      const themeIds = themes.map(t => t.id);

      expect(themeIds).toContain('slate');
      expect(themeIds).toContain('blue');
      expect(themeIds).toContain('emerald');
      expect(themeIds).toContain('violet');
      expect(themeIds).toContain('amber');
      expect(themeIds).toContain('rose');
    });

    it('should include id, name, and swatch for each theme', () => {
      const themes = getThemeList();

      themes.forEach(theme => {
        expect(theme).toHaveProperty('id');
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('swatch');
        expect(typeof theme.id).toBe('string');
        expect(typeof theme.name).toBe('string');
        expect(theme.swatch).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('getThemeSwatch', () => {
    it('should return swatch color for valid theme', () => {
      const swatch = getThemeSwatch('blue');
      expect(swatch).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should return slate swatch for invalid theme', () => {
      const invalid = getThemeSwatch('invalid');
      const slate = getThemeSwatch('slate');

      expect(invalid).toBe(slate);
    });

    it('should return different swatches for different themes', () => {
      const slate = getThemeSwatch('slate');
      const blue = getThemeSwatch('blue');

      expect(slate).not.toBe(blue);
    });
  });

  describe('getPersonCardColor', () => {
    it('should return a Tailwind background class', () => {
      const color = getPersonCardColor(0);
      expect(color).toMatch(/^bg-/);
    });

    it('should return lighter colors for deeper depths', () => {
      const depth2 = getPersonCardColor(2);

      // depth2 should be white or lighter
      expect(depth2).toMatch(/bg-(white|slate-50)/);
    });

    it('should cap at maximum depth', () => {
      const depth4 = getPersonCardColor(4);
      const depth10 = getPersonCardColor(10);

      expect(depth4).toBe(depth10);
    });
  });
});
