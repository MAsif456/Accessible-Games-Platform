import '@testing-library/jest-dom';

(global as any).fetch = (global as any).fetch || (jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })) as any);

if (!window.scrollTo) {
  window.scrollTo = () => {};
}

import { TextEncoder as NodeTextEncoder } from 'util';
// @ts-ignore
if (typeof global.TextEncoder === 'undefined') {
  // @ts-ignore
  global.TextEncoder = NodeTextEncoder;
}

jest.mock('./services/settingsApi', () => ({
  __esModule: true,
  default: {
    getSettings: jest.fn().mockResolvedValue({
      voiceInput: false,
      captions: false,
      microphoneActive: false,
      highContrastMode: false,
      highContrastTheme: 'tidepool',
      reducedMotion: false,
      darkMode: false,
    }),
    updateSettings: jest.fn().mockResolvedValue({
      voiceInput: false,
      captions: false,
      microphoneActive: false,
      highContrastMode: false,
      highContrastTheme: 'tidepool',
      reducedMotion: false,
      darkMode: false,
    }),
    resetSettings: jest.fn().mockResolvedValue({
      message: 'reset',
      settings: {
        voiceInput: false,
        captions: false,
        microphoneActive: false,
        highContrastMode: false,
        highContrastTheme: 'tidepool',
        reducedMotion: false,
        darkMode: false,
      },
    }),
  },
}));
