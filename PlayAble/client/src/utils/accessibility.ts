import { UserSettings } from '../services/settingsApi';

export const HIGH_CONTRAST_THEMES = [
  {
    id: 'tidepool' as const,
    name: 'Tidepool Glow',
    description: 'Deep blues with neon cyan details for crisp aquatic contrast.',
    swatches: ['#001427', '#0ea5e9', '#7df9ff', '#fef3c7'],
  },
  {
    id: 'sunset' as const,
    name: 'Sunset Ember',
    description: 'Warm golden surfaces with dark ink text inspired by desert light.',
    swatches: ['#180b00', '#ffb703', '#ffd166', '#fbf3d5'],
  },
  {
    id: 'twilight' as const,
    name: 'Twilight Alloy',
    description: 'Cool slate foundations with lavender accents for balanced contrast.',
    swatches: ['#0f172a', '#475569', '#a78bfa', '#f5f3ff'],
  },
  {
    id: 'midnight' as const,
    name: 'Midnight Pulse',
    description: 'Pure black with electric magenta and lime signals for maximum pop.',
    swatches: ['#000000', '#8b5cf6', '#facc15', '#ffffff'],
  },
] as const;

export type HighContrastThemeId = (typeof HIGH_CONTRAST_THEMES)[number]['id'];

export const DEFAULT_HIGH_CONTRAST_THEME: HighContrastThemeId = 'tidepool';

export const HIGH_CONTRAST_THEME_CLASSNAMES = HIGH_CONTRAST_THEMES.map(
  (theme) => `high-contrast-theme-${theme.id}`
);

const toggleClass = (element: Element, className: string, enabled: boolean) => {
  if (enabled) {
    element.classList.add(className);
  } else {
    element.classList.remove(className);
  }
};

export const applyAccessibilityPreferences = (
  settings?: Partial<UserSettings> | null
) => {
  if (typeof document === 'undefined') return;

  const body = document.body;
  const html = document.documentElement;
  const theme =
    (settings?.highContrastTheme as HighContrastThemeId) || DEFAULT_HIGH_CONTRAST_THEME;

  HIGH_CONTRAST_THEME_CLASSNAMES.forEach((className) => {
    body.classList.remove(className);
    html.classList.remove(className);
  });

  if (settings?.highContrastMode) {
    body.classList.add('high-contrast');
    const className = `high-contrast-theme-${theme}`;
    body.classList.add(className);
    html.classList.add(className);
  } else {
    body.classList.remove('high-contrast');
  }

  toggleClass(body, 'dark-mode', !!settings?.darkMode);
  toggleClass(html, 'dark-mode', !!settings?.darkMode);

  toggleClass(body, 'reduced-motion', !!settings?.reducedMotion);
};

