import { useState, useEffect, useRef } from 'react';
import { settingsApi, UserSettings } from '../services/settingsApi';
import { useAuth } from '../context/AuthContext';
import '../styles/index.css';
import {
  HIGH_CONTRAST_THEMES,
  DEFAULT_HIGH_CONTRAST_THEME,
  applyAccessibilityPreferences,
  HighContrastThemeId,
} from '../utils/accessibility';
import { useVoiceAssistant } from '../context/VoiceAssistantContext';

type SettingsSection = 'voice' | 'keyboard' | 'visual';
type ToggleableSetting =
  | 'voiceInput'
  | 'captions'
  | 'microphoneActive'
  | 'highContrastMode'
  | 'reducedMotion'
  | 'darkMode';

const SettingsPage = () => {
  const { user, userSettings, updateUserSettingsState } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>('voice');
  const [settings, setSettings] = useState<UserSettings>({
    voiceInput: true,
    captions: true,
    microphoneActive: true,
    highContrastMode: false,
    highContrastTheme: DEFAULT_HIGH_CONTRAST_THEME,
    reducedMotion: false,
    darkMode: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [autoSaveIndicator, setAutoSaveIndicator] = useState(false);
  const {
    applyVoiceInputPreference,
    applyMicrophonePreference,
    voiceInputEnabled: assistantVoiceEnabled,
    microphoneActive: assistantMicrophoneActive,
  } = useVoiceAssistant();

  // Refs to track previous state and prevent unnecessary saves
  const previousSettingsRef = useRef<UserSettings | null>(null);
  const isInitialLoadRef = useRef(true);
  const skipNextSaveRef = useRef(false);
  const lastUserSettingsRef = useRef<UserSettings | null>(null);

  // Session storage key for non-logged-in users
  const SESSION_STORAGE_KEY = 'playable_session_settings';

  // Load settings from sessionStorage for non-logged-in users
  const loadSessionSettings = (): UserSettings | null => {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          highContrastTheme: parsed.highContrastTheme || DEFAULT_HIGH_CONTRAST_THEME,
        };
      }
    } catch (error) {
      console.error('Failed to load session settings:', error);
    }
    return null;
  };

  // Save settings to sessionStorage for non-logged-in users
  const saveSessionSettings = (settingsToSave: UserSettings) => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Failed to save session settings:', error);
    }
  };

  useEffect(() => {
    if (user?.id && userSettings) {
      // Check if userSettings actually changed (to avoid unnecessary updates)
      const settingsChanged = !lastUserSettingsRef.current || 
        JSON.stringify(lastUserSettingsRef.current) !== JSON.stringify(userSettings);
      
      if (settingsChanged) {
        // Load saved settings when user is logged in
        const loadedSettings = {
          ...userSettings,
          highContrastTheme: userSettings.highContrastTheme || DEFAULT_HIGH_CONTRAST_THEME,
        };
        setSettings(loadedSettings);
        previousSettingsRef.current = loadedSettings;
        lastUserSettingsRef.current = userSettings;
        skipNextSaveRef.current = true; // Skip auto-save when loading from userSettings
        isInitialLoadRef.current = true;
      }
      setIsLoading(false);
    } else if (user?.id && !userSettings) {
      // Logged-in user but no settings loaded yet: fall back to defaults
      setSettings({
        voiceInput: true,
        captions: true,
        microphoneActive: true,
        highContrastMode: false,
        highContrastTheme: DEFAULT_HIGH_CONTRAST_THEME,
        reducedMotion: false,
        darkMode: false,
      });
      setIsLoading(false);
    } else if (!user?.id) {
      // For non-logged-in users, try to load from sessionStorage first
      const sessionSettings = loadSessionSettings();
      const settingsToUse = sessionSettings || {
        voiceInput: true,
        captions: true,
        microphoneActive: true,
        highContrastMode: false,
        highContrastTheme: DEFAULT_HIGH_CONTRAST_THEME,
        reducedMotion: false,
        darkMode: false,
      };
      setSettings(settingsToUse);
      previousSettingsRef.current = settingsToUse;
      isInitialLoadRef.current = true;
      setIsLoading(false);
    }
  }, [user?.id, userSettings]);

  // Helper function to check if settings actually changed
  const settingsChanged = (prev: UserSettings | null, current: UserSettings): boolean => {
    if (!prev) return true;
    
    return (
      prev.voiceInput !== current.voiceInput ||
      prev.captions !== current.captions ||
      prev.microphoneActive !== current.microphoneActive ||
      prev.highContrastMode !== current.highContrastMode ||
      prev.highContrastTheme !== current.highContrastTheme ||
      prev.reducedMotion !== current.reducedMotion ||
      prev.darkMode !== current.darkMode
    );
  };

  // Auto-save when settings change (only if values actually changed)
  useEffect(() => {
    // Skip save on initial load or if explicitly skipped
    if (isInitialLoadRef.current || skipNextSaveRef.current) {
      isInitialLoadRef.current = false;
      skipNextSaveRef.current = false;
      previousSettingsRef.current = settings;
      return;
    }

    // Only save if settings actually changed
    if (!isLoading && settingsChanged(previousSettingsRef.current, settings)) {
      if (user?.id) {
        // For logged-in users, save to backend
        const saveTimeout = setTimeout(async () => {
          setAutoSaveIndicator(true);
          try {
            const updated = await settingsApi.updateSettings(user.id, settings);
            updateUserSettingsState(updated);
            previousSettingsRef.current = updated; // Update ref with saved settings
          } catch (error) {
            console.error('Failed to save settings:', error);
          } finally {
            setTimeout(() => setAutoSaveIndicator(false), 2000);
          }
        }, 500); // Debounce: save 500ms after last change

        return () => clearTimeout(saveTimeout);
      } else {
        // For non-logged-in users, save to sessionStorage
        const saveTimeout = setTimeout(() => {
          saveSessionSettings(settings);
          previousSettingsRef.current = settings; // Update ref with saved settings
        }, 500); // Debounce: save 500ms after last change

        return () => clearTimeout(saveTimeout);
      }
    } else {
      // Settings didn't change, update ref anyway
      previousSettingsRef.current = settings;
    }
  }, [settings, isLoading, user?.id, updateUserSettingsState]);

  // Apply visual settings immediately
  useEffect(() => {
    applyAccessibilityPreferences(settings);
  }, [
    settings.highContrastMode,
    settings.highContrastTheme,
    settings.reducedMotion,
    settings.darkMode,
  ]);

  const handleToggle = (key: ToggleableSetting) => {
    setSettings((prev) => {
      const nextValue = !prev[key];
      if (key === 'voiceInput') {
        applyVoiceInputPreference(nextValue);
      } else if (key === 'microphoneActive') {
        applyMicrophonePreference(nextValue);
      }
      return {
      ...prev,
        [key]: nextValue,
      };
    });
  };

  const handleHighContrastThemeChange = (themeId: HighContrastThemeId) => {
    setSettings((prev) => ({
      ...prev,
      highContrastTheme: themeId,
    }));
  };

  const handleReset = async () => {
    try {
      const defaultSettings = {
        voiceInput: true,
        captions: true,
        microphoneActive: true,
        highContrastMode: false,
        highContrastTheme: DEFAULT_HIGH_CONTRAST_THEME,
        reducedMotion: false,
        darkMode: false,
      };

      if (user?.id) {
        // For logged-in users, reset in backend and update state
        const result = await settingsApi.resetSettings(user.id);
        skipNextSaveRef.current = true; // Skip auto-save since we just saved via reset
        setSettings(result.settings);
        previousSettingsRef.current = result.settings;
        updateUserSettingsState(result.settings);
      } else {
        // For non-logged-in users, reset local state and sessionStorage
        skipNextSaveRef.current = true; // Skip auto-save since we're manually saving
        setSettings(defaultSettings);
        previousSettingsRef.current = defaultSettings;
        saveSessionSettings(defaultSettings); // Save to sessionStorage
        applyAccessibilityPreferences(defaultSettings);
      }

      setShowResetDialog(false);
      setShowResetSuccess(true);
      setTimeout(() => setShowResetSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  if (isLoading) {
    return (
      <main className="settings-page" aria-label="Settings page">
        <div className="settings-page__loading">Loading settings...</div>
      </main>
    );
  }

  return (
    <main className="settings-page" aria-label="Settings page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">
          <span className="settings-page__icon" aria-hidden="true">
            ⚙️
          </span>
          Accessibility Settings
        </h1>
        <p className="settings-page__description">
          Customize your experience with our comprehensive accessibility features.
        </p>
        {!user?.id && (
          <p className="settings-page__notice" style={{ 
            marginTop: '0.5rem', 
            padding: '0.75rem', 
            background: '#fef3c7', 
            border: '1px solid #fbbf24', 
            borderRadius: '6px',
            color: '#92400e',
            fontSize: '0.875rem'
          }}>
            ⓘ You're not signed in. Your settings will be saved for this session and will persist as you navigate the site. Sign in to save your preferences permanently across all devices.
          </p>
        )}
      </div>

      <div className="settings-page__content">
        <aside className="settings-page__sidebar" aria-label="Settings categories">
          <nav className="settings-page__nav">
            <button
              className={`settings-page__nav-item ${
                activeSection === 'voice' ? 'settings-page__nav-item--active' : ''
              }`}
              onClick={() => setActiveSection('voice')}
              aria-current={activeSection === 'voice' ? 'page' : undefined}
            >
              <span className="settings-page__nav-icon" aria-hidden="true">
                🔊
              </span>
              Voice & Audio
            </button>
            <button
              className={`settings-page__nav-item ${
                activeSection === 'keyboard' ? 'settings-page__nav-item--active' : ''
              }`}
              onClick={() => setActiveSection('keyboard')}
              aria-current={activeSection === 'keyboard' ? 'page' : undefined}
            >
              <span className="settings-page__nav-icon" aria-hidden="true">
                ⌨️
              </span>
              Keyboard & Navigation
            </button>
            <button
              className={`settings-page__nav-item ${
                activeSection === 'visual' ? 'settings-page__nav-item--active' : ''
              }`}
              onClick={() => setActiveSection('visual')}
              aria-current={activeSection === 'visual' ? 'page' : undefined}
            >
              <span className="settings-page__nav-icon" aria-hidden="true">
                👁️
              </span>
              Visual Settings
            </button>
          </nav>
          <div className="settings-page__auto-save">
            {autoSaveIndicator && (
              <span className="settings-page__auto-save-indicator" aria-live="polite">
                <span className="settings-page__auto-save-icon" aria-hidden="true">
                  ✓
                </span>
                Settings auto-saved
              </span>
            )}
          </div>
        </aside>

        <div className="settings-page__main">
          {activeSection === 'voice' && (
            <div className="settings-section">
              <h2 className="settings-section__title">
                <span className="settings-section__icon" aria-hidden="true">
                  🔊
                </span>
                Voice & Audio Settings
              </h2>

              <div className="settings-section__item">
                <div className="settings-section__item-header">
                  <label className="settings-section__label">
                    Voice Input
                      <span className="settings-section__default">
                        Status: {assistantVoiceEnabled ? 'On' : 'Off'}
                      </span>
                  </label>
                  <button
                    className={`toggle-switch ${settings.voiceInput ? 'toggle-switch--on' : ''}`}
                    onClick={() => handleToggle('voiceInput')}
                    aria-label={`Voice Input: ${settings.voiceInput ? 'On' : 'Off'}`}
                    role="switch"
                    aria-checked={settings.voiceInput}
                  >
                    <span className="toggle-switch__slider"></span>
                  </button>
                </div>
                <p className="settings-section__description">
                  Enable voice commands to control the platform hands-free.
                </p>

                {settings.voiceInput && (
                  <div className="settings-section__nested">
                    <div className="settings-section__item">
                      <div className="settings-section__item-header">
                        <label className="settings-section__label">
                          <span className="settings-section__icon" aria-hidden="true">
                            🎤
                          </span>
                          Microphone:{' '}
                          <span
                            className={
                              assistantMicrophoneActive
                                ? 'settings-section__badge settings-section__badge--success'
                                : 'settings-section__badge settings-section__badge--muted'
                            }
                          >
                            {assistantMicrophoneActive ? 'Active' : 'Muted'}
                          </span>
                        </label>
                        <button
                          className={`toggle-switch ${settings.microphoneActive ? 'toggle-switch--on' : ''}`}
                          onClick={() => handleToggle('microphoneActive')}
                          aria-label={`Microphone: ${settings.microphoneActive ? 'Active' : 'Inactive'}`}
                          role="switch"
                          aria-checked={settings.microphoneActive}
                        >
                          <span className="toggle-switch__slider"></span>
                        </button>
                      </div>
                      <p className="settings-section__description">
                        Listening for wake word "Hey Assistant".
                        {assistantVoiceEnabled && assistantMicrophoneActive ? (
                          <span className="settings-section__inline-hint"> Microphone is ready.</span>
                        ) : (
                          <span className="settings-section__inline-hint">
                            Enable both Voice Input and the Microphone to activate the assistant.
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="settings-section__wake-word">
                      <h3 className="settings-section__subtitle">Wake Word Behavior</h3>
                      <ul className="settings-section__list">
                        <li>Say "Hey Assistant" to activate voice commands.</li>
                        <li>A visual indicator will show when listening.</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="settings-section__item">
                <div className="settings-section__item-header">
                  <label className="settings-section__label">
                    Captions
                    <span className="settings-section__default">Default: On</span>
                  </label>
                  <button
                    className={`toggle-switch ${settings.captions ? 'toggle-switch--on' : ''}`}
                    onClick={() => handleToggle('captions')}
                    aria-label={`Captions: ${settings.captions ? 'On' : 'Off'}`}
                    role="switch"
                    aria-checked={settings.captions}
                  >
                    <span className="toggle-switch__slider"></span>
                  </button>
                </div>
                <p className="settings-section__description">
                  Display text captions for all video and audio content.
                </p>
                <p className="settings-section__note">
                  <span className="settings-section__note-icon" aria-hidden="true">
                    📄
                  </span>
                  Captions will appear on all video content, including game trailers.
                </p>
              </div>

              {settings.voiceInput && (
                <div className="settings-section__voice-guide">
                  <h3 className="settings-section__subtitle">
                    <span className="settings-section__icon" aria-hidden="true">
                      🎤
                    </span>
                    Voice Command Guide
                  </h3>
                  <div className="settings-section__guide-section">
                    <h4 className="settings-section__guide-title">How to Start</h4>
                    <p className="settings-section__guide-text">
                      Say "Hey Assistant" or press <kbd>Ctrl + Shift + V</kbd>
                    </p>
                    <p className="settings-section__tip">
                      <strong>Tip:</strong> Speak clearly and wait for the "Listening..." notification before giving your command.
                    </p>
                  </div>
                  <div className="settings-section__guide-section">
                    <h4 className="settings-section__guide-title">Example Commands</h4>
                    <div className="settings-section__commands">
                      <div className="settings-section__command-group">
                        <h5 className="settings-section__command-category">Navigation:</h5>
                        <ul className="settings-section__command-list">
                          <li>"Show me all my favorite games" - Go to favorites page</li>
                          <li>"Take me to my profile page" - Navigate to your profile</li>
                          <li>"Go back to the previous page" - Return to last page</li>
                          <li>"Open accessibility settings" - Access settings menu</li>
                          <li>"I want to report this game" - Open report dialog</li>
                          <li>"Add this game to my favorites" - Save current game</li>
                        </ul>
                      </div>
                      <div className="settings-section__command-group">
                        <h5 className="settings-section__command-category">Search & Discovery:</h5>
                        <ul className="settings-section__command-list">
                          <li>"Search for adventure games" - Find games by keyword</li>
                          <li>"Show me all puzzle games" - Filter by Puzzle genre</li>
                          <li>"Clear all my search filters" - Reset all filters</li>
                          <li>"Show recently viewed games" - View game history</li>
                        </ul>
                      </div>
                      <div className="settings-section__command-group">
                        <h5 className="settings-section__command-category">Accessibility Filtering:</h5>
                        <ul className="settings-section__command-list">
                          <li>"Find games with subtitle support" - Games with subtitles</li>
                          <li>"Show games with colorblind mode" - Colorblind-friendly games</li>
                          <li>"Filter by one-handed controls" - One-hand compatible games</li>
                          <li>"Show me screen reader friendly games" - Screen reader support</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'keyboard' && (
            <div className="settings-section">
              <h2 className="settings-section__title">
                <span className="settings-section__icon" aria-hidden="true">
                  ⌨️
                </span>
                Keyboard & Navigation
              </h2>

              <h3 className="settings-section__subtitle">Keyboard Navigation Guide</h3>
              <div className="settings-section__keyboard-guide">
                <div className="settings-section__shortcut">
                  <kbd className="settings-section__key">Tab</kbd>
                  <span className="settings-section__shortcut-desc">
                    Navigate forward through interactive elements
                  </span>
                </div>
                <div className="settings-section__shortcut">
                  <kbd className="settings-section__key">Shift + Tab</kbd>
                  <span className="settings-section__shortcut-desc">
                    Navigate backward through interactive elements
                  </span>
                </div>
                <div className="settings-section__shortcut">
                  <kbd className="settings-section__key">Enter</kbd>
                  <span className="settings-section__shortcut-desc">
                    Activate buttons and links
                  </span>
                </div>
                <div className="settings-section__shortcut">
                  <kbd className="settings-section__key">Space</kbd>
                  <span className="settings-section__shortcut-desc">
                    Toggle switches and checkboxes
                  </span>
                </div>
                <div className="settings-section__shortcut">
                  <kbd className="settings-section__key">Esc</kbd>
                  <span className="settings-section__shortcut-desc">
                    Close dialogs and modals
                  </span>
                </div>
                <div className="settings-section__shortcut">
                  <kbd className="settings-section__key">Arrow Keys</kbd>
                  <span className="settings-section__shortcut-desc">
                    Navigate within menus, selects, and radio groups
                  </span>
                </div>
                <div className="settings-section__shortcut">
                  <kbd className="settings-section__key">Ctrl + Shift + V</kbd>
                  <span className="settings-section__shortcut-desc">
                    Toggle voice input on/off
                  </span>
                </div>
              </div>
              <p className="settings-section__tip">
                <span className="settings-section__tip-icon" aria-hidden="true">
                  ℹ️
                </span>
                <strong>Tip:</strong> Look for the blue outline around elements as you navigate. This shows you where your keyboard focus is.
              </p>
            </div>
          )}

          {activeSection === 'visual' && (
            <div className="settings-section">
              <h2 className="settings-section__title">
                <span className="settings-section__icon" aria-hidden="true">
                  👁️
                </span>
                Visual Settings
              </h2>

              <div className="settings-section__item">
                <div className="settings-section__item-header">
                  <label className="settings-section__label">High Contrast Mode</label>
                  <button
                    className={`toggle-switch ${settings.highContrastMode ? 'toggle-switch--on' : ''}`}
                    onClick={() => handleToggle('highContrastMode')}
                    aria-label={`High Contrast Mode: ${settings.highContrastMode ? 'On' : 'Off'}`}
                    role="switch"
                    aria-checked={settings.highContrastMode}
                  >
                    <span className="toggle-switch__slider"></span>
                  </button>
                </div>
                <p className="settings-section__description">
                  Increase color contrast for better visibility and readability.
                </p>

                {settings.highContrastMode && (
                  <div className="contrast-theme-picker" role="region" aria-live="polite">
                    <div className="contrast-theme-picker__header">
                      <h3>Contrast Themes</h3>
                      <p>Select a preset palette inspired by assistive OS themes.</p>
                    </div>
                    <div
                      className="contrast-theme-picker__grid"
                      role="radiogroup"
                      aria-label="High contrast themes"
                    >
                      {HIGH_CONTRAST_THEMES.map((theme) => {
                        const isActive =
                          (settings.highContrastTheme || DEFAULT_HIGH_CONTRAST_THEME) === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            className={`contrast-theme-card ${
                              isActive ? 'contrast-theme-card--active' : ''
                            }`}
                            role="radio"
                            aria-checked={isActive}
                            onClick={() => handleHighContrastThemeChange(theme.id)}
                          >
                            <div className="contrast-theme-card__preview" aria-hidden="true">
                              {theme.swatches.map((swatch) => (
                                <span
                                  key={swatch}
                                  className="contrast-theme-card__swatch"
                                  style={{ backgroundColor: swatch }}
                                />
                              ))}
                            </div>
                            <div className="contrast-theme-card__info">
                              <span className="contrast-theme-card__name">{theme.name}</span>
                              <span className="contrast-theme-card__description">
                                {theme.description}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="settings-section__item">
                <div className="settings-section__item-header">
                  <label className="settings-section__label">Reduced Motion</label>
                  <button
                    className={`toggle-switch ${settings.reducedMotion ? 'toggle-switch--on' : ''}`}
                    onClick={() => handleToggle('reducedMotion')}
                    aria-label={`Reduced Motion: ${settings.reducedMotion ? 'On' : 'Off'}`}
                    role="switch"
                    aria-checked={settings.reducedMotion}
                  >
                    <span className="toggle-switch__slider"></span>
                  </button>
                </div>
                <p className="settings-section__description">
                  Minimize animations and transitions (disables image zoom on game cards and button pulsation).
                </p>
              </div>

              <div className="settings-section__item">
                <div className="settings-section__item-header">
                  <label className="settings-section__label">Dark Mode</label>
                  <button
                    className={`toggle-switch ${settings.darkMode ? 'toggle-switch--on' : ''}`}
                    onClick={() => handleToggle('darkMode')}
                    aria-label={`Dark Mode: ${settings.darkMode ? 'On' : 'Off'}`}
                    role="switch"
                    aria-checked={settings.darkMode}
                  >
                    <span className="toggle-switch__slider"></span>
                  </button>
                </div>
                <p className="settings-section__description">
                  Switch to a dark color scheme for reduced eye strain in low-light environments.
                </p>
              </div>

              <p className="settings-section__info">
                Visual settings help create a more comfortable viewing experience based on your needs.
              </p>
            </div>
          )}

          <div className="settings-page__actions">
            <button
              className="settings-page__reset-button"
              onClick={() => setShowResetDialog(true)}
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetDialog && (
        <div className="dialog-overlay" onClick={() => setShowResetDialog(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="dialog__title">Reset Settings to Default?</h3>
            <p className="dialog__message">
              This will restore all accessibility settings to their default values. This action cannot be undone.
            </p>
            <div className="dialog__actions">
              <button
                className="dialog__button dialog__button--secondary"
                onClick={() => setShowResetDialog(false)}
              >
                Cancel
              </button>
              <button
                className="dialog__button dialog__button--primary"
                onClick={handleReset}
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Success Notification */}
      {showResetSuccess && (
        <div className="notification notification--success" role="alert">
          Settings have been reset to default values.
        </div>
      )}
    </main>
  );
};

export default SettingsPage;
