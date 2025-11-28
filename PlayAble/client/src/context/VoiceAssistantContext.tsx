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
  {
    matchers: ['open accessibility settings', 'accessibility settings', 'open settings', 'voice settings'],
    path: '/settings',
    announcement: 'Opening accessibility settings',
  },
  {
    matchers: ['show recently viewed', 'recently viewed', 'view history'],
    path: '/recently-viewed',
    announcement: 'Showing recently viewed games',
  },
  {
    matchers: ['take me to my profile', 'open my profile', 'profile page', 'my profile'],
    path: '/my-profile',
    announcement: 'Opening your profile',
  },
  {
    matchers: ['show favorites', 'show favourites', 'open favorites', 'open favourites'],
    path: '/favourites',
    announcement: 'Opening favourites',
  },
  {
    matchers: ['go home', 'go to browse', 'open browse', 'browse games'],
    path: '/browse',
    announcement: 'Opening browse page',
  },
  {
    matchers: ['open inbox', 'show my inbox'],
    path: '/inbox',
    announcement: 'Opening inbox',
  },
];

const extractSearchTerm = (command: string): string | null => {
  const normalized = command.trim();

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
      return term || null;
    }
  }

  if (normalized.includes('games with')) {
    const start = normalized.indexOf('games with') + 'games with'.length;
    const term = normalized.slice(start).trim();
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
    (delay = VOICE_RESET_DELAY) => {
      clearHideTimer();
      hideIndicatorRef.current = window.setTimeout(() => {
        setIsIndicatorVisible(false);
        setListeningState(canListen ? 'awaiting' : 'idle');
        setStatusMessage(
          canListen
            ? safariActivationRef.current || !isSafari
              ? 'Say "Hey Assistant" or press Ctrl + Shift + V'
              : SAFARI_LISTENING_HINT
            : 'Voice assistant disabled'
        );
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
    (commandRaw: string) => {
      const command = commandRaw.trim();
      if (!command) {
        setStatusMessage('Waiting for your command');
        return;
      }

      setLastHeardPhrase(command);
      const normalized = command.toLowerCase();

      const navMatch = navigationCommands.find((item) =>
        item.matchers.some((matcher) => normalized.includes(matcher))
      );

      if (navMatch) {
        setStatusMessage(navMatch.announcement);
        setListeningState('processing');
        setIsIndicatorVisible(true);
        onNavigate(navMatch.path);
        resetToIdle();
        return;
      }

      const searchTerm = extractSearchTerm(normalized);
      if (searchTerm) {
        setStatusMessage(`Searching for "${searchTerm}"`);
        setListeningState('processing');
        setIsIndicatorVisible(true);
        onNavigate('/browse');
        setSearchTerm(searchTerm);
        resetToIdle();
        return;
      }

      if (normalized.includes('cancel')) {
        setStatusMessage('Listening cancelled');
        setListeningState('idle');
        setIsIndicatorVisible(false);
        return;
      }

      setStatusMessage("Sorry, I didn't catch that");
      setListeningState('error');
      setIsIndicatorVisible(true);
      resetToIdle();
    },
    [onNavigate, resetToIdle, setSearchTerm]
  );

  const handleSpeech = useCallback(
    (transcript: string) => {
      if (!canListen || !transcript) return;

      const normalized = transcript.trim().toLowerCase();

      if (listeningState !== 'listening') {
        if (normalized.includes('hey assistant')) {
          setStatusMessage('Listening... Speak now');
          setIsIndicatorVisible(true);
          setListeningState('listening');
          const withoutWakeWord = normalized.replace('hey assistant', '').trim();
          if (withoutWakeWord) {
            processCommand(withoutWakeWord);
          }
        }
        return;
      }

      processCommand(normalized);
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

