import type { GameDto } from '../services/api';

export interface AccessibilitySection {
  category: string;
  tags: string[];
}

export type HighContrastThemeId = 'classic' | 'dusk' | 'pastel' | 'bold';

export interface HighContrastTheme {
  id: HighContrastThemeId;
  name: string;
  description: string;
  swatches: [string, string, string, string];
}

export const HIGH_CONTRAST_THEMES: HighContrastTheme[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Pure black and white for maximum contrast.',
    swatches: ['#000000', '#ffffff', '#000000', '#ffffff'],
  },
  {
    id: 'dusk',
    name: 'Dusk',
    description: 'Dark navy base with soft yellow accents.',
    swatches: ['#0f172a', '#fbbf24', '#1e293b', '#fef9c3'],
  },
  {
    id: 'pastel',
    name: 'Pastel Focus',
    description: 'Steel blue backgrounds with ivory highlights.',
    swatches: ['#1f2937', '#f5f5f4', '#0ea5e9', '#fcd34d'],
  },
  {
    id: 'bold',
    name: 'Bold Accent',
    description: 'High energy palette with cobalt buttons.',
    swatches: ['#111827', '#ffffff', '#2563eb', '#f97316'],
  },
];

export const DEFAULT_HIGH_CONTRAST_THEME: HighContrastThemeId = 'classic';

const CATEGORY_ORDER = ['Vision', 'Visual', 'Hearing', 'Audio', 'Motor', 'Cognitive'] as const;

/**
 * Sort helper that keeps the most recognisable categories (Vision, Hearing, etc.) first while
 * still allowing unknown/custom categories to render after the defaults.
 */
const sortByCategoryWeight = (a: string, b: string) => {
  const aIndex = CATEGORY_ORDER.indexOf(a as (typeof CATEGORY_ORDER)[number]);
  const bIndex = CATEGORY_ORDER.indexOf(b as (typeof CATEGORY_ORDER)[number]);
  const safeA = aIndex === -1 ? CATEGORY_ORDER.length : aIndex;
  const safeB = bIndex === -1 ? CATEGORY_ORDER.length : bIndex;
  return safeA - safeB;
};

/**
 * Normalises the specific accessibility map into a list of section objects that are easier to
 * iterate over in React.
 */
export function buildAccessibilitySections(
  game: Pick<GameDto, 'accessibilityTags' | 'specificAccessibilityTags'>
): AccessibilitySection[] {
  const specific = game.specificAccessibilityTags;
  if (specific && typeof specific === 'object') {
    const entries = Object.entries(specific).filter(
      ([, featureList]) => Array.isArray(featureList) && featureList.length > 0
    );
    if (entries.length) {
      return entries
        .sort(([a], [b]) => sortByCategoryWeight(a, b))
        .map(([category, tags]) => ({ category, tags }));
    }
  }

  const fallback = game.accessibilityTags ?? [];
  if (!fallback.length) {
    return [];
  }

  const midpoint = Math.ceil(fallback.length / 2);
  return [
    { category: 'Visual', tags: fallback.slice(0, midpoint) },
    { category: 'Motor', tags: fallback.slice(midpoint) },
  ].filter(section => section.tags.length > 0);
}

/**
 * Returns the badge/category labels that should be shown on summary UI like cards. It reuses the
 * same data as the Game Details page so both surfaces stay in sync.
 */
export function deriveAccessibilityBadges(
  game: Pick<GameDto, 'accessibilityTags' | 'specificAccessibilityTags'>
): string[] {
  const sections = buildAccessibilitySections(game);
  const seen = new Set<string>();
  return sections
    .map(section => section.category)
    .filter(label => {
      const trimmed = label.trim();
      if (!trimmed || seen.has(trimmed)) {
        return false;
      }
      seen.add(trimmed);
      return true;
    });
}

interface PreferenceLike {
  highContrastMode?: boolean;
  darkMode?: boolean;
  highContrastTheme?: HighContrastThemeId;
}

/**
 * Applies basic accessibility preferences to the document element. This keeps the UI reactive to
 * stored user preferences during both runtime and tests without depending on global CSS hacks.
 */
export function applyAccessibilityPreferences(preferences?: PreferenceLike | null) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  if (preferences?.highContrastMode) {
    root.classList.add('prefers-high-contrast');
  } else {
    root.classList.remove('prefers-high-contrast');
  }

  if (preferences?.darkMode) {
    root.classList.add('prefers-dark-mode');
  } else {
    root.classList.remove('prefers-dark-mode');
  }

  if (preferences?.highContrastMode && preferences.highContrastTheme) {
    root.dataset.highContrastTheme = preferences.highContrastTheme;
  } else {
    delete root.dataset.highContrastTheme;
  }
}
