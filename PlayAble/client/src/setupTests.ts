import '@testing-library/jest-dom';

// Simple global fetch mock for Jest environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = (global as any).fetch || (jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })) as any);

// Mock window.scrollTo for jsdom test environment
if (!window.scrollTo) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  window.scrollTo = () => {};
}

// Polyfill TextEncoder for libraries like react-router-dom that expect it to exist in the test environment
import { TextEncoder as NodeTextEncoder } from 'util';
// @ts-ignore
if (typeof global.TextEncoder === 'undefined') {
  // @ts-ignore
  global.TextEncoder = NodeTextEncoder;
}

// Mock settingsApi so tests don't depend on backend responses
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
