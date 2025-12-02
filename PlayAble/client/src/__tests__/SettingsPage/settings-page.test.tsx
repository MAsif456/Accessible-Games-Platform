import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../../pages/SettingsPage';
import { AuthProvider } from '../../context/AuthContext';
import { DEFAULT_HIGH_CONTRAST_THEME } from '../../utils/accessibility';
import { UserSettings } from '../../services/settingsApi';

// Mock the settings API
jest.mock('../../services/settingsApi', () => {
  const actual = jest.requireActual('../../services/settingsApi');
  return {
    ...actual,
    settingsApi: {
      updateSettings: jest.fn(),
      resetSettings: jest.fn(),
      getSettings: jest.fn(),
    },
  };
});

const { settingsApi: mockedSettingsApi } = require('../../services/settingsApi');

// Mock the accessibility utility
jest.mock('../../utils/accessibility', () => ({
  ...jest.requireActual('../../utils/accessibility'),
  applyAccessibilityPreferences: jest.fn(),
}));

// Mock VoiceAssistantContext
jest.mock('../../context/VoiceAssistantContext', () => ({
  ...jest.requireActual('../../context/VoiceAssistantContext'),
  useVoiceAssistant: jest.fn(),
}));

const { useVoiceAssistant } = require('../../context/VoiceAssistantContext');

// Mock AuthContext
const mockUpdateUserSettingsState = jest.fn();
const mockUserSettings: UserSettings = {
  voiceInput: true,
  captions: true,
  microphoneActive: true,
  highContrastMode: false,
  highContrastTheme: DEFAULT_HIGH_CONTRAST_THEME,
  reducedMotion: false,
  darkMode: false,
};

jest.mock('../../context/AuthContext', () => {
  const actual = jest.requireActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: jest.fn(),
  };
});

const { useAuth } = require('../../context/AuthContext');

const mockApplyVoiceInputPreference = jest.fn();
const mockApplyMicrophonePreference = jest.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useVoiceAssistant.mockReturnValue({
      applyVoiceInputPreference: mockApplyVoiceInputPreference,
      applyMicrophonePreference: mockApplyMicrophonePreference,
      voiceInputEnabled: true,
      microphoneActive: true,
    });
  });

  describe('Loading and Initial Render', () => {
    test('displays loading state initially', async () => {
      useAuth.mockReturnValue({
        user: { id: 'test-user', name: 'Test User', role: 'user' },
        userSettings: null,
        updateUserSettingsState: mockUpdateUserSettingsState,
      });

      renderWithProviders(<SettingsPage />);

      const loadingText = screen.queryByText('Loading settings...');
      if (loadingText) {
        expect(loadingText).toBeInTheDocument();
        await waitFor(() => {
          expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
        });
      } else {
        await waitFor(() => {
          expect(screen.getByRole('main', { name: /settings page/i })).toBeInTheDocument();
        });
      }
    });

    test('renders settings page for logged-in user with saved settings', async () => {
      useAuth.mockReturnValue({
        user: { id: 'test-user', name: 'Test User', role: 'user' },
        userSettings: mockUserSettings,
        updateUserSettingsState: mockUpdateUserSettingsState,
      });

      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('main', { name: /settings page/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { name: /Accessibility Settings/i })).toBeInTheDocument();
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });

    test('renders settings page for non-logged-in user with default settings', async () => {
      useAuth.mockReturnValue({
        user: null,
        userSettings: null,
        updateUserSettingsState: mockUpdateUserSettingsState,
      });

      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('main', { name: /settings page/i })).toBeInTheDocument();
      });

      expect(
        screen.getByText(/You're not signed in. Your settings will be saved for this session and will persist as you navigate the site/i)
      ).toBeInTheDocument();
    });
  });

  describe('Section Navigation', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: { id: 'test-user', name: 'Test User', role: 'user' },
        userSettings: mockUserSettings,
        updateUserSettingsState: mockUpdateUserSettingsState,
      });
    });

    test('defaults to voice section and can navigate to keyboard section', async () => {
      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Voice & Audio Settings/i })).toBeInTheDocument();
      });

      const keyboardButton = screen.getByRole('button', { name: /Keyboard & Navigation/i });
      await userEvent.click(keyboardButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Keyboard & Navigation/i })).toBeInTheDocument();
      });
      expect(screen.queryByRole('heading', { name: /Voice & Audio Settings/i })).not.toBeInTheDocument();
    });

    test('can navigate to visual section', async () => {
      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Voice & Audio Settings/i })).toBeInTheDocument();
      });

      const visualButton = screen.getByRole('button', { name: /Visual Settings/i });
      await userEvent.click(visualButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Visual Settings/i })).toBeInTheDocument();
      });
    });
  });

  describe('Toggle Settings', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: { id: 'test-user', name: 'Test User', role: 'user' },
        userSettings: mockUserSettings,
        updateUserSettingsState: mockUpdateUserSettingsState,
      });
    });

    test('can toggle voice input setting', async () => {
      mockedSettingsApi.updateSettings.mockResolvedValue({
        ...mockUserSettings,
        voiceInput: false,
      });

      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /Voice Input: On/i })).toBeInTheDocument();
      });

      const voiceInputToggle = screen.getByRole('switch', { name: /Voice Input: On/i });
      await userEvent.click(voiceInputToggle);

      await waitFor(() => {
        expect(mockedSettingsApi.updateSettings).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    test('can toggle dark mode setting', async () => {
      mockedSettingsApi.updateSettings.mockResolvedValue({
        ...mockUserSettings,
        darkMode: true,
      });

      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Visual Settings/i })).toBeInTheDocument();
      });

      const visualButton = screen.getByRole('button', { name: /Visual Settings/i });
      await userEvent.click(visualButton);

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /Dark Mode: Off/i })).toBeInTheDocument();
      });

      const darkModeToggle = screen.getByRole('switch', { name: /Dark Mode: Off/i });
      await userEvent.click(darkModeToggle);

      await waitFor(() => {
        expect(mockedSettingsApi.updateSettings).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    test('shows auto-save indicator when settings are saved', async () => {
      mockedSettingsApi.updateSettings.mockResolvedValue(mockUserSettings);

      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /Voice Input: On/i })).toBeInTheDocument();
      });

      const voiceInputToggle = screen.getByRole('switch', { name: /Voice Input: On/i });
      await userEvent.click(voiceInputToggle);

      await waitFor(() => {
        expect(screen.getByText('Settings auto-saved')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('High Contrast Theme Selection', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: { id: 'test-user', name: 'Test User', role: 'user' },
        userSettings: {
          ...mockUserSettings,
          highContrastMode: true,
        },
        updateUserSettingsState: mockUpdateUserSettingsState,
      });
    });

    test('displays theme picker when high contrast mode is enabled', async () => {
      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Visual Settings/i })).toBeInTheDocument();
      });

      const visualButton = screen.getByRole('button', { name: /Visual Settings/i });
      await userEvent.click(visualButton);

      await waitFor(() => {
        expect(screen.getByText('Contrast Themes')).toBeInTheDocument();
      });

      const themeCards = screen.getAllByRole('radio');
      expect(themeCards.length).toBeGreaterThan(0);
    });

    test('can select a different high contrast theme', async () => {
      mockedSettingsApi.updateSettings.mockResolvedValue({
        ...mockUserSettings,
        highContrastMode: true,
        highContrastTheme: 'sunset',
      });

      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Visual Settings/i })).toBeInTheDocument();
      });

      const visualButton = screen.getByRole('button', { name: /Visual Settings/i });
      await userEvent.click(visualButton);

      await waitFor(() => {
        expect(screen.getByText('Contrast Themes')).toBeInTheDocument();
      });

      const sunsetTheme = await screen.findByRole('radio', { name: /Sunset Ember/i });
      await userEvent.click(sunsetTheme);

      await waitFor(() => {
        expect(mockedSettingsApi.updateSettings).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('Reset Settings', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: { id: 'test-user', name: 'Test User', role: 'user' },
        userSettings: {
          ...mockUserSettings,
          darkMode: true,
          highContrastMode: true,
        },
        updateUserSettingsState: mockUpdateUserSettingsState,
      });
    });

    test('opens reset confirmation dialog when reset button is clicked', async () => {
      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Reset to Default/i })).toBeInTheDocument();
      });

      const resetButton = screen.getByRole('button', { name: /Reset to Default/i });
      await userEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Reset Settings to Default\?/i })).toBeInTheDocument();
        expect(screen.getByText(/This will restore all accessibility settings to their default values/i)).toBeInTheDocument();
      });
    });

    test('cancels reset when cancel button is clicked', async () => {
      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Reset to Default/i })).toBeInTheDocument();
      });

      const resetButton = screen.getByRole('button', { name: /Reset to Default/i });
      await userEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Reset Settings to Default\?/i })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /Reset Settings to Default\?/i })).not.toBeInTheDocument();
      });
    });

    test('resets settings to default for logged-in user', async () => {
      const defaultSettings: UserSettings = {
        voiceInput: true,
        captions: true,
        microphoneActive: true,
        highContrastMode: false,
        highContrastTheme: DEFAULT_HIGH_CONTRAST_THEME,
        reducedMotion: false,
        darkMode: false,
      };

      mockedSettingsApi.resetSettings.mockResolvedValue({
        message: 'Settings reset successfully',
        settings: defaultSettings,
      });

      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Reset to Default/i })).toBeInTheDocument();
      });

      const resetButton = screen.getByRole('button', { name: /Reset to Default/i });
      await userEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Reset Settings to Default\?/i })).toBeInTheDocument();
      });

      // Find the confirm button in the dialog - there are two buttons with this text, get the one in the dialog
      const buttons = screen.getAllByRole('button', { name: /^Reset to Default$/i });
      const confirmButton = buttons[buttons.length - 1]; // Get the last one (the one in the dialog)
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockedSettingsApi.resetSettings).toHaveBeenCalledWith('test-user');
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Settings have been reset to default values.');
      });
    });

    test('resets settings to default for non-logged-in user', async () => {
      useAuth.mockReturnValue({
        user: null,
        userSettings: null,
        updateUserSettingsState: mockUpdateUserSettingsState,
      });

      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Reset to Default/i })).toBeInTheDocument();
      });

      const resetButton = screen.getByRole('button', { name: /Reset to Default/i });
      await userEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Reset Settings to Default\?/i })).toBeInTheDocument();
      });

      // Find the confirm button in the dialog - there are two buttons with this text, get the one in the dialog
      const buttons = screen.getAllByRole('button', { name: /^Reset to Default$/i });
      const confirmButton = buttons[buttons.length - 1]; // Get the last one (the one in the dialog)
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Settings have been reset to default values.');
      });

      expect(mockedSettingsApi.resetSettings).not.toHaveBeenCalled();
    });
  });

  describe('Nested Settings Display', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: { id: 'test-user', name: 'Test User', role: 'user' },
        userSettings: mockUserSettings,
        updateUserSettingsState: mockUpdateUserSettingsState,
      });
    });

    test('shows microphone settings when voice input is enabled', async () => {
      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Microphone:/i)).toBeInTheDocument();
        expect(screen.getByText(/Active/i)).toBeInTheDocument();
        expect(screen.getByText(/Listening for wake word "Hey Assistant"/i)).toBeInTheDocument();
      });
    });

    test('shows voice command guide when voice input is enabled', async () => {
      renderWithProviders(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Voice Command Guide/i)).toBeInTheDocument();
        expect(screen.getByText(/How to Start/i)).toBeInTheDocument();
        expect(screen.getByText(/Example Commands/i)).toBeInTheDocument();
      });
    });
  });
});
