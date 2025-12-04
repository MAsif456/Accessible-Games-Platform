import type { GameDto } from '../services/api';

export interface AccessibilitySection {
  category: string;
  tags: string[];
}

export type HighContrastThemeId = 'white' | 'black';

export interface HighContrastTheme {
  id: HighContrastThemeId;
  name: string;
  description: string;
  swatches: [string, string, string, string];
}

export const HIGH_CONTRAST_THEMES: HighContrastTheme[] = [
  {
    id: 'white',
    name: 'White High Contrast',
    description: 'Industry standard white background with black text for maximum contrast.',
    swatches: ['#ffffff', '#000000', '#ffffff', '#000000'],
  },
  {
    id: 'black',
    name: 'Black High Contrast',
    description: 'Industry standard black background with white text for maximum contrast.',
    swatches: ['#000000', '#ffffff', '#000000', '#ffffff'],
  },
];

export const DEFAULT_HIGH_CONTRAST_THEME: HighContrastThemeId = 'white';

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
  const body = document.body;
  
  // High contrast mode and dark mode are mutually exclusive
  // If high contrast is on, dark mode must be off, and vice versa
  const highContrastMode = preferences?.highContrastMode ?? false;
  const darkMode = highContrastMode ? false : (preferences?.darkMode ?? false);
  
  // Apply high contrast mode
  if (highContrastMode) {
    root.classList.add('prefers-high-contrast');
    body.classList.add('prefers-high-contrast');
    // Ensure dark mode is off when high contrast is on
    root.classList.remove('prefers-dark-mode');
    body.classList.remove('prefers-dark-mode');
  } else {
    root.classList.remove('prefers-high-contrast');
    body.classList.remove('prefers-high-contrast');
  }

  // Apply dark mode (only if high contrast is off)
  if (darkMode && !highContrastMode) {
    root.classList.add('prefers-dark-mode');
    body.classList.add('prefers-dark-mode');
  } else {
    root.classList.remove('prefers-dark-mode');
    body.classList.remove('prefers-dark-mode');
  }

  // Apply high contrast theme
  if (highContrastMode && preferences?.highContrastTheme) {
    root.dataset.highContrastTheme = preferences.highContrastTheme;
    body.dataset.highContrastTheme = preferences.highContrastTheme;
  } else {
    delete root.dataset.highContrastTheme;
    delete body.dataset.highContrastTheme;
  }
}
