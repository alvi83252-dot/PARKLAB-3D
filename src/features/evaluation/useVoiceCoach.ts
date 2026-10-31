/**
 * PARKLAB 3D — Web Speech API Voice Coach & Push-to-Talk Question Hook
 *
 * Implements:
 * - Spoken crash coaching using `window.speechSynthesis` & `SpeechSynthesisUtterance`
 *   with British English (`en-GB`) voice preference and safe fallback.
 * - Enable/Disable Voice Coach, Mute/Unmute, Replay Last Feedback, Stop Speaking,
 *   adjustable speech volume and speech rate, and duplicate-event suppression.
 * - Opt-in, push-to-talk Speech Recognition (`SpeechRecognition` / `webkitSpeechRecognition`)
 *   that listens ONLY when the user explicitly clicks the microphone button.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface BrowserSpeechRecognitionEvent {
  results: {
    length: number;
    [index: number]: {
      isFinal?: boolean;
      [altIndex: number]: {
        transcript: string;
      };
    };
  };
}

interface BrowserSpeechRecognitionErrorEvent {
  error: string;
}

interface BrowserSpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const win = window as unknown as {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export interface VoiceCoachStateAndControls {
  speechSynthesisSupported: boolean;
  speechRecognitionSupported: boolean;
  voiceEnabled: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  volume: number;
  rate: number;
  activeVoiceLabel: string;
  lastSpokenText: string | null;
  recognitionError: string | null;
  setVoiceEnabled: (enabled: boolean) => void;
  setIsMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setRate: (rate: number) => void;
  speakCoaching: (text: string, deduplicationKey?: string) => void;
  replayLastCoaching: () => void;
  stopSpeaking: () => void;
  startPushToTalk: (onTranscriptReady: (transcript: string) => void) => void;
  stopPushToTalk: () => void;
}

function selectPreferredEnglishVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (voices.length === 0) {
    return null;
  }
  // 1. Prefer high-quality British English (en-GB) voices
  const gbNatural = voices.find(
    (v) =>
      v.lang.toLowerCase().startsWith('en-gb') &&
      (v.name.toLowerCase().includes('natural') ||
        v.name.toLowerCase().includes('google') ||
        v.name.toLowerCase().includes('libby') ||
        v.name.toLowerCase().includes('sonia') ||
        v.name.toLowerCase().includes('ryan') ||
        v.name.toLowerCase().includes('daniel'))
  );
  if (gbNatural) {
    return gbNatural;
  }

  const anyGb = voices.find((v) => v.lang.toLowerCase().startsWith('en-gb'));
  if (anyGb) {
    return anyGb;
  }

  // 2. Fall back to any English voice
  const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
  if (anyEn) {
    return anyEn;
  }

  return voices[0] ?? null;
}

export function useVoiceCoach(): VoiceCoachStateAndControls {
  const speechSynthesisSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined';

  const speechRecognitionSupported = Boolean(getSpeechRecognitionConstructor());

  const [voiceEnabled, setVoiceEnabledState] = useState<boolean>(true);
  const [isMuted, setIsMutedState] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(0.9);
  const [rate, setRateState] = useState<number>(1.02);
  const [activeVoiceLabel, setActiveVoiceLabel] = useState<string>('System Default');
  const [lastSpokenText, setLastSpokenText] = useState<string | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const lastSpokenKeyRef = useRef<string | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognitionInstance | null>(null);

  // Discover available system voices (preferring en-GB)
  useEffect(() => {
    if (!speechSynthesisSupported) {
      return;
    }

    const updateVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        const chosen = selectPreferredEnglishVoice(voices);
        selectedVoiceRef.current = chosen;
        if (chosen) {
          setActiveVoiceLabel(`${chosen.name} (${chosen.lang})`);
        }
      } catch {
        // Ignore voice enumeration errors
      }
    };

    updateVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.(
        'voiceschanged',
        updateVoices
      );
    };
  }, [speechSynthesisSupported]);

  const stopSpeaking = useCallback(() => {
    if (!speechSynthesisSupported) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } catch {
      setIsSpeaking(false);
    }
  }, [speechSynthesisSupported]);

  const speakInternal = useCallback(
    (text: string, forceSpeak = false) => {
      const cleaned = text.trim();
      if (!cleaned) {
        return;
      }
      setLastSpokenText(cleaned);

      if (!speechSynthesisSupported) {
        return;
      }
      if ((!voiceEnabled || isMuted) && !forceSpeak) {
        return;
      }

      try {
        // Cancel any outdated speech before speaking the new coaching message
        window.speechSynthesis.cancel();

        const utterance = new window.SpeechSynthesisUtterance(cleaned);
        if (selectedVoiceRef.current) {
          utterance.voice = selectedVoiceRef.current;
          utterance.lang = selectedVoiceRef.current.lang;
        } else {
          utterance.lang = 'en-GB';
        }
        utterance.volume = Math.max(0, Math.min(1, volume));
        utterance.rate = Math.max(0.6, Math.min(1.5, rate));
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
      }
    },
    [speechSynthesisSupported, voiceEnabled, isMuted, volume, rate]
  );

  const speakCoaching = useCallback(
    (text: string, deduplicationKey?: string) => {
      if (deduplicationKey && lastSpokenKeyRef.current === deduplicationKey) {
        return;
      }
      if (deduplicationKey) {
        lastSpokenKeyRef.current = deduplicationKey;
      }
      speakInternal(text, false);
    },
    [speakInternal]
  );

  const replayLastCoaching = useCallback(() => {
    if (!lastSpokenText) {
      return;
    }
    speakInternal(lastSpokenText, true);
  }, [lastSpokenText, speakInternal]);

  const setVoiceEnabled = useCallback(
    (enabled: boolean) => {
      setVoiceEnabledState(enabled);
      if (!enabled) {
        stopSpeaking();
      }
    },
    [stopSpeaking]
  );

  const setIsMuted = useCallback(
    (muted: boolean) => {
      setIsMutedState(muted);
      if (muted) {
        stopSpeaking();
      }
    },
    [stopSpeaking]
  );

  const setVolume = useCallback((nextVol: number) => {
    setVolumeState(Math.max(0.1, Math.min(1, nextVol)));
  }, []);

  const setRate = useCallback((nextRate: number) => {
    setRateState(Math.max(0.75, Math.min(1.35, nextRate)));
  }, []);

  const stopPushToTalk = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsListening(false);
  }, []);

  const startPushToTalk = useCallback(
    (onTranscriptReady: (transcript: string) => void) => {
      const RecognitionCtor = getSpeechRecognitionConstructor();
      if (!RecognitionCtor) {
        setRecognitionError(
          'Browser SpeechRecognition is not available in this browser. Please use the text question box below.'
        );
        return;
      }

      stopSpeaking();
      setRecognitionError(null);

      try {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }

        const recognition = new RecognitionCtor();
        recognition.lang = 'en-GB';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
          const lastIdx = event.results.length - 1;
          const transcript = event.results[lastIdx]?.[0]?.transcript?.trim();
          setIsListening(false);
          if (transcript) {
            onTranscriptReady(transcript);
          }
        };

        recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
          setIsListening(false);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setRecognitionError(
              'Microphone permission was denied. You can still type questions to the AI Coach below.'
            );
          } else if (event.error === 'no-speech') {
            setRecognitionError(
              'No speech was detected. Click Ask Coach (Mic) and speak clearly, or type your question.'
            );
          } else {
            setRecognitionError(
              `Speech recognition notice (${event.error}). Use the text box below if needed.`
            );
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        setIsListening(true);
        recognition.start();
      } catch {
        setIsListening(false);
        setRecognitionError(
          'Could not start speech recognition. Please use the text input fallback.'
        );
      }
    },
    [stopSpeaking]
  );

  // Clean up speech synthesis and recognition on unmount
  useEffect(() => {
    return () => {
      if (speechSynthesisSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, [speechSynthesisSupported]);

  return {
    speechSynthesisSupported,
    speechRecognitionSupported,
    voiceEnabled,
    isMuted,
    isSpeaking,
    isListening,
    volume,
    rate,
    activeVoiceLabel,
    lastSpokenText,
    recognitionError,
    setVoiceEnabled,
    setIsMuted,
    setVolume,
    setRate,
    speakCoaching,
    replayLastCoaching,
    stopSpeaking,
    startPushToTalk,
    stopPushToTalk,
  };
}
