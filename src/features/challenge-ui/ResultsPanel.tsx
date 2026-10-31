/**
 * PARKLAB 3D — ResultsPanel Component
 *
 * Displays deterministic manoeuvre assessment results:
 * - PASS or TRY AGAIN verdict badge
 * - Score out of 100 and 0–3 star rating
 * - Collisions, position accuracy, alignment accuracy, elapsed time, and corrections
 * - Detailed examiner feedback list
 * - Optional RAG Attempt-over-Attempt Progression & Crash Coaching Summary
 * - Controlled Retry and Next Challenge action callbacks
 */

import {
  AlertTriangle,
  ArrowRight,
  Award,
  Film,
  History,
  RotateCcw,
  Sparkles,
  Star,
} from 'lucide-react';
import type {
  ParkingChallengeDefinition,
  ParkingEvaluationResult,
} from '../challenges/types';
import type {
  AICrashFeedbackReport,
  AttemptComparisonDelta,
} from '../evaluation/crashRagTypes';
import './challenge-ui.css';

export interface ResultsPanelProps {
  /** Deterministic evaluation result from evaluateParking */
  result: ParkingEvaluationResult;
  /** Optional active challenge metadata for contextual heading */
  challenge?: ParkingChallengeDefinition;
  /** Optional attempt-over-attempt comparison delta from the RAG feedback loop */
  attemptComparison?: AttemptComparisonDelta | null;
  /** Optional most recent crash coaching report from this attempt */
  recentCrashReport?: AICrashFeedbackReport | null;
  /** Controlled callback to retry the current challenge */
  onRetry: () => void;
  /** Optional callback to watch the recorded replay of this attempt */
  onWatchReplay?: () => void;
  /** Controlled callback to advance to the next challenge */
  onNextChallenge?: () => void;
  /** Alias for onNextChallenge for flexible integration */
  onNext?: () => void;
}

export function ResultsPanel({
  result,
  challenge,
  attemptComparison,
  recentCrashReport,
  onRetry,
  onWatchReplay,
  onNextChallenge,
  onNext,
}: ResultsPanelProps) {
  const handleNext = onNextChallenge ?? onNext;

  const positionAccuracyPercent = Math.max(
    0,
    Math.min(100, Math.round((1 - result.positionErrorMeters / 1.4) * 100))
  );
  const alignmentAccuracyPercent = Math.max(
    0,
    Math.min(100, Math.round((1 - result.alignmentErrorDegrees / 18) * 100))
  );

  return (
    <section
      className={`pk-results ${
        result.passed ? 'pk-results--passed' : 'pk-results--failed'
      }`}
      aria-labelledby="pk-results-verdict-heading"
    >
      {/* Top Verdict & Score Banner */}
      <header className="pk-results__banner">
        <div className="pk-results__status-group">
          <span
            className={`pk-results__verdict-pill ${
              result.passed
                ? 'pk-results__verdict-pill--pass'
                : 'pk-results__verdict-pill--fail'
            }`}
          >
            {result.passed ? (
              <>
                <Award size={14} aria-hidden="true" />
                <span>PASS</span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} aria-hidden="true" />
                <span>TRY AGAIN</span>
              </>
            )}
          </span>

          <h2 id="pk-results-verdict-heading" className="pk-results__title">
            {result.passed ? 'Manoeuvre Passed' : 'Manoeuvre Incomplete'}
          </h2>

          <p className="pk-results__subtitle">
            {challenge
              ? `${challenge.title} · UK Driving Test Assessment`
              : 'UK Driving Test Manoeuvre Assessment'}
          </p>
        </div>

        <div className="pk-results__score-box">
          <div>
            <span className="pk-results__score-number">{result.score}</span>
            <span className="pk-results__score-max"> / 100</span>
          </div>

          <div
            className="pk-results__stars"
            aria-label={`${result.stars} out of 3 stars`}
          >
            {[1, 2, 3].map((starNumber) => {
              const filled = starNumber <= result.stars;
              return (
                <Star
                  key={starNumber}
                  size={18}
                  aria-hidden="true"
                  className={
                    filled
                      ? 'pk-results__star--filled'
                      : 'pk-results__star--empty'
                  }
                />
              );
            })}
          </div>
        </div>
      </header>

      {/* Telemetry Breakdown Grid */}
      <div className="pk-results__metrics-grid">
        <div className="pk-results__metric-card">
          <span className="pk-results__metric-label">Position Accuracy</span>
          <span className="pk-results__metric-value">
            {result.positionErrorMeters.toFixed(2)} m
          </span>
          <span className="pk-results__metric-sub">
            {positionAccuracyPercent}% spatial accuracy
          </span>
        </div>

        <div className="pk-results__metric-card">
          <span className="pk-results__metric-label">Alignment Accuracy</span>
          <span className="pk-results__metric-value">
            {result.alignmentErrorDegrees.toFixed(1)}°
          </span>
          <span className="pk-results__metric-sub">
            {alignmentAccuracyPercent}% heading match
          </span>
        </div>

        <div className="pk-results__metric-card">
          <span className="pk-results__metric-label">Collisions</span>
          <span className="pk-results__metric-value">{result.collisions}</span>
          <span className="pk-results__metric-sub">
            {result.collisions === 0 ? 'Zero contact faults' : 'Contact fault'}
          </span>
        </div>

        <div className="pk-results__metric-card">
          <span className="pk-results__metric-label">Elapsed Time</span>
          <span className="pk-results__metric-value">
            {result.elapsedSeconds.toFixed(1)}s
          </span>
          <span className="pk-results__metric-sub">Manoeuvre duration</span>
        </div>

        <div className="pk-results__metric-card">
          <span className="pk-results__metric-label">Corrections</span>
          <span className="pk-results__metric-value">{result.corrections}</span>
          <span className="pk-results__metric-sub">Direction changes</span>
        </div>
      </div>

      {/* Attempt-Over-Attempt Progression Summary (RAG Continuous Feedback Loop) */}
      {attemptComparison && (
        <div className="pk-results__feedback-box pk-results__comparison-box">
          <h3 className="pk-results__feedback-heading">
            <History size={13} aria-hidden="true" />
            <span>{attemptComparison.headline}</span>
          </h3>
          <ul className="pk-results__feedback-list">
            {attemptComparison.bulletPoints.map((pt, idx) => (
              <li
                key={`attempt-delta-${idx}`}
                className="pk-results__feedback-item"
              >
                <span className="pk-results__feedback-dot" aria-hidden="true" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* RAG Crash Coaching Summary if a collision occurred during the attempt */}
      {recentCrashReport && (
        <div className="pk-results__feedback-box pk-results__rag-box">
          <h3 className="pk-results__feedback-heading">
            <Sparkles size={13} aria-hidden="true" />
            <span>
              AI Crash Coach Summary ({recentCrashReport.obstacleLabel.split('(')[0].trim()})
            </span>
          </h3>
          <p className="pk-crash-coach__text">
            {recentCrashReport.whatHappened} {recentCrashReport.probableCause}
          </p>
          <p className="pk-crash-coach__subtext">
            <strong>Next Attempt Focus:</strong>{' '}
            {recentCrashReport.nextAttemptFocus}
          </p>
        </div>
      )}

      {/* Examiner Feedback List */}
      <div className="pk-results__feedback-box">
        <h3 className="pk-results__feedback-heading">Examiner Feedback</h3>
        <ul className="pk-results__feedback-list">
          {result.feedback.map((item, idx) => (
            <li key={`feedback-${idx}`} className="pk-results__feedback-item">
              <span className="pk-results__feedback-dot" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Controlled Action Buttons */}
      <footer className="pk-results__actions">
        {onWatchReplay && (
          <button
            type="button"
            className="pk-btn pk-btn--secondary"
            onClick={onWatchReplay}
          >
            <Film size={14} aria-hidden="true" />
            <span>Watch Attempt Replay</span>
          </button>
        )}

        <button
          type="button"
          className="pk-btn pk-btn--secondary"
          onClick={onRetry}
        >
          <RotateCcw size={14} aria-hidden="true" />
          <span>Retry</span>
        </button>

        {handleNext && (
          <button
            type="button"
            className="pk-btn pk-btn--primary"
            onClick={handleNext}
          >
            <span>Next Challenge</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </footer>
    </section>
  );
}

export default ResultsPanel;
