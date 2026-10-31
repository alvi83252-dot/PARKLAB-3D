/**
 * PARKLAB 3D — CrashFeedbackPanel & AICoachControlsBar Components
 *
 * Provides:
 * 1. `CrashFeedbackPanel`: Non-obstructive "CRASH DETECTED" RAG coaching panel
 *    displaying what happened, obstacle hit, pre-impact speed & direction,
 *    probable cause, retrieved RAG guidance sources, attempt comparison deltas,
 *    voice replay/stop controls, and Retry / Dismiss actions.
 * 2. `AICoachControlsBar`: Compact multimodal AI Coach toolbar with Voice Coach
 *    On/Off, Mute, Volume/Rate sliders, Replay/Stop, Opt-In Webcam preview with
 *    on-device visible facial cue indicator, Push-to-Talk / Text "Ask Coach" Q&A,
 *    and Reset AI Memory button.
 */

import { useState } from 'react';
import {
  AlertOctagon,
  BookOpen,
  Camera,
  CameraOff,
  ChevronDown,
  ChevronUp,
  Database,
  History,
  MessageSquare,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type {
  AICrashFeedbackReport,
  AttemptComparisonDelta,
  CoachQAExchange,
} from '../evaluation/crashRagTypes';
import type { VoiceCoachStateAndControls } from '../evaluation/useVoiceCoach';
import type { WebcamFacialObserverControls } from '../evaluation/useWebcamFacialObserver';
import './challenge-ui.css';

export interface CrashFeedbackPanelProps {
  report: AICrashFeedbackReport;
  isSpeaking?: boolean;
  onRetry: () => void;
  onDismiss: () => void;
  onReplayVoice?: () => void;
  onStopVoice?: () => void;
}

export function CrashFeedbackPanel({
  report,
  isSpeaking = false,
  onRetry,
  onDismiss,
  onReplayVoice,
  onStopVoice,
}: CrashFeedbackPanelProps) {
  const [showRagSources, setShowRagSources] = useState<boolean>(false);

  const directionBadge =
    report.drivingDirection === 'reverse'
      ? 'REV'
      : report.drivingDirection === 'forward'
        ? 'FWD'
        : 'STOP';

  const impactCornerFormatted =
    report.vehicleImpactZone === 'uncertain'
      ? 'Body'
      : report.vehicleImpactZone.replace(/-corner/g, '').replace(/-/g, ' ');

  const shortObstacle = report.obstacleLabel.split('(')[0].trim();
  const topSimilarity = report.retrievedContext[0]
    ? Math.round(report.retrievedContext[0].similarityScore * 100)
    : null;

  return (
    <section
      className="pk-crash-coach"
      role="region"
      aria-labelledby="pk-crash-coach-heading"
    >
      {/* Compact Header */}
      <header className="pk-crash-coach__header">
        <div className="pk-crash-coach__badge-row">
          <span
            id="pk-crash-coach-heading"
            className="pk-crash-coach__alert-pill"
          >
            <AlertOctagon size={12} aria-hidden="true" />
            <span>CRASH · {shortObstacle}</span>
          </span>
          <span className="pk-crash-coach__attempt-tag">
            #{report.attemptNumber}
          </span>
          {isSpeaking && (
            <span className="pk-crash-coach__speaking-pill" aria-live="polite">
              <Volume2 size={11} aria-hidden="true" />
              <span>Voice</span>
            </span>
          )}
        </div>

        <button
          type="button"
          className="pk-crash-coach__close-btn"
          onClick={onDismiss}
          title="Dismiss"
          aria-label="Dismiss crash coaching panel"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </header>

      {/* 3-Chip Key Telemetry Strip */}
      <div className="pk-crash-coach__telemetry-strip">
        <div className="pk-crash-coach__telemetry-cell">
          <span className="pk-crash-coach__telemetry-label">Speed / Gear</span>
          <span className="pk-crash-coach__telemetry-val">
            {report.preImpactSpeedMph.toFixed(1)} mph · {directionBadge}
          </span>
        </div>
        <div className="pk-crash-coach__telemetry-cell">
          <span className="pk-crash-coach__telemetry-label">Impact</span>
          <span className="pk-crash-coach__telemetry-val">
            {impactCornerFormatted}
          </span>
        </div>
        <div className="pk-crash-coach__telemetry-cell">
          <span className="pk-crash-coach__telemetry-label">Steer</span>
          <span className="pk-crash-coach__telemetry-val">
            {report.steeringDirection === 'straight'
              ? '0°'
              : `${report.preImpactSteeringDeg.toFixed(0)}° ${report.steeringDirection.toUpperCase()}`}
          </span>
        </div>
      </div>

      {/* Concise 2-Line Cause + Fix */}
      <div className="pk-crash-coach__body">
        <p className="pk-crash-coach__text">
          <strong>Cause:</strong> {report.probableCause}
        </p>

        <div className="pk-crash-coach__advice-box">
          <div className="pk-crash-coach__focus-row">
            <Sparkles
              size={12}
              aria-hidden="true"
              style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }}
            />
            <strong>Fix:</strong> {report.nextAttemptFocus}
          </div>
        </div>

        {report.repeatPatternNotice && (
          <div className="pk-crash-coach__repeat-banner">
            <History size={12} aria-hidden="true" />
            <span>{report.repeatPatternNotice}</span>
          </div>
        )}

        {report.attemptComparison &&
          report.attemptComparison.bulletPoints.length > 0 && (
            <div className="pk-crash-coach__comparison">
              <span className="pk-crash-coach__subtext">
                {report.attemptComparison.bulletPoints[0]}
              </span>
            </div>
          )}

        {/* Collapsed-by-default RAG Sources toggle */}
        <div className="pk-crash-coach__rag-drawer">
          <button
            type="button"
            className="pk-crash-coach__rag-toggle"
            onClick={() => setShowRagSources((prev) => !prev)}
            aria-expanded={showRagSources}
          >
            <span className="pk-crash-coach__rag-toggle-left">
              <BookOpen size={11} aria-hidden="true" />
              <span>
                RAG Context ({report.retrievedContext.length})
                {topSimilarity ? ` · ${topSimilarity}% match` : ''}
              </span>
            </span>
            {showRagSources ? (
              <ChevronUp size={12} aria-hidden="true" />
            ) : (
              <ChevronDown size={12} aria-hidden="true" />
            )}
          </button>

          {showRagSources && (
            <ul className="pk-crash-coach__rag-list">
              {report.retrievedContext.map((item) => (
                <li key={item.id} className="pk-crash-coach__rag-item">
                  <div className="pk-crash-coach__rag-item-top">
                    <span className="pk-crash-coach__rag-source-badge">
                      {item.sourceType === 'static-guidance'
                        ? 'KB'
                        : item.sourceType === 'past-crash'
                          ? 'Memory'
                          : 'Attempt'}
                    </span>
                    <span className="pk-crash-coach__rag-title">
                      {item.title}
                    </span>
                    <span className="pk-crash-coach__rag-score">
                      {Math.round(item.similarityScore * 100)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <footer className="pk-crash-coach__footer">
        <div className="pk-crash-coach__voice-btns">
          {onReplayVoice && (
            <button
              type="button"
              className="pk-btn pk-btn--secondary"
              onClick={onReplayVoice}
              title="Replay voice tip"
            >
              <Volume2 size={12} aria-hidden="true" />
              <span>Replay</span>
            </button>
          )}
          {onStopVoice && isSpeaking && (
            <button
              type="button"
              className="pk-btn pk-btn--secondary"
              onClick={onStopVoice}
              title="Stop speaking"
            >
              <Square size={11} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="pk-crash-coach__action-btns">
          <button
            type="button"
            className="pk-btn pk-btn--secondary"
            onClick={onDismiss}
          >
            <span>Dismiss</span>
          </button>
          <button
            type="button"
            className="pk-btn pk-btn--primary"
            onClick={onRetry}
          >
            <RotateCcw size={12} aria-hidden="true" />
            <span>Retry</span>
          </button>
        </div>
      </footer>
    </section>
  );
}

export interface AICoachControlsBarProps {
  attemptNumber: number;
  totalStoredCrashes: number;
  totalStoredAttempts: number;
  voiceCoach: VoiceCoachStateAndControls;
  webcamObserver: WebcamFacialObserverControls;
  latestQAExchange: CoachQAExchange | null;
  attemptComparison: AttemptComparisonDelta | null;
  onAskCoach: (
    questionText: string,
    inputMode?: 'voice-speech-recognition' | 'text-input'
  ) => void;
  onResetMemory: () => void;
}

const QUICK_COACH_QUESTIONS = [
  'Why did I crash?',
  'How can I improve my reverse parking?',
  'What did I do wrong on my last attempt?',
] as const;

export function AICoachControlsBar({
  attemptNumber,
  totalStoredCrashes,
  totalStoredAttempts,
  voiceCoach,
  webcamObserver,
  latestQAExchange,
  attemptComparison,
  onAskCoach,
  onResetMemory,
}: AICoachControlsBarProps) {
  const [questionInput, setQuestionInput] = useState<string>('');
  const [showAskDrawer, setShowAskDrawer] = useState<boolean>(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState<boolean>(false);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) {
      return;
    }
    onAskCoach(questionInput.trim(), 'text-input');
    setQuestionInput('');
  };

  const handleMicAsk = () => {
    setShowAskDrawer(true);
    if (voiceCoach.isListening) {
      voiceCoach.stopPushToTalk();
      return;
    }
    voiceCoach.startPushToTalk((transcript) => {
      setQuestionInput(transcript);
      onAskCoach(transcript, 'voice-speech-recognition');
    });
  };

  // Prevent W/A/S/D keystrokes inside the text input from triggering driving controls
  const stopDrivingKeyPropagation = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    e.stopPropagation();
  };

  const { facialCueState } = webcamObserver;
  const cueBadgeLabel = !webcamObserver.cameraActive
    ? 'Camera Off'
    : !facialCueState.faceDetected
      ? 'No Face in Frame'
      : facialCueState.cueKind === 'smiling-cue'
        ? 'Visible Cue: Smile / Upturned Mouth'
        : facialCueState.cueKind === 'active-facial-movement'
          ? 'Visible Cue: Head / Brow Movement'
          : 'Visible Cue: Steady Neutral Posture';

  return (
    <section
      className="pk-coach-bar"
      aria-label="AI Voice Coach, Webcam Observer, and RAG Memory Controls"
    >
      <div className="pk-coach-bar__main-row">
        {/* Left: Status & RAG Memory Counters */}
        <div className="pk-coach-bar__brand-cluster">
          <span className="pk-coach-bar__pill pk-coach-bar__pill--accent">
            <Sparkles size={13} aria-hidden="true" />
            <span>AI Coach &amp; RAG Loop · Attempt #{attemptNumber}</span>
          </span>

          <span
            className="pk-coach-bar__memory-stat"
            title="Persisted in browser localStorage (parklab3d:rag-memory:v1)"
          >
            <Database size={12} aria-hidden="true" />
            <span>
              RAG Memory: {totalStoredCrashes} crashes · {totalStoredAttempts}{' '}
              attempts
            </span>
          </span>

          {voiceCoach.isSpeaking && (
            <span className="pk-crash-coach__speaking-pill" aria-live="polite">
              <Volume2 size={12} aria-hidden="true" />
              <span>Speaking</span>
            </span>
          )}
        </div>

        {/* Right: Voice, Webcam, Ask Coach & Memory Reset Buttons */}
        <div className="pk-coach-bar__controls-cluster">
          {/* 1. Voice Coach Enable / Disable */}
          <button
            type="button"
            className={`pk-btn ${
              voiceCoach.voiceEnabled ? 'pk-btn--primary' : 'pk-btn--secondary'
            }`}
            onClick={() => voiceCoach.setVoiceEnabled(!voiceCoach.voiceEnabled)}
            title="Toggle Automatic Spoken Crash Coaching"
          >
            {voiceCoach.voiceEnabled ? (
              <Volume2 size={13} aria-hidden="true" />
            ) : (
              <VolumeX size={13} aria-hidden="true" />
            )}
            <span>
              Voice Coach: {voiceCoach.voiceEnabled ? 'On' : 'Off'}
            </span>
          </button>

          {/* Mute / Unmute */}
          <button
            type="button"
            className="pk-btn pk-btn--secondary"
            onClick={() => voiceCoach.setIsMuted(!voiceCoach.isMuted)}
            title={voiceCoach.isMuted ? 'Unmute Voice Coach' : 'Mute Voice Coach'}
          >
            {voiceCoach.isMuted ? (
              <VolumeX size={13} aria-hidden="true" />
            ) : (
              <Volume2 size={13} aria-hidden="true" />
            )}
            <span>{voiceCoach.isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Replay Last Feedback */}
          <button
            type="button"
            className="pk-btn pk-btn--secondary"
            onClick={voiceCoach.replayLastCoaching}
            disabled={!voiceCoach.lastSpokenText}
            title="Replay the last spoken coaching message"
          >
            <RotateCcw size={12} aria-hidden="true" />
            <span>Replay Speech</span>
          </button>

          {/* Stop Speaking */}
          {voiceCoach.isSpeaking && (
            <button
              type="button"
              className="pk-btn pk-btn--secondary"
              onClick={voiceCoach.stopSpeaking}
              title="Stop active speech immediately"
            >
              <Square size={12} aria-hidden="true" />
              <span>Stop Speech</span>
            </button>
          )}

          {/* Voice Rate/Volume Toggle */}
          <button
            type="button"
            className="pk-btn pk-btn--secondary"
            onClick={() => setShowVoiceSettings((prev) => !prev)}
          >
            <span>Voice Settings</span>
          </button>

          {/* 2. Opt-In Webcam Observer Enable / Disable */}
          <button
            type="button"
            className={`pk-btn ${
              webcamObserver.cameraActive
                ? 'pk-btn--success'
                : 'pk-btn--secondary'
            }`}
            onClick={() => {
              if (webcamObserver.cameraActive) {
                webcamObserver.disableCamera();
              } else {
                void webcamObserver.enableCamera();
              }
            }}
            disabled={webcamObserver.cameraLoading}
            title="Opt-in laptop camera for on-device visible facial cue observation"
          >
            {webcamObserver.cameraActive ? (
              <CameraOff size={13} aria-hidden="true" />
            ) : (
              <Camera size={13} aria-hidden="true" />
            )}
            <span>
              {webcamObserver.cameraLoading
                ? 'Starting Camera...'
                : webcamObserver.cameraActive
                  ? 'Disable Camera'
                  : 'Enable Camera'}
            </span>
          </button>

          {/* 3. Ask Coach (Voice & Text Q&A) */}
          <button
            type="button"
            className={`pk-btn ${
              showAskDrawer || voiceCoach.isListening
                ? 'pk-btn--primary'
                : 'pk-btn--secondary'
            }`}
            onClick={() => setShowAskDrawer((prev) => !prev)}
          >
            <MessageSquare size={13} aria-hidden="true" />
            <span>Ask Coach</span>
          </button>

          {/* 4. Reset AI Memory */}
          <button
            type="button"
            className="pk-btn pk-btn--secondary"
            onClick={onResetMemory}
            title="Clear all saved crashes and attempts from localStorage (parklab3d:rag-memory:v1)"
          >
            <Trash2 size={13} aria-hidden="true" />
            <span>Reset AI Memory</span>
          </button>
        </div>
      </div>

      {/* Optional Voice Volume & Rate Settings Strip */}
      {showVoiceSettings && (
        <div className="pk-coach-bar__subpanel">
          <div className="pk-coach-bar__slider-group">
            <label htmlFor="pk-voice-volume">
              Volume: {Math.round(voiceCoach.volume * 100)}%
            </label>
            <input
              id="pk-voice-volume"
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={voiceCoach.volume}
              onChange={(e) => voiceCoach.setVolume(Number(e.target.value))}
            />
          </div>

          <div className="pk-coach-bar__slider-group">
            <label htmlFor="pk-voice-rate">
              Speech Rate: {voiceCoach.rate.toFixed(2)}x
            </label>
            <input
              id="pk-voice-rate"
              type="range"
              min={0.75}
              max={1.35}
              step={0.05}
              value={voiceCoach.rate}
              onChange={(e) => voiceCoach.setRate(Number(e.target.value))}
            />
          </div>

          <span className="pk-coach-bar__voice-meta">
            Voice: {voiceCoach.activeVoiceLabel}
          </span>
        </div>
      )}

      {/* Camera Error Notice */}
      {webcamObserver.cameraError && (
        <div className="pk-coach-bar__notice" role="status">
          <span>{webcamObserver.cameraError}</span>
        </div>
      )}

      {/* Live Opt-In Webcam Preview & On-Device Facial Cue Panel */}
      {webcamObserver.cameraActive && (
        <div className="pk-webcam-preview">
          <div className="pk-webcam-preview__video-wrap">
            <video
              ref={webcamObserver.videoRef}
              className="pk-webcam-preview__video"
              muted
              playsInline
              autoPlay
            />
            <span className="pk-webcam-preview__live-dot">LIVE</span>
          </div>

          <div className="pk-webcam-preview__info">
            <div className="pk-webcam-preview__cue-row">
              <span className="pk-webcam-preview__cue-badge">
                {cueBadgeLabel}
              </span>
              <span className="pk-webcam-preview__metrics">
                Smile cue: {Math.round(facialCueState.smileIndicator * 100)}% ·
                Motion: {Math.round(facialCueState.movementIndicator * 100)}% ·
                Eye band: {Math.round(facialCueState.eyeOpennessIndicator * 100)}%
              </span>
            </div>
            <p className="pk-webcam-preview__privacy-note">
              {facialCueState.uncertaintyNote}
            </p>
          </div>
        </div>
      )}

      {/* Attempt-Over-Attempt Comparison Banner (when retrying after prior attempts) */}
      {attemptComparison && (
        <div className="pk-attempt-compare-banner">
          <div className="pk-attempt-compare-banner__title">
            <History size={13} aria-hidden="true" />
            <strong>{attemptComparison.headline}</strong>
          </div>
          <ul className="pk-attempt-compare-banner__list">
            {attemptComparison.bulletPoints.map((pt, idx) => (
              <li key={`banner-cmp-${idx}`}>{pt}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Interactive "Ask Coach" Drawer (Push-to-Talk Mic + Text Fallback) */}
      {showAskDrawer && (
        <div className="pk-ask-coach">
          <div className="pk-ask-coach__top">
            <span className="pk-ask-coach__title">
              Ask the AI Driving Coach (Grounded in RAG Memory)
            </span>
            <div className="pk-ask-coach__chips">
              {QUICK_COACH_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="pk-ask-coach__chip"
                  onClick={() => onAskCoach(q, 'text-input')}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <form className="pk-ask-coach__form" onSubmit={handleTextSubmit}>
            <button
              type="button"
              className={`pk-btn ${
                voiceCoach.isListening
                  ? 'pk-btn--success'
                  : 'pk-btn--secondary'
              }`}
              onClick={handleMicAsk}
              title="Push-to-talk voice question (uses browser SpeechRecognition)"
            >
              {voiceCoach.isListening ? (
                <>
                  <MicOff size={13} aria-hidden="true" />
                  <span>Listening... (Click to Stop)</span>
                </>
              ) : (
                <>
                  <Mic size={13} aria-hidden="true" />
                  <span>Speak Question (Mic)</span>
                </>
              )}
            </button>

            <input
              type="text"
              className="pk-ask-coach__input"
              placeholder="Or type a question (e.g., Why did I crash? How do I fix my angle?)..."
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={stopDrivingKeyPropagation}
              onKeyUp={stopDrivingKeyPropagation}
            />

            <button type="submit" className="pk-btn pk-btn--primary">
              <Send size={13} aria-hidden="true" />
              <span>Ask</span>
            </button>
          </form>

          <p className="pk-ask-coach__disclosure">
            Privacy note: Microphone listens only when you click &ldquo;Speak
            Question (Mic)&rdquo;. Browser speech recognition may use your
            browser vendor&apos;s recognition service; text input stays 100%
            local.
          </p>

          {voiceCoach.recognitionError && (
            <p className="pk-ask-coach__error">{voiceCoach.recognitionError}</p>
          )}

          {latestQAExchange && (
            <div className="pk-ask-coach__answer">
              <div className="pk-ask-coach__question-line">
                <strong>You asked ({latestQAExchange.inputMode}):</strong>{' '}
                &ldquo;{latestQAExchange.questionText}&rdquo;
              </div>
              <p className="pk-ask-coach__answer-text">
                {latestQAExchange.answerText}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default CrashFeedbackPanel;
