import '@testing-library/jest-dom';
// Simple global fetch mock for Jest environment
global.fetch = global.fetch || (jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })) as any);

jest.mock('../src/services/settingsApi', () => ({
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
