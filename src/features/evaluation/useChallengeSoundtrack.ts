/**
 * PARKLAB 3D — Challenge-Specific Web Audio Background Music Synthesizer
 *
 * Generates a unique, multi-layered ambient/synthwave driving soundtrack for
 * each of the five UK parking challenges using the browser's native Web Audio API
 * (warm pad chords, filtered bassline, melodic arpeggio, and soft rhythmic pulse):
 *
 * 1. `parallel`      — "Urban Precision Groove" (104 BPM · D Dorian Synth)
 * 2. `reverse-bay`   — "90° Telemetry Pulse"    (112 BPM · A Minor Cyber-Electro)
 * 3. `forward-bay`   — "Daylight Horizon"       (98 BPM  · C Major9 Chill Drive)
 * 4. `angled-bay`    — "Echelon Slipstream"     (108 BPM · E Minor Progressive)
 * 5. `pull-up-right` — "Apex Roadside Examen"   (118 BPM · F Minor Night Drive)
 *
 * Features:
 * - Automatically switches musical theme when the active challenge changes.
 * - Ducks background music volume smoothly while the AI Voice Coach is speaking.
 * - Unlocks Web Audio context automatically on first keyboard/mouse interaction.
 * - Cleanly disposes all oscillators and timers on unmount.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChallengeId } from '../challenges/types';

export interface ChallengeSoundtrackProfile {
  challengeId: ChallengeId;
  trackTitle: string;
  genreLabel: string;
  bpm: number;
  /** MIDI note numbers for 4-bar chord progression (each chord has 3-4 notes) */
  chords: number[][];
  /** MIDI note numbers for 16-step arpeggio / lead motif */
  arpeggioNotes: number[];
  /** MIDI note numbers for 4-bar root bassline */
  bassNotes: number[];
  padWaveform: OscillatorType;
  arpWaveform: OscillatorType;
  bassFilterHz: number;
}

export const CHALLENGE_SOUNDTRACKS: Record<
  ChallengeId,
  ChallengeSoundtrackProfile
> = {
  parallel: {
    challengeId: 'parallel',
    trackTitle: 'Urban Precision Groove',
    genreLabel: '104 BPM · D Dorian Synth',
    bpm: 104,
    // Dm9 -> Gm7 -> Bbmaj7 -> A7sus4
    chords: [
      [62, 65, 69, 72],
      [67, 70, 74, 77],
      [70, 74, 77, 81],
      [69, 74, 76, 79],
    ],
    arpeggioNotes: [
      74, 77, 81, 84, 81, 77, 74, 69, 70, 74, 77, 82, 79, 76, 74, 69,
    ],
    bassNotes: [38, 43, 46, 45],
    padWaveform: 'triangle',
    arpWaveform: 'sine',
    bassFilterHz: 240,
  },
  'reverse-bay': {
    challengeId: 'reverse-bay',
    trackTitle: '90° Telemetry Pulse',
    genreLabel: '112 BPM · A Minor Electro',
    bpm: 112,
    // Am7 -> Fmaj7 -> Cmaj7 -> Em7
    chords: [
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [60, 64, 67, 71],
      [64, 67, 71, 74],
    ],
    arpeggioNotes: [
      69, 72, 76, 79, 76, 72, 69, 72, 65, 69, 72, 76, 79, 76, 71, 67,
    ],
    bassNotes: [45, 41, 36, 40],
    padWaveform: 'sine',
    arpWaveform: 'triangle',
    bassFilterHz: 280,
  },
  'forward-bay': {
    challengeId: 'forward-bay',
    trackTitle: 'Daylight Horizon',
    genreLabel: '98 BPM · C Maj9 Chill',
    bpm: 98,
    // Cmaj7 -> Am7 -> Dm7 -> G9
    chords: [
      [60, 64, 67, 71],
      [57, 60, 64, 67],
      [62, 65, 69, 72],
      [55, 59, 62, 65],
    ],
    arpeggioNotes: [
      72, 76, 79, 83, 79, 76, 72, 67, 69, 72, 76, 81, 79, 74, 71, 67,
    ],
    bassNotes: [36, 45, 38, 43],
    padWaveform: 'sine',
    arpWaveform: 'sine',
    bassFilterHz: 220,
  },
  'angled-bay': {
    challengeId: 'angled-bay',
    trackTitle: 'Echelon Slipstream',
    genreLabel: '108 BPM · E Minor Prog',
    bpm: 108,
    // Em7 -> Cmaj7 -> D6 -> Bm7
    chords: [
      [64, 67, 71, 74],
      [60, 64, 67, 71],
      [62, 66, 69, 71],
      [59, 62, 66, 69],
    ],
    arpeggioNotes: [
      76, 79, 83, 86, 83, 79, 76, 71, 72, 76, 79, 84, 81, 78, 74, 71,
    ],
    bassNotes: [40, 36, 38, 47],
    padWaveform: 'triangle',
    arpWaveform: 'triangle',
    bassFilterHz: 260,
  },
  'pull-up-right': {
    challengeId: 'pull-up-right',
    trackTitle: 'Apex Roadside Examen',
    genreLabel: '118 BPM · F Minor Synthwave',
    bpm: 118,
    // Fm7 -> Dbmaj7 -> Eb -> C7
    chords: [
      [65, 68, 72, 75],
      [61, 65, 68, 72],
      [63, 67, 70, 75],
      [60, 64, 67, 70],
    ],
    arpeggioNotes: [
      77, 80, 84, 87, 84, 80, 77, 72, 73, 77, 80, 85, 82, 79, 76, 72,
    ],
    bassNotes: [41, 37, 39, 36],
    padWaveform: 'sawtooth',
    arpWaveform: 'triangle',
    bassFilterHz: 310,
  },
};

function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const win = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return win.AudioContext ?? win.webkitAudioContext ?? null;
}

export interface ChallengeSoundtrackControls {
  musicEnabled: boolean;
  isPlaying: boolean;
  musicVolume: number;
  activeTrack: ChallengeSoundtrackProfile;
  setMusicEnabled: (enabled: boolean) => void;
  toggleMusic: () => void;
  setMusicVolume: (volume: number) => void;
}

export function useChallengeSoundtrack(params: {
  challengeId: ChallengeId;
  isVoiceSpeaking?: boolean;
}): ChallengeSoundtrackControls {
  const { challengeId, isVoiceSpeaking = false } = params;

  const [musicEnabled, setMusicEnabledState] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [musicVolume, setMusicVolumeState] = useState<number>(0.88);

  const activeTrack =
    CHALLENGE_SOUNDTRACKS[challengeId] ?? CHALLENGE_SOUNDTRACKS.parallel;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const stepIndexRef = useRef<number>(0);
  const musicVolumeRef = useRef<number>(musicVolume);
  musicVolumeRef.current = musicVolume;
  const isVoiceSpeakingRef = useRef<boolean>(isVoiceSpeaking);
  isVoiceSpeakingRef.current = isVoiceSpeaking;

  const ensureAudioContext = useCallback((): AudioContext | null => {
    const AudioCtx = getAudioContextConstructor();
    if (!AudioCtx) {
      return null;
    }

    if (!audioCtxRef.current) {
      try {
        const ctx = new AudioCtx();
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-14, ctx.currentTime);
        compressor.knee.setValueAtTime(18, ctx.currentTime);
        compressor.ratio.setValueAtTime(3.5, ctx.currentTime);
        compressor.attack.setValueAtTime(0.005, ctx.currentTime);
        compressor.release.setValueAtTime(0.18, ctx.currentTime);

        const masterGain = ctx.createGain();
        masterGain.gain.value = musicVolumeRef.current * 0.92;
        masterGain.connect(compressor);
        compressor.connect(ctx.destination);

        audioCtxRef.current = ctx;
        masterGainRef.current = masterGain;
      } catch {
        return null;
      }
    }

    if (audioCtxRef.current.state === 'suspended') {
      void audioCtxRef.current.resume().catch(() => {});
    }

    return audioCtxRef.current;
  }, []);

  // Keep full volume equal to AI voice (~90%) until AI Voice Coach speaks,
  // then duck smoothly and restore immediately when AI voice finishes or is dismissed.
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) {
      return;
    }
    const targetGain = !musicEnabled
      ? 0.0001
      : isVoiceSpeaking
        ? musicVolume * 0.14
        : musicVolume * 0.92;
    try {
      masterGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.06);
    } catch {
      masterGain.gain.value = targetGain;
    }
  }, [musicEnabled, musicVolume, isVoiceSpeaking]);

  // Unlock Web Audio on first user keydown or pointerdown when musicEnabled is true
  useEffect(() => {
    if (!musicEnabled) {
      setIsPlaying(false);
      return;
    }

    const handleUserGesture = () => {
      const ctx = ensureAudioContext();
      if (ctx && ctx.state === 'running') {
        setIsPlaying(true);
      }
    };

    window.addEventListener('keydown', handleUserGesture, { passive: true });
    window.addEventListener('pointerdown', handleUserGesture, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleUserGesture);
      window.removeEventListener('pointerdown', handleUserGesture);
    };
  }, [musicEnabled, ensureAudioContext]);

  // Step sequencer loop for the active challenge's soundtrack profile
  useEffect(() => {
    if (!musicEnabled) {
      setIsPlaying(false);
      return;
    }

    stepIndexRef.current = 0;
    const stepDurationMs = Math.round((60 / activeTrack.bpm / 2) * 1000); // 8th-note steps
    const stepDurationSec = stepDurationMs / 1000;

    const triggerStep = () => {
      const ctx = audioCtxRef.current;
      const masterGain = masterGainRef.current;
      if (!ctx || !masterGain || ctx.state !== 'running') {
        return;
      }

      setIsPlaying(true);
      const now = ctx.currentTime;
      const step = stepIndexRef.current;
      stepIndexRef.current = (step + 1) % 32;

      const barIndex = Math.floor(step / 8) % activeTrack.chords.length;

      // 1. Trigger warm sustained Pad Chord at the start of each 8-step bar
      if (step % 8 === 0) {
        const chord = activeTrack.chords[barIndex] ?? activeTrack.chords[0];
        const padFilter = ctx.createBiquadFilter();
        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(950, now);
        padFilter.connect(masterGain);

        for (const note of chord) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = activeTrack.padWaveform;
          osc.frequency.setValueAtTime(midiToFreq(note), now);
          osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.14, now + stepDurationSec * 1.4);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            now + stepDurationSec * 7.8
          );

          osc.connect(gain);
          gain.connect(padFilter);
          osc.start(now);
          osc.stop(now + stepDurationSec * 7.9);
        }
      }

      // 2. Trigger Bassline pulse on beats 0, 2, 4, 6 of each bar
      if (step % 2 === 0) {
        const bassMidi =
          activeTrack.bassNotes[barIndex] ?? activeTrack.bassNotes[0];
        const octaveShift = step % 4 === 2 ? 12 : 0;
        const bassOsc = ctx.createOscillator();
        const bassFilter = ctx.createBiquadFilter();
        const bassGain = ctx.createGain();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(
          midiToFreq(bassMidi + octaveShift),
          now
        );

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(activeTrack.bassFilterHz, now);
        bassFilter.frequency.exponentialRampToValueAtTime(
          95,
          now + stepDurationSec * 1.6
        );

        bassGain.gain.setValueAtTime(0.001, now);
        bassGain.gain.linearRampToValueAtTime(0.32, now + 0.015);
        bassGain.gain.exponentialRampToValueAtTime(
          0.001,
          now + stepDurationSec * 1.75
        );

        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(masterGain);

        bassOsc.start(now);
        bassOsc.stop(now + stepDurationSec * 1.8);
      }

      // 3. Trigger Melodic Arpeggio Note on every step
      const arpNote =
        activeTrack.arpeggioNotes[step % activeTrack.arpeggioNotes.length];
      if (arpNote) {
        const arpOsc = ctx.createOscillator();
        const arpGain = ctx.createGain();

        arpOsc.type = activeTrack.arpWaveform;
        arpOsc.frequency.setValueAtTime(midiToFreq(arpNote), now);

        arpGain.gain.setValueAtTime(0.001, now);
        arpGain.gain.linearRampToValueAtTime(0.16, now + 0.012);
        arpGain.gain.exponentialRampToValueAtTime(
          0.001,
          now + stepDurationSec * 0.92
        );

        arpOsc.connect(arpGain);
        arpGain.connect(masterGain);

        arpOsc.start(now);
        arpOsc.stop(now + stepDurationSec * 0.95);
      }
    };

    const intervalId = window.setInterval(triggerStep, stepDurationMs);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeTrack, musicEnabled]);

  const setMusicEnabled = useCallback(
    (enabled: boolean) => {
      setMusicEnabledState(enabled);
      if (enabled) {
        const ctx = ensureAudioContext();
        if (ctx) {
          setIsPlaying(true);
        }
      } else {
        setIsPlaying(false);
      }
    },
    [ensureAudioContext]
  );

  const toggleMusic = useCallback(() => {
    setMusicEnabled(!musicEnabled);
  }, [musicEnabled, setMusicEnabled]);

  const setMusicVolume = useCallback((vol: number) => {
    setMusicVolumeState(Math.max(0.05, Math.min(1, vol)));
  }, []);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  return {
    musicEnabled,
    isPlaying,
    musicVolume,
    activeTrack,
    setMusicEnabled,
    toggleMusic,
    setMusicVolume,
  };
}
