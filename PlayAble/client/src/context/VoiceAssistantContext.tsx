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

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type ListeningState = 'idle' | 'awaiting' | 'listening' | 'processing' | 'error';

interface VoiceAssistantContextValue {
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

const VOICE_RESET_DELAY = 1000; // Reduced from 1800ms for faster responses
const SAFARI_LISTENING_HINT =
  'Tap the Voice button or press Ctrl + Shift + V to activate listening in Safari.';

// Wake words that activate listening
const WAKE_WORDS = ['hey assistant', 'hey', 'assistant'];

const navigationCommands: {
  matchers: string[];
  path: string;
  announcement: string;
}[] = [
  // Settings
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
  // Recently Viewed
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
  // Profile
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
  // Favourites
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
  // Browse/Home
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
  // Inbox
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
  // Report
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
  // About
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

// Map accessibility-related voice commands to search terms
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

// Map genre voice commands to search terms
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

const extractSearchTerm = (command: string): string | null => {
  const normalized = command.trim().toLowerCase();

  // Check for accessibility-related searches first
  for (const [key, value] of Object.entries(accessibilitySearchMap)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  // Check for genre searches
  for (const [key, value] of Object.entries(genreSearchMap)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  // Handle "clear all my search filters" or similar
  if (normalized.includes('clear') && (normalized.includes('filter') || normalized.includes('search'))) {
    return ''; // Empty string to clear search
  }

  // Standard search prefix extraction
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
      
      // Check if it's a genre or accessibility term
      if (genreSearchMap[term]) {
        return genreSearchMap[term];
      }
      if (accessibilitySearchMap[term]) {
        return accessibilitySearchMap[term];
      }
      
      return term || null;
    }
  }

  // Handle "games with X" pattern
  if (normalized.includes('games with')) {
    const start = normalized.indexOf('games with') + 'games with'.length;
    let term = normalized.slice(start).trim();
    
    // Check accessibility map
    if (accessibilitySearchMap[term]) {
      return accessibilitySearchMap[term];
    }
    
    return term || null;
  }

  // Handle "all X games" pattern
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

  const isSafari =
    typeof navigator !== 'undefined' &&
    /safari/i.test(navigator.userAgent) &&
    !/chrome|crios|android/i.test(navigator.userAgent);

  const canListen = voiceInputEnabled && microphoneActive && recognitionSupported;

  const clearHideTimer = useCallback(() => {
    if (hideIndicatorRef.current) {
      window.clearTimeout(hideIndicatorRef.current);
      hideIndicatorRef.current = null;
    }
  }, []);

  const resetToIdle = useCallback(
    (delay = VOICE_RESET_DELAY, keepListening = false) => {
      clearHideTimer();
      // Don't reset if we're actively listening from button activation
      if (keepListening && safariActivationRef.current && listeningState === 'listening') {
        return; // Keep listening, don't reset
      }
      hideIndicatorRef.current = window.setTimeout(() => {
        // Check again if we should keep listening (state might have changed)
        if (keepListening && safariActivationRef.current && canListen) {
          // Keep listening if activated from button
          setListeningState('listening');
          setStatusMessage('Listening... Speak now or say "cancel"');
          setIsIndicatorVisible(true);
          // Ensure recognition is still running - will be defined later
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

  const ensureRecognition = useCallback(
    (requireActivation = false) => {
      if (!recognitionRef.current || !canListen) {
        return;
      }

      if (requireActivation && isSafari && !safariActivationRef.current) {
        return;
      }

      try {
        // Check if already started to avoid InvalidStateError
        recognitionRef.current.start();
      } catch (error: any) {
        // InvalidStateError means it's already running, which is fine
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
      // Try to start immediately first
      try {
        recognitionRef.current.start();
      } catch (error: any) {
        // If already running, that's fine
        if (error?.name === 'InvalidStateError') {
          return; // Already running, no need to retry
        }
        // For other errors, try again after a delay
        setTimeout(() => {
          if (recognitionRef.current && canListen) {
            try {
              recognitionRef.current.start();
            } catch (retryError: any) {
              // InvalidStateError means it's already running, which is fine
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

  // Helper function to update settings
  const updateSetting = useCallback(
    async (settingKey: keyof UserSettings, value: boolean | string) => {
      // Update local state immediately for voice input and microphone
      if (settingKey === 'voiceInput') {
        setVoiceInputEnabled(value as boolean);
      } else if (settingKey === 'microphoneActive') {
        setMicrophoneActive(value as boolean);
      }

      if (!user?.id) {
        // For non-logged-in users, just apply locally
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

  const processCommand = useCallback(
    (commandRaw: string, wasActivatedFromButton = false) => {
      const command = commandRaw.trim();
      if (!command) {
        setStatusMessage('Waiting for your command');
        return;
      }

      setLastHeardPhrase(command);
      const normalized = command.toLowerCase();

      // Handle cancel command
      if (normalized.includes('cancel') || normalized.includes('stop listening') || normalized.includes('stop')) {
        setStatusMessage('Listening cancelled');
        setListeningState('idle');
        setIsIndicatorVisible(false);
        safariActivationRef.current = false;
        recognitionRef.current?.stop();
        resetToIdle(500, false);
        return;
      }

      // Handle settings commands (high contrast, dark mode, mic, voice input)
      // High contrast mode
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

      // Dark mode
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

      // Microphone
      if (
        (normalized.includes('mic') || normalized.includes('microphone')) &&
        (normalized.includes('off') || normalized.includes('disable') || normalized.includes('turn off') || normalized.includes('mute'))
      ) {
        setStatusMessage('Turning off microphone');
        setListeningState('processing');
        setIsIndicatorVisible(true);
        updateSetting('microphoneActive', false);
        // applyMicrophonePreference will be called via useEffect when userSettings updates
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
        // applyMicrophonePreference will be called via useEffect when userSettings updates
        resetToIdle(800, wasActivatedFromButton);
        return;
      }

      // Voice input
      if (
        (normalized.includes('voice input') || normalized.includes('voice-input') || normalized.includes('voice')) &&
        (normalized.includes('off') || normalized.includes('disable') || normalized.includes('turn off') || normalized.includes('deactivate'))
      ) {
        setStatusMessage('Turning off voice input');
        setListeningState('processing');
        setIsIndicatorVisible(true);
        updateSetting('voiceInput', false);
        // applyVoiceInputPreference will be called via useEffect when userSettings updates
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
        // applyVoiceInputPreference will be called via useEffect when userSettings updates
        resetToIdle(800, wasActivatedFromButton);
        return;
      }

      // Check for navigation commands
      const navMatch = navigationCommands.find((item) =>
        item.matchers.some((matcher) => normalized.includes(matcher))
      );

      if (navMatch) {
        setStatusMessage(navMatch.announcement);
        setListeningState('processing');
        setIsIndicatorVisible(true);
        // Navigate immediately for faster response
        onNavigate(navMatch.path);
        resetToIdle(800, wasActivatedFromButton); // Reduced delay
        return;
      }

      // Handle clear filters/search - more variations
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
        resetToIdle(800, wasActivatedFromButton); // Reduced delay
        return;
      }

      // Extract and process search terms
      const searchTerm = extractSearchTerm(normalized);
      if (searchTerm !== null) {
        if (searchTerm === '') {
          // Clear search
          setStatusMessage('Clearing search');
          setListeningState('processing');
          setIsIndicatorVisible(true);
          onNavigate('/browse');
          setSearchTerm('');
        } else {
          // Perform search
          setStatusMessage(`Searching for "${searchTerm}"`);
          setListeningState('processing');
          setIsIndicatorVisible(true);
          onNavigate('/browse');
          setSearchTerm(searchTerm);
        }
        resetToIdle(800, wasActivatedFromButton); // Reduced delay
        return;
      }

      // If no match found - try to be more helpful
      setStatusMessage("I didn't understand. Try: 'go to favorites', 'search for games', 'open settings', 'turn on dark mode', or 'turn off microphone'.");
      setListeningState('error');
      setIsIndicatorVisible(true);
      resetToIdle(1200, wasActivatedFromButton); // Slightly longer for error messages
    },
    [onNavigate, resetToIdle, setSearchTerm, updateSetting]
  );

  const handleSpeech = useCallback(
    (transcript: string) => {
      if (!canListen || !transcript) return;

      const normalized = transcript.trim().toLowerCase();

      // Check if we're in listening mode
      const isCurrentlyListening = listeningState === 'listening' || listeningState === 'processing';
      const wasActivatedFromButton = safariActivationRef.current;

      // Always check for wake words first, even when in awaiting mode
      if (!isCurrentlyListening) {
        // Look for any wake word (hey assistant, hey, or assistant)
        // Check in order: longest first to avoid partial matches
        let wakeWordFound = false;
        let withoutWakeWord = normalized;
        let matchedWakeWord = '';

        // Check for "hey assistant" first (longest)
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
          // Remove the wake word and any following whitespace
          const regex = new RegExp(matchedWakeWord.replace(/\s+/g, '\\s+'), 'i');
          withoutWakeWord = normalized.replace(regex, '').trim();
          
          setStatusMessage('Listening... Speak now');
          setIsIndicatorVisible(true);
          setListeningState('listening');
          safariActivationRef.current = true; // Mark as activated
          
          // Ensure recognition keeps running
          if (recognitionRef.current && canListen) {
            try {
              recognitionRef.current.start();
            } catch (error: any) {
              if (error?.name !== 'InvalidStateError') {
                console.error('Recognition start error after wake word:', error);
              }
            }
          }
          
          if (withoutWakeWord) {
            // Process command immediately if there's text after wake word
            setTimeout(() => {
              processCommand(withoutWakeWord, false);
            }, 50);
          }
          return;
        }
        
        // No wake word found and not listening - ignore
        return;
      }

      // We're in listening mode, process the command directly
      // Also check if wake word is in the command and remove it
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
      // Don't reset if we're actively listening from button
      const isActivelyListening = safariActivationRef.current && listeningState === 'listening';
      
      if (event.error === 'no-speech') {
        if (isActivelyListening) {
          // Keep listening, just show message
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
        // Aborted is fine, recognition will restart
        return;
      } else {
        console.error('Speech recognition error:', event.error);
        if (isActivelyListening) {
          // Keep listening even on error
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
    recognition.onend = () => {
      // Only restart if we should be listening
      if (canListen && recognitionRef.current) {
        // If we're in listening mode (especially from button), restart immediately
        const shouldKeepListening = safariActivationRef.current || listeningState === 'listening' || listeningState === 'processing';
        if (shouldKeepListening) {
          // Restart immediately when actively listening - critical for button activation
          setTimeout(() => {
            if (recognitionRef.current && canListen && (safariActivationRef.current || listeningState === 'listening')) {
              try {
                recognitionRef.current.start();
              } catch (error: any) {
                // InvalidStateError means it's already running or starting
                if (error?.name !== 'InvalidStateError') {
                  console.error('Speech recognition restart error:', error);
                }
              }
            }
          }, 100); // Small delay to ensure clean restart
        } else {
          // Otherwise, restart with activation requirement (for wake word mode)
          ensureRecognition(true);
        }
      }
    };

    // Start recognition in background to listen for wake words
    // But don't set state to 'listening' until wake words are detected or button is pressed
    // For non-Safari browsers, start recognition to detect wake words
    // For Safari, only start if explicitly activated
    if (!isSafari) {
      // Start recognition in background for wake word detection
      // State will remain 'idle' until wake word is detected
      ensureRecognitionUnlocked();
    } else if (safariActivationRef.current) {
      // For Safari, only start if explicitly activated
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

    // Don't reset state if we're actively listening from button - this is critical!
    if (safariActivationRef.current && (listeningState === 'listening' || listeningState === 'processing')) {
      // Keep recognition running
      if (canListen && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error: any) {
          // Already running is fine
          if (error?.name !== 'InvalidStateError') {
            console.error('Recognition start error in useEffect:', error);
          }
        }
      }
      return; // Keep current state - don't reset!
    }

    if (canListen) {
      // Only set to awaiting if not already listening or processing
      if (listeningState !== 'listening' && listeningState !== 'processing') {
        // Keep state as 'idle' initially - don't show as 'awaiting' until wake word detected
        setListeningState('idle');
        setStatusMessage('Say "Hey", "Assistant", or "Hey Assistant" to start');
      }
      // Start recognition in background for wake word detection (non-Safari)
      // For Safari, only start if explicitly activated
      if (!isSafari) {
        // Start recognition in background to listen for wake words
        // State remains 'idle' until wake word is detected
        ensureRecognitionUnlocked();
      } else if (safariActivationRef.current) {
        // For Safari, only start if explicitly activated
        ensureRecognitionUnlocked();
      }
    } else {
      // Only reset if not actively listening from button
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

    // Clear any pending resets - this is critical!
    clearHideTimer();
    
    // Set activation flag BEFORE setting state
    safariActivationRef.current = true;
    setIsIndicatorVisible(true);
    setListeningState('listening');
    setStatusMessage('Listening... Say "Hey", "Assistant", or your command');
    
    // Start recognition immediately and keep it running
    // Use a small delay to ensure state is set
    setTimeout(() => {
      if (recognitionRef.current && canListen) {
        try {
          // Stop first if running to restart fresh
          try {
            recognitionRef.current.stop();
          } catch (e) {
            // Ignore stop errors
          }
          // Then start
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
    
    // Don't auto-reset when activated from button - user must say "cancel" or close the popup
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
        // Keep state as 'idle' - don't show as 'awaiting' until wake word detected
        setListeningState('idle');
        setStatusMessage('Say "Hey", "Assistant", or "Hey Assistant" to start');
        // Start recognition in background for wake word detection (non-Safari)
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
        // Keep state as 'idle' - don't show as 'awaiting' until wake word detected
        setListeningState('idle');
        setStatusMessage('Say "Hey", "Assistant", or "Hey Assistant" to start');
        // Start recognition in background for wake word detection (non-Safari)
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

  const cancelListening = useCallback(() => {
    setStatusMessage('Listening cancelled');
    setListeningState('idle');
    setIsIndicatorVisible(false);
    safariActivationRef.current = false;
    recognitionRef.current?.stop();
    resetToIdle(500, false);
  }, [resetToIdle]);

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
      applyVoiceInputPreference,
      applyMicrophonePreference,
    }),
    [
      activateFromVoiceButton,
      applyMicrophonePreference,
      applyVoiceInputPreference,
      cancelListening,
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

export const useVoiceAssistant = () => {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error('useVoiceAssistant must be used within VoiceAssistantProvider');
  }
  return context;
};

