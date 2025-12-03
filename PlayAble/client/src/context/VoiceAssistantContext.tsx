import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { settingsApi, UserSettings } from '../services/settingsApi';
import { applyAccessibilityPreferences } from '../utils/accessibility';

/**
 * Browser Speech Recognition API interface.
 * @typedef {Object} BrowserSpeechRecognition
 * @property {() => void} start - Starts speech recognition
 * @property {() => void} stop - Stops speech recognition
 * @property {((event: any) => void) | null} onresult - Handler for recognition results
 * @property {((event: any) => void) | null} onerror - Handler for recognition errors
 * @property {(() => void) | null} onend - Handler for recognition end
 * @property {boolean} continuous - Whether recognition should continue after each result
 * @property {boolean} interimResults - Whether to return interim (partial) results
 * @property {string} lang - Language code for recognition
 */
type BrowserSpeechRecognition = {
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

/**
 * Constructor type for creating Speech Recognition instances.
 * @typedef {new () => BrowserSpeechRecognition} SpeechRecognitionConstructor
 */
type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

/**
 * Possible states for voice assistant listening.
 * @typedef {'idle' | 'awaiting' | 'listening' | 'processing' | 'error'} ListeningState
 */
type ListeningState = 'idle' | 'awaiting' | 'listening' | 'processing' | 'error';

/**
 * Value provided by the VoiceAssistantContext.
 * 
 * @interface VoiceAssistantContextValue
 * @property {(() => void)} [forceStopRecognition] - Forcefully stops recognition
 * @property {boolean} voiceInputEnabled - Whether voice input is enabled
 * @property {boolean} microphoneActive - Whether microphone is active
 * @property {ListeningState} listeningState - Current listening state
 * @property {string} statusMessage - Current status message for the user
 * @property {boolean} isIndicatorVisible - Whether the voice indicator is visible
 * @property {string} lastHeardPhrase - The last phrase heard by the assistant
 * @property {boolean} recognitionSupported - Whether speech recognition is supported
 * @property {() => void} activateFromVoiceButton - Activates voice assistant from button
 * @property {() => void} cancelListening - Cancels current listening session
 * @property {(value: boolean) => void} applyVoiceInputPreference - Applies voice input preference
 * @property {(value: boolean) => void} applyMicrophonePreference - Applies microphone preference
 */
interface VoiceAssistantContextValue {
  forceStopRecognition?: () => void;
  voiceInputEnabled: boolean;
  microphoneActive: boolean;
  listeningState: ListeningState;
  statusMessage: string;
  isIndicatorVisible: boolean;
  lastHeardPhrase: string;
  recognitionSupported: boolean;
  activateFromVoiceButton: () => void;
  cancelListening: () => void;
  applyVoiceInputPreference: (value: boolean) => void;
  applyMicrophonePreference: (value: boolean) => void;
}

/**
 * Props for the VoiceAssistantProvider component.
 * 
 * @interface VoiceAssistantProviderProps
 * @property {React.ReactNode} children - Child components to wrap
 * @property {(path: string) => void} onNavigate - Callback function for navigation
 * @property {(value: string) => void} setSearchTerm - Callback function to set search term
 */
interface VoiceAssistantProviderProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  setSearchTerm: (value: string) => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const VoiceAssistantContext = createContext<VoiceAssistantContextValue | undefined>(undefined);

/**
 * Delay in milliseconds before resetting voice assistant to idle state.
 * Gives users time to see status messages and visual feedback.
 * @constant {number}
 */
const VOICE_RESET_DELAY = 1000;

/**
 * Safari-specific hint message for activating voice assistant.
 * Safari requires user interaction before starting recognition.
 * @constant {string}
 */
const SAFARI_LISTENING_HINT =
  'Tap the Voice button or press Ctrl + Shift + V to activate listening in Safari.';

/**
 * Supported wake words for activating the voice assistant.
 * Multiple variations make activation more natural and forgiving.
 * @constant {string[]}
 */
const WAKE_WORDS = ['hey assistant', 'hey', 'assistant'];

/**
 * Navigation commands configuration.
 * Maps voice command patterns to navigation paths and announcements.
 * 
 * @type {Array<{matchers: string[], path: string, announcement: string}>}
 */
const navigationCommands: {
  matchers: string[];
  path: string;
  announcement: string;
}[] = [
  {
    matchers: [
      'open accessibility settings',
      'accessibility settings',
      'open settings',
      'voice settings',
      'settings',
      'go to settings',
      'show settings',
      'settings page',
      'access settings',
      'open the settings',
      'take me to settings',
      'navigate to settings',
      'go settings',
      'show me settings',
      'i want to see settings',
      'settings menu',
    ],
    path: '/settings',
    announcement: 'Opening accessibility settings',
  },
  {
    matchers: [
      'show recently viewed',
      'recently viewed',
      'view history',
      'show recently viewed games',
      'recently viewed games',
      'view my history',
      'show my history',
      'recent history',
      'my recent games',
      'games i viewed',
      'recent games',
      'history',
      'show history',
      'view recent',
      'recently played',
      'my recent',
      'what did i view',
      'show me recent',
    ],
    path: '/recently-viewed',
    announcement: 'Showing recently viewed games',
  },
  {
    matchers: [
      'take me to my profile',
      'open my profile',
      'profile page',
      'my profile',
      'go to my profile',
      'show my profile',
      'open profile',
      'profile',
      'my account',
      'account page',
      'user profile',
      'view profile',
      'show profile',
      'go profile',
      'open the profile',
      'take me to profile',
      'i want to see my profile',
      'show me my profile',
      'navigate to profile',
    ],
    path: '/my-profile',
    announcement: 'Opening your profile',
  },
  {
    matchers: [
      'show favorites',
      'show favourites',
      'open favorites',
      'open favourites',
      'my favorites',
      'my favourites',
      'show me all my favorite games',
      'show me all my favourite games',
      'favorite games',
      'favourite games',
      'go to favorites',
      'go to favourites',
      'favorites',
      'favourites',
      'favorites page',
      'favourites page',
      'my saved games',
      'saved games',
      'bookmarked games',
      'my bookmarks',
      'liked games',
      'games i like',
      'show favorites list',
      'show favourites list',
      'open my favorites',
      'open my favourites',
      'i want to see my favorites',
      'i want to see my favourites',
      'take me to favorites',
      'take me to favourites',
      'go favorites',
      'go favourites',
    ],
    path: '/favourites',
    announcement: 'Opening favourites',
  },
  {
    matchers: [
      'go home',
      'go to browse',
      'open browse',
      'browse games',
      'show browse',
      'browse page',
      'home page',
      'go to home',
      'home',
      'browse',
      'games',
      'show games',
      'all games',
      'game list',
      'catalog',
      'game catalog',
      'show catalog',
      'game library',
      'library',
      'main page',
      'main',
      'back to home',
      'back home',
      'take me home',
      'go back home',
      'i want to browse',
      'show me games',
      'list games',
      'view games',
    ],
    path: '/browse',
    announcement: 'Opening browse page',
  },
  {
    matchers: [
      'open inbox',
      'show my inbox',
      'go to inbox',
      'inbox',
      'messages',
      'my messages',
      'notifications',
      'my notifications',
      'show messages',
      'open messages',
      'view inbox',
      'check inbox',
      'i want to see my inbox',
    ],
    path: '/inbox',
    announcement: 'Opening inbox',
  },
  {
    matchers: [
      'i want to report this game',
      'report this game',
      'report a game',
      'open report',
      'go to report',
      'report page',
      'file a report',
      'report',
      'make a report',
      'submit a report',
      'report something',
      'i need to report',
      'report issue',
      'report problem',
      'report bug',
    ],
    path: '/report',
    announcement: 'Opening report page',
  },
  {
    matchers: [
      'about',
      'about page',
      'go to about',
      'show about',
      'about us',
      'information',
      'more info',
      'learn more',
      'what is this',
      'tell me about',
    ],
    path: '/about',
    announcement: 'Opening about page',
  },
];

const accessibilitySearchMap: { [key: string]: string } = {
  'subtitle support': 'subtitle',
  'subtitles': 'subtitle',
  'subtitle': 'subtitle',
  'colorblind mode': 'colorblind',
  'colorblind': 'colorblind',
  'color blind': 'colorblind',
  'one-handed controls': 'one hand',
  'one handed': 'one hand',
  'one hand controls': 'one hand',
  'screen reader friendly': 'screen reader',
  'screen reader': 'screen reader',
  'screen reader support': 'screen reader',
  'audio description': 'audio',
  'audio support': 'audio',
  'hearing support': 'hearing',
  'vision support': 'vision',
  'motor support': 'motor',
  'cognitive support': 'cognitive',
};

const genreSearchMap: { [key: string]: string } = {
  'puzzle games': 'puzzle',
  'puzzle': 'puzzle',
  'adventure games': 'adventure',
  'adventure': 'adventure',
  'action games': 'action',
  'action': 'action',
  'strategy games': 'strategy',
  'strategy': 'strategy',
  'simulation games': 'simulation',
  'simulation': 'simulation',
  'rhythm games': 'rhythm',
  'rhythm': 'rhythm',
  'arcade games': 'arcade',
  'arcade': 'arcade',
  'narrative games': 'narrative',
  'narrative': 'narrative',
  'mystery games': 'mystery',
  'mystery': 'mystery',
  'endless runner': 'endless runner',
  'endless runner games': 'endless runner',
  'open world': 'open world',
  'open world games': 'open world',
  'idle games': 'idle',
  'idle': 'idle',
};

/**
 * Extracts a search term from a voice command.
 * Handles various command patterns including genre searches, accessibility filters,
 * and general search queries. Maps natural language to search terms.
 * 
 * @param {string} command - The voice command to parse
 * @returns {string | null} The extracted search term, or null if no search term found
 */
const extractSearchTerm = (command: string): string | null => {
  const normalized = command.trim().toLowerCase();

  for (const [key, value] of Object.entries(accessibilitySearchMap)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  for (const [key, value] of Object.entries(genreSearchMap)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  if (normalized.includes('clear') && (normalized.includes('filter') || normalized.includes('search'))) {
    return '';
  }

  const searchPrefixes = [
    'search for',
    'show me',
    'show',
    'find',
    'look for',
    'filter by',
  ];

  for (const prefix of searchPrefixes) {
    if (normalized.startsWith(prefix)) {
      let term = normalized.slice(prefix.length).trim();
      if (term.startsWith('for ')) {
        term = term.replace(/^for\s+/, '');
      }
      term = term.replace(/^all\s+/, '');
      term = term.replace(/(games|game)$/, '').trim();
      
      if (genreSearchMap[term]) {
        return genreSearchMap[term];
      }
      if (accessibilitySearchMap[term]) {
        return accessibilitySearchMap[term];
      }
      
      return term || null;
    }
  }

  if (normalized.includes('games with')) {
    const start = normalized.indexOf('games with') + 'games with'.length;
    let term = normalized.slice(start).trim();
    
    if (accessibilitySearchMap[term]) {
      return accessibilitySearchMap[term];
    }
    
    return term || null;
  }

  if (normalized.match(/^(all|show|find|search)\s+.+\s+games?$/)) {
    let term = normalized.replace(/^(all|show|find|search)\s+/, '').replace(/\s+games?$/, '').trim();
    
    if (genreSearchMap[term]) {
      return genreSearchMap[term];
    }
    if (accessibilitySearchMap[term]) {
      return accessibilitySearchMap[term];
    }
    
    return term || null;
  }

  return null;
};

/**
 * VoiceAssistantProvider Component
 * 
 * React context provider for voice assistant functionality. Manages speech recognition,
 * command processing, navigation, and settings control through voice commands.
 * 
 * Features:
 * - Wake word detection ("Hey Assistant", "Hey", "Assistant")
 * - Navigation commands (settings, profile, favorites, etc.)
 * - Search functionality via voice
 * - Settings control (high contrast, dark mode, microphone, etc.)
 * - Safari-specific handling for user interaction requirements
 * - Continuous listening with automatic restart
 * 
 * @component
 * @param {VoiceAssistantProviderProps} props - Component props
 * @returns {JSX.Element} The provider component
 */
export const VoiceAssistantProvider: React.FC<VoiceAssistantProviderProps> = ({
  children,
  onNavigate,
  setSearchTerm,
}) => {
  const { userSettings, user, updateUserSettingsState } = useAuth();
  const [voiceInputEnabled, setVoiceInputEnabled] = useState<boolean>(
    userSettings?.voiceInput ?? true
  );
  const [microphoneActive, setMicrophoneActive] = useState<boolean>(
    userSettings?.microphoneActive ?? true
  );
  const [listeningState, setListeningState] = useState<ListeningState>('idle');
  const [statusMessage, setStatusMessage] = useState('Say "Hey", "Assistant", or "Hey Assistant" to start');
  const [isIndicatorVisible, setIsIndicatorVisible] = useState(false);
  const [lastHeardPhrase, setLastHeardPhrase] = useState('');
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const hideIndicatorRef = useRef<number | null>(null);
  const safariActivationRef = useRef(false);

  // I detect Safari specifically because it has different recognition behavior requiring user activation
  const isSafari =
    typeof navigator !== 'undefined' &&
    /safari/i.test(navigator.userAgent) &&
    !/chrome|crios|android/i.test(navigator.userAgent);

  // I combine all conditions into one flag to simplify checks throughout the component
  const canListen = voiceInputEnabled && microphoneActive && recognitionSupported;

  const clearHideTimer = useCallback(() => {
    if (hideIndicatorRef.current) {
      window.clearTimeout(hideIndicatorRef.current);
      hideIndicatorRef.current = null;
    }
  }, []);

  // I use a delayed reset to give users time to see feedback before returning to idle, and support keeping listening active for continuous interactions
  const resetToIdle = useCallback(
    (delay = VOICE_RESET_DELAY, keepListening = false) => {
      clearHideTimer();
      if (keepListening && safariActivationRef.current && listeningState === 'listening') {
        return;
      }
      hideIndicatorRef.current = window.setTimeout(() => {
        if (keepListening && safariActivationRef.current && canListen) {
          setListeningState('listening');
          setStatusMessage('Listening... Speak now or say "cancel"');
          setIsIndicatorVisible(true);
          if (recognitionRef.current && canListen) {
            try {
              recognitionRef.current.start();
            } catch (error: any) {
              if (error?.name !== 'InvalidStateError') {
                console.error('Speech recognition start error:', error);
              }
            }
          }
        } else {
          setIsIndicatorVisible(false);
          setListeningState(canListen ? 'awaiting' : 'idle');
          setStatusMessage(
            canListen
              ? safariActivationRef.current || !isSafari
                ? 'Say "Hey", "Assistant", or "Hey Assistant" to start'
                : SAFARI_LISTENING_HINT
              : 'Voice assistant disabled'
          );
        }
      }, delay);
    },
    [canListen, clearHideTimer, isSafari, listeningState]
  );

  // I check Safari activation state before starting recognition because Safari requires explicit user interaction
  const ensureRecognition = useCallback(
    (requireActivation = false) => {
      if (!recognitionRef.current || !canListen) {
        return;
      }

      if (requireActivation && isSafari && !safariActivationRef.current) {
        return;
      }

      try {
        recognitionRef.current.start();
      } catch (error: any) {
        if (error?.name !== 'InvalidStateError') {
          console.error('Speech recognition start error:', error);
        }
      }
    },
    [canListen, isSafari]
  );

  const ensureRecognitionUnlocked = useCallback(() => {
    if (!recognitionRef.current || !canListen) {
      return;
    }
    try {
      try {
        recognitionRef.current.start();
      } catch (error: any) {
        if (error?.name === 'InvalidStateError') {
          return;
        }
        setTimeout(() => {
          if (recognitionRef.current && canListen) {
            try {
              recognitionRef.current.start();
            } catch (retryError: any) {
              if (retryError?.name !== 'InvalidStateError') {
                console.error('Speech recognition start error:', retryError);
              }
            }
          }
        }, 100);
      }
    } catch (error: any) {
      if (error?.name !== 'InvalidStateError') {
        console.error('Speech recognition start error:', error);
      }
    }
  }, [canListen]);

  const updateSetting = useCallback(
    async (settingKey: keyof UserSettings, value: boolean | string) => {
      if (settingKey === 'voiceInput') {
        setVoiceInputEnabled(value as boolean);
      } else if (settingKey === 'microphoneActive') {
        setMicrophoneActive(value as boolean);
      }

      if (!user?.id) {
        const newSettings = {
          ...userSettings,
          [settingKey]: value,
        } as UserSettings;
        applyAccessibilityPreferences(newSettings);
        updateUserSettingsState(newSettings);
        return;
      }

      try {
        const updated = await settingsApi.updateSettings(user.id, {
          [settingKey]: value,
        } as Partial<UserSettings>);
        updateUserSettingsState(updated);
        applyAccessibilityPreferences(updated);
      } catch (error) {
        console.error('Failed to update setting:', error);
        setStatusMessage('Failed to update setting. Please try again.');
        setListeningState('error');
        setIsIndicatorVisible(true);
      }
    },
    [user?.id, userSettings, updateUserSettingsState]
  );

  /**
   * Processes a voice command and executes the appropriate action.
   * Handles navigation commands, search queries, settings toggles, and cancel commands.
   * 
   * @param {string} commandRaw - The raw voice command text
   * @param {boolean} [wasActivatedFromButton=false] - Whether command was activated from button press
   * @returns {void}
   */
  const processCommand = useCallback(
    (commandRaw: string, wasActivatedFromButton = false) => {
      const command = commandRaw.trim();
      if (!command) {
        setStatusMessage('Waiting for your command');
        return;
      }

      setLastHeardPhrase(command);
      // I normalize commands to lowercase to make matching case-insensitive and more forgiving
      const normalized = command.toLowerCase();

      // I check for cancel commands first to allow users to exit quickly at any time
      if (normalized.includes('cancel') || normalized.includes('stop listening') || normalized.includes('stop')) {
        setStatusMessage('Listening cancelled');
        setListeningState('idle');
        setIsIndicatorVisible(false);
        safariActivationRef.current = false;
        recognitionRef.current?.stop();
        resetToIdle(500, false);
        return;
      }

      if (
        (normalized.includes('high contrast') || normalized.includes('high-contrast')) &&
        (normalized.includes('on') || normalized.includes('enable') || normalized.includes('turn on') || normalized.includes('activate'))
      ) {
        setStatusMessage('Turning on high contrast mode');
        setListeningState('processing');
        setIsIndicatorVisible(true);
        updateSetting('highContrastMode', true);
        resetToIdle(800, wasActivatedFromButton);
        return;
      }

      if (
        (normalized.includes('high contrast') || normalized.includes('high-contrast')) &&
        (normalized.includes('off') || normalized.includes('disable') || normalized.includes('turn off') || normalized.includes('deactivate'))
      ) {
        setStatusMessage('Turning off high contrast mode');
        setListeningState('processing');
        setIsIndicatorVisible(true);
        updateSetting('highContrastMode', false);
        resetToIdle(800, wasActivatedFromButton);
        return;
      }

      if (
        (normalized.includes('dark mode') || normalized.includes('dark-mode') || normalized.includes('dark')) &&
        (normalized.includes('on') || normalized.includes('enable') || normalized.includes('turn on') || normalized.includes('activate'))
      ) {
        setStatusMessage('Turning on dark mode');
        setListeningState('processing');
        setIsIndicatorVisible(true);
        updateSetting('darkMode', true);
        resetToIdle(800, wasActivatedFromButton);
        return;
      }

      if (
        (normalized.includes('dark mode') || normalized.includes('dark-mode') || normalized.includes('dark')) &&
        (normalized.includes('off') || normalized.includes('disable') || normalized.includes('turn off') || normalized.includes('deactivate'))
      ) {
        setStatusMessage('Turning off dark mode');
        setListeningState('processing');
        setIsIndicatorVisible(true);
        updateSetting('darkMode', false);
        resetToIdle(800, wasActivatedFromButton);
        return;
      }

      if (
        (normalized.includes('mic') || normalized.includes('microphone')) &&
        (normalized.includes('off') || normalized.includes('disable') || normalized.includes('turn off') || normalized.includes('mute'))
      ) {
        setStatusMessage('Turning off microphone');
        setListeningState('processing');
        setIsIndicatorVisible(true);
        updateSetting('microphoneActive', false);
        resetToIdle(800, wasActivatedFromButton);
        return;
      }

      if (
        (normalized.includes('mic') || normalized.includes('microphone')) &&
        (normalized.includes('on') || normalized.includes('enable') || normalized.includes('turn on') || normalized.includes('unmute'))
      ) {
        setStatusMessage('Turning on microphone');
        setListeningState('processing');
        setIsIndicatorVisible(true);
        updateSetting('microphoneActive', true);
        resetToIdle(800, wasActivatedFromButton);
        return;
      }

      if (
        (normalized.includes('voice input') || normalized.includes('voice-input') || normalized.includes('voice')) &&
        (normalized.includes('off') || normalized.includes('disable') || normalized.includes('turn off') || normalized.includes('deactivate'))
      ) {
        setStatusMessage('Turning off voice input');
        setListeningState('processing');
        setIsIndicatorVisible(true);
        updateSetting('voiceInput', false);
        resetToIdle(800, wasActivatedFromButton);
        return;
      }

      if (
        (normalized.includes('voice input') || normalized.includes('voice-input') || normalized.includes('voice')) &&
        (normalized.includes('on') || normalized.includes('enable') || normalized.includes('turn on') || normalized.includes('activate'))
      ) {
        setStatusMessage('Turning on voice input');
        setListeningState('processing');
        setIsIndicatorVisible(true);
        updateSetting('voiceInput', true);
        resetToIdle(800, wasActivatedFromButton);
        return;
      }

      // I check navigation commands before search to prioritize explicit navigation over search queries
      const navMatch = navigationCommands.find((item) =>
        item.matchers.some((matcher) => normalized.includes(matcher))
      );

      if (navMatch) {
        setStatusMessage(navMatch.announcement);
        setListeningState('processing');
        setIsIndicatorVisible(true);
        onNavigate(navMatch.path);
        resetToIdle(800, wasActivatedFromButton);
        return;
      }

      if (
        (normalized.includes('clear') || normalized.includes('remove') || normalized.includes('reset')) &&
        (normalized.includes('filter') ||
          normalized.includes('search') ||
          normalized.includes('all') ||
          normalized.includes('everything'))
      ) {
        setStatusMessage('Clearing all filters and search');
        setListeningState('processing');
        setIsIndicatorVisible(true);
        onNavigate('/browse');
        setSearchTerm('');
        resetToIdle(800, wasActivatedFromButton);
        return;
      }

      // I extract search terms last as a fallback, allowing natural language queries after checking for specific commands
      const searchTerm = extractSearchTerm(normalized);
      if (searchTerm !== null) {
        if (searchTerm === '') {
          setStatusMessage('Clearing search');
          setListeningState('processing');
          setIsIndicatorVisible(true);
          onNavigate('/browse');
          setSearchTerm('');
        } else {
          setStatusMessage(`Searching for "${searchTerm}"`);
          setListeningState('processing');
          setIsIndicatorVisible(true);
          onNavigate('/browse');
          setSearchTerm(searchTerm);
        }
        resetToIdle(800, wasActivatedFromButton);
        return;
      }

      setStatusMessage("I didn't understand. Try: 'go to favorites', 'search for games', 'open settings', 'turn on dark mode', or 'turn off microphone'.");
      setListeningState('error');
      setIsIndicatorVisible(true);
      resetToIdle(1200, wasActivatedFromButton);
    },
    [onNavigate, resetToIdle, setSearchTerm, updateSetting]
  );

  /**
   * Handles speech recognition results.
   * Detects wake words, activates listening, and processes commands.
   * Supports natural activation phrases where wake word and command are spoken together.
   * 
   * @param {string} transcript - The recognized speech transcript
   * @returns {void}
   */
  const handleSpeech = useCallback(
    (transcript: string) => {
      if (!canListen || !transcript) return;

      const normalized = transcript.trim().toLowerCase();

      const isCurrentlyListening = listeningState === 'listening' || listeningState === 'processing';
      const wasActivatedFromButton = safariActivationRef.current;

      // I check for wake words when not actively listening to allow natural activation phrases
      if (!isCurrentlyListening) {
        let wakeWordFound = false;
        let withoutWakeWord = normalized;
        let matchedWakeWord = '';

        // I check for the longest wake word first to avoid partial matches
        if (normalized.includes('hey assistant')) {
          wakeWordFound = true;
          matchedWakeWord = 'hey assistant';
        } else if (normalized.includes('hey')) {
          wakeWordFound = true;
          matchedWakeWord = 'hey';
        } else if (normalized.includes('assistant')) {
          wakeWordFound = true;
          matchedWakeWord = 'assistant';
        }

        if (wakeWordFound) {
          // I remove the wake word from the command so users can say the wake word and command in one phrase
          const regex = new RegExp(matchedWakeWord.replace(/\s+/g, '\\s+'), 'i');
          withoutWakeWord = normalized.replace(regex, '').trim();
          
          setStatusMessage('Listening... Speak now');
          setIsIndicatorVisible(true);
          setListeningState('listening');
          safariActivationRef.current = true;
          
          if (recognitionRef.current && canListen) {
            try {
              recognitionRef.current.start();
            } catch (error: any) {
              if (error?.name !== 'InvalidStateError') {
                console.error('Recognition start error after wake word:', error);
              }
            }
          }
          
          // I process any command that came with the wake word immediately for faster response
          if (withoutWakeWord) {
            setTimeout(() => {
              processCommand(withoutWakeWord, false);
            }, 50);
          }
          return;
        }
        
        return;
      }

      let commandToProcess = normalized;
      for (const wakeWord of WAKE_WORDS) {
        if (normalized.includes(wakeWord)) {
          const regex = new RegExp(wakeWord.replace(/\s+/g, '\\s+'), 'i');
          commandToProcess = normalized.replace(regex, '').trim();
          break;
        }
      }
      
      if (commandToProcess) {
        processCommand(commandToProcess, wasActivatedFromButton);
      }
    },
    [canListen, listeningState, processCommand]
  );

  const handleRecognitionError = useCallback(
    (event: { error: string }) => {
      const isActivelyListening = safariActivationRef.current && listeningState === 'listening';
      
      if (event.error === 'no-speech') {
        if (isActivelyListening) {
          setStatusMessage("I didn't hear anything. Try speaking again.");
          setListeningState('listening');
          setIsIndicatorVisible(true);
        } else {
          setStatusMessage("Sorry, I didn't catch that");
          setListeningState('error');
          setIsIndicatorVisible(true);
          resetToIdle(1000, false);
        }
      } else if (event.error === 'aborted') {
        return;
      } else {
        console.error('Speech recognition error:', event.error);
        if (isActivelyListening) {
          setStatusMessage('Encountered an error, but still listening. Try again.');
          setListeningState('listening');
          setIsIndicatorVisible(true);
        } else {
          setStatusMessage('Voice assistant encountered an error');
          setListeningState('error');
          setIsIndicatorVisible(true);
          resetToIdle(2500, false);
        }
      }
    },
    [resetToIdle, listeningState]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      setStatusMessage('Voice control is unavailable in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (!result) return;
      handleSpeech(result[0]?.transcript || '');
    };

    recognition.onerror = handleRecognitionError;
    // I restart recognition automatically when it ends to maintain continuous listening, but only if we're in an active listening state
    recognition.onend = () => {
      if (canListen && recognitionRef.current) {
        const shouldKeepListening = safariActivationRef.current || listeningState === 'listening' || listeningState === 'processing';
        if (shouldKeepListening) {
          setTimeout(() => {
            if (recognitionRef.current && canListen && (safariActivationRef.current || listeningState === 'listening')) {
              try {
                recognitionRef.current.start();
              } catch (error: any) {
                if (error?.name !== 'InvalidStateError') {
                  console.error('Speech recognition restart error:', error);
                }
              }
            }
          }, 100);
        } else {
          ensureRecognition(true);
        }
      }
    };

    if (!isSafari) {
      ensureRecognitionUnlocked();
    } else if (safariActivationRef.current) {
      ensureRecognitionUnlocked();
    }

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.stop();
    };
  }, [canListen, ensureRecognition, ensureRecognitionUnlocked, handleRecognitionError, handleSpeech, isSafari]);

  useEffect(() => {
    if (!recognitionSupported) return;

    if (safariActivationRef.current && (listeningState === 'listening' || listeningState === 'processing')) {
      if (canListen && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error: any) {
          if (error?.name !== 'InvalidStateError') {
            console.error('Recognition start error in useEffect:', error);
          }
        }
      }
      return;
    }

    if (canListen) {
      if (listeningState !== 'listening' && listeningState !== 'processing') {
        setListeningState('idle');
        setStatusMessage('Say "Hey", "Assistant", or "Hey Assistant" to start');
      }
      if (!isSafari) {
        ensureRecognitionUnlocked();
      } else if (safariActivationRef.current) {
        ensureRecognitionUnlocked();
      }
    } else {
      if (!safariActivationRef.current || listeningState !== 'listening') {
        setListeningState('idle');
        setIsIndicatorVisible(false);
        setStatusMessage(
          !voiceInputEnabled
            ? 'Voice input is switched off'
            : 'Microphone is muted'
        );
        recognitionRef.current?.stop();
      }
    }
  }, [canListen, ensureRecognitionUnlocked, isSafari, recognitionSupported, voiceInputEnabled, listeningState]);

  /**
   * Activates voice assistant from button press or keyboard shortcut.
   * Validates that voice input and microphone are enabled before activating.
   * Sets up Safari activation state for proper recognition handling.
   * 
   * @returns {void}
   */
  const activateFromVoiceButton = useCallback(() => {
    if (!voiceInputEnabled) {
      setStatusMessage('Turn Voice Input on in Accessibility Settings');
      setListeningState('error');
      setIsIndicatorVisible(true);
      resetToIdle(1500, false);
      return;
    }
    if (!microphoneActive) {
      setStatusMessage('Microphone muted — enable it to use voice commands');
      setListeningState('error');
      setIsIndicatorVisible(true);
      resetToIdle(1500, false);
      return;
    }

    clearHideTimer();
    
    safariActivationRef.current = true;
    setIsIndicatorVisible(true);
    setListeningState('listening');
    setStatusMessage('Listening... Say "Hey", "Assistant", or your command');
    
    setTimeout(() => {
      if (recognitionRef.current && canListen) {
        try {
          try {
            recognitionRef.current.stop();
          } catch (e) {
          }
          setTimeout(() => {
            if (recognitionRef.current && canListen && safariActivationRef.current) {
              try {
                recognitionRef.current.start();
              } catch (error: any) {
                if (error?.name !== 'InvalidStateError') {
                  console.error('Recognition start error in activateFromVoiceButton:', error);
                }
              }
            }
          }, 50);
        } catch (error: any) {
          console.error('Recognition error in activateFromVoiceButton:', error);
        }
      }
    }, 10);
  }, [canListen, microphoneActive, resetToIdle, voiceInputEnabled, clearHideTimer]);

  const applyVoiceInputPreference = useCallback(
    (value: boolean) => {
      setVoiceInputEnabled(value);
      if (!value) {
        setIsIndicatorVisible(false);
        setListeningState('idle');
        setStatusMessage('Voice input is switched off');
        recognitionRef.current?.stop();
      } else if (microphoneActive && recognitionSupported) {
        setListeningState('idle');
        setStatusMessage('Say "Hey", "Assistant", or "Hey Assistant" to start');
        if (!isSafari) {
          ensureRecognitionUnlocked();
        } else if (safariActivationRef.current) {
          ensureRecognitionUnlocked();
        }
      }
    },
    [ensureRecognitionUnlocked, isSafari, microphoneActive, recognitionSupported]
  );

  const applyMicrophonePreference = useCallback(
    (value: boolean) => {
      setMicrophoneActive(value);
      if (!value) {
        setIsIndicatorVisible(false);
        setListeningState('idle');
        setStatusMessage('Microphone is muted');
        recognitionRef.current?.stop();
      } else if (voiceInputEnabled && recognitionSupported) {
        setListeningState('idle');
        setStatusMessage('Say "Hey", "Assistant", or "Hey Assistant" to start');
        if (!isSafari) {
          ensureRecognitionUnlocked();
        } else if (safariActivationRef.current) {
          ensureRecognitionUnlocked();
        }
      }
    },
    [ensureRecognitionUnlocked, isSafari, recognitionSupported, voiceInputEnabled]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        safariActivationRef.current = true;
        activateFromVoiceButton();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [activateFromVoiceButton]);

  useEffect(() => {
    if (!userSettings) return;
    applyVoiceInputPreference(userSettings.voiceInput);
    applyMicrophonePreference(userSettings.microphoneActive);
  }, [applyMicrophonePreference, applyVoiceInputPreference, userSettings]);

  useEffect(
    () => () => {
      clearHideTimer();
    },
    [clearHideTimer]
  );

  /**
   * Cancels the current listening session.
   * Stops recognition, resets state to idle, and hides the indicator.
   * 
   * @returns {void}
   */
  const cancelListening = useCallback(() => {
    setStatusMessage('Listening cancelled');
    setListeningState('idle');
    setIsIndicatorVisible(false);
    safariActivationRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        if (typeof (recognitionRef.current as any).abort === 'function') {
          (recognitionRef.current as any).abort();
        }
      } catch {
      }
    }
    resetToIdle(500, false);
  }, [resetToIdle]);

  const forceStopRecognition = useCallback(() => {
    setListeningState('idle');
    setIsIndicatorVisible(false);
    safariActivationRef.current = false;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        if (typeof (recognitionRef.current as any).abort === 'function') {
          (recognitionRef.current as any).abort();
        }
      } catch {
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      voiceInputEnabled,
      microphoneActive,
      listeningState,
      statusMessage,
      isIndicatorVisible,
      lastHeardPhrase,
      recognitionSupported,
      activateFromVoiceButton,
      cancelListening,
      forceStopRecognition,
      applyVoiceInputPreference,
      applyMicrophonePreference,
    }),
    [
      activateFromVoiceButton,
      applyMicrophonePreference,
      applyVoiceInputPreference,
      cancelListening,
      forceStopRecognition,
      isIndicatorVisible,
      lastHeardPhrase,
      listeningState,
      microphoneActive,
      recognitionSupported,
      statusMessage,
      voiceInputEnabled,
    ]
  );

  return <VoiceAssistantContext.Provider value={value}>{children}</VoiceAssistantContext.Provider>;
};

/**
 * Hook to access the VoiceAssistantContext.
 * 
 * @returns {VoiceAssistantContextValue} The voice assistant context value
 * @throws {Error} If used outside of VoiceAssistantProvider
 * 
 * @example
 * ```tsx
 * const { voiceInputEnabled, activateFromVoiceButton } = useVoiceAssistant();
 * ```
 */
export const useVoiceAssistant = () => {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error('useVoiceAssistant must be used within VoiceAssistantProvider');
  }
  return context;
};

