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

const VOICE_RESET_DELAY = 1800;
const SAFARI_LISTENING_HINT =
  'Tap the Voice button or press Ctrl + Shift + V to activate listening in Safari.';

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
    ],
    path: '/browse',
    announcement: 'Opening browse page',
  },
  // Inbox
  {
    matchers: ['open inbox', 'show my inbox', 'go to inbox', 'inbox'],
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
    ],
    path: '/report',
    announcement: 'Opening report page',
  },
  // About
  {
    matchers: ['about', 'about page', 'go to about', 'show about'],
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
  const { userSettings } = useAuth();
  const [voiceInputEnabled, setVoiceInputEnabled] = useState<boolean>(
    userSettings?.voiceInput ?? true
  );
  const [microphoneActive, setMicrophoneActive] = useState<boolean>(
    userSettings?.microphoneActive ?? true
  );
  const [listeningState, setListeningState] = useState<ListeningState>('idle');
  const [statusMessage, setStatusMessage] = useState('Voice assistant idle');
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
      hideIndicatorRef.current = window.setTimeout(() => {
        if (keepListening && canListen) {
          // Keep listening if activated from button
          setListeningState('listening');
          setStatusMessage('Listening... Speak now or say "cancel"');
          setIsIndicatorVisible(true);
        } else {
          setIsIndicatorVisible(false);
          setListeningState(canListen ? 'awaiting' : 'idle');
          setStatusMessage(
            canListen
              ? safariActivationRef.current || !isSafari
                ? 'Say "Hey Assistant" or press Ctrl + Shift + V'
                : SAFARI_LISTENING_HINT
              : 'Voice assistant disabled'
          );
        }
      }, delay);
    },
    [canListen, clearHideTimer, isSafari]
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
      recognitionRef.current.start();
    } catch (error: any) {
      if (error?.name !== 'InvalidStateError') {
        console.error('Speech recognition start error:', error);
      }
    }
  }, [canListen]);

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
      if (normalized.includes('cancel') || normalized.includes('stop listening')) {
        setStatusMessage('Listening cancelled');
        setListeningState('idle');
        setIsIndicatorVisible(false);
        safariActivationRef.current = false;
        resetToIdle(500);
        return;
      }

      // Check for navigation commands first
      const navMatch = navigationCommands.find((item) =>
        item.matchers.some((matcher) => normalized.includes(matcher))
      );

      if (navMatch) {
        setStatusMessage(navMatch.announcement);
        setListeningState('processing');
        setIsIndicatorVisible(true);
        onNavigate(navMatch.path);
        resetToIdle(VOICE_RESET_DELAY, wasActivatedFromButton);
        return;
      }

      // Handle clear filters/search
      if (
        normalized.includes('clear') &&
        (normalized.includes('filter') || normalized.includes('search') || normalized.includes('all'))
      ) {
        setStatusMessage('Clearing all filters and search');
        setListeningState('processing');
        setIsIndicatorVisible(true);
        onNavigate('/browse');
        setSearchTerm('');
        resetToIdle(VOICE_RESET_DELAY, wasActivatedFromButton);
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
        resetToIdle(VOICE_RESET_DELAY, wasActivatedFromButton);
        return;
      }

      // If no match found
      setStatusMessage("Sorry, I didn't catch that. Try saying a navigation command or search term.");
      setListeningState('error');
      setIsIndicatorVisible(true);
      resetToIdle(VOICE_RESET_DELAY, wasActivatedFromButton);
    },
    [onNavigate, resetToIdle, setSearchTerm]
  );

  const handleSpeech = useCallback(
    (transcript: string) => {
      if (!canListen || !transcript) return;

      const normalized = transcript.trim().toLowerCase();

      // Check if we're in listening mode by checking if recognition is active
      // This avoids race conditions with state updates
      const isCurrentlyListening = listeningState === 'listening';
      const wasActivatedFromButton = safariActivationRef.current;

      if (!isCurrentlyListening) {
        // Look for wake word
        if (normalized.includes('hey assistant')) {
          setStatusMessage('Listening... Speak now');
          setIsIndicatorVisible(true);
          setListeningState('listening');
          const withoutWakeWord = normalized.replace(/hey\s+assistant\s*/i, '').trim();
          if (withoutWakeWord) {
            // Process command immediately if there's text after wake word
            setTimeout(() => {
              processCommand(withoutWakeWord, false);
            }, 100);
          }
        }
        return;
      }

      // We're in listening mode, process the command
      processCommand(normalized, wasActivatedFromButton);
    },
    [canListen, listeningState, processCommand]
  );

  const handleRecognitionError = useCallback(
    (event: { error: string }) => {
      if (event.error === 'no-speech') {
        setStatusMessage("Sorry, I didn't catch that");
        setListeningState('error');
        setIsIndicatorVisible(true);
        resetToIdle();
      } else if (event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error);
        setStatusMessage('Voice assistant encountered an error');
        setListeningState('error');
        setIsIndicatorVisible(true);
        resetToIdle(2500);
      }
    },
    [resetToIdle]
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
      if (canListen) {
        ensureRecognition(true);
      }
    };

    if (!isSafari) {
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

    if (canListen) {
      setListeningState('awaiting');
      setStatusMessage(
        safariActivationRef.current || !isSafari
          ? 'Say "Hey Assistant" or press Ctrl + Shift + V'
          : SAFARI_LISTENING_HINT
      );
      if (!isSafari || safariActivationRef.current) {
        ensureRecognitionUnlocked();
      }
    } else {
      setListeningState('idle');
      setIsIndicatorVisible(false);
      setStatusMessage(
        !voiceInputEnabled
          ? 'Voice input is switched off'
          : 'Microphone is muted'
      );
      recognitionRef.current?.stop();
    }
  }, [canListen, ensureRecognitionUnlocked, isSafari, recognitionSupported, voiceInputEnabled]);

  const activateFromVoiceButton = useCallback(() => {
    if (!voiceInputEnabled) {
      setStatusMessage('Turn Voice Input on in Accessibility Settings');
      setListeningState('error');
      setIsIndicatorVisible(true);
      resetToIdle();
      return;
    }
    if (!microphoneActive) {
      setStatusMessage('Microphone muted — enable it to use voice commands');
      setListeningState('error');
      setIsIndicatorVisible(true);
      resetToIdle();
      return;
    }

    safariActivationRef.current = true;
    setIsIndicatorVisible(true);
    setListeningState('listening');
    setStatusMessage('Listening... Speak now or say "cancel"');
    ensureRecognitionUnlocked();
  }, [ensureRecognitionUnlocked, microphoneActive, resetToIdle, voiceInputEnabled]);

  const applyVoiceInputPreference = useCallback(
    (value: boolean) => {
      setVoiceInputEnabled(value);
      if (!value) {
        setIsIndicatorVisible(false);
        setListeningState('idle');
        setStatusMessage('Voice input is switched off');
        recognitionRef.current?.stop();
      } else if (microphoneActive && recognitionSupported) {
        setListeningState('awaiting');
        setStatusMessage(
          safariActivationRef.current || !isSafari
            ? 'Say "Hey Assistant" or press Ctrl + Shift + V'
            : SAFARI_LISTENING_HINT
        );
        if (!isSafari || safariActivationRef.current) {
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
        setListeningState('awaiting');
        setStatusMessage(
          safariActivationRef.current || !isSafari
            ? 'Say "Hey Assistant" or press Ctrl + Shift + V'
            : SAFARI_LISTENING_HINT
        );
        if (!isSafari || safariActivationRef.current) {
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
      applyVoiceInputPreference,
      applyMicrophonePreference,
    }),
    [
      activateFromVoiceButton,
      applyMicrophonePreference,
      applyVoiceInputPreference,
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

