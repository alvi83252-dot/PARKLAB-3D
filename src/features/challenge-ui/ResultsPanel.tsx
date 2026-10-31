/**
 * PARKLAB 3D — ResultsPanel Component
 *
 * Displays deterministic manoeuvre assessment results + Gamified XP & Leaderboard:
 * - PASS or TRY AGAIN verdict badge
 * - Score out of 100 and 0–3 star rating
 * - Gamified Points Breakdown (+XP Earned, Streak Multiplier, Clean Car Bonus,
 *   Time Blitz Bonus, SpaceX Sky-Flight Landing Bonus, Driver Level & Rank)
 * - Live Global Park Master Leaderboard Standings (ARTHUR, YUSUFDEMIR201, YOU)
 * - Collisions, position accuracy, alignment accuracy, elapsed time, and corrections
 * - Detailed examiner feedback list
 * - Controlled Retry and Next Challenge action callbacks
 */

import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Film,
  Flame,
  History,
  Rocket,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import {
  getLeaderboardStandings,
  loadDriverProfile,
  type AttemptPointsBreakdown,
  type DriverProfile,
} from '../leaderboard/leaderboardStore';
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
  /** Optional gamified points breakdown for this attempt */
  pointsBreakdown?: AttemptPointsBreakdown | null;
  /** Optional updated driver profile */
  driverProfile?: DriverProfile;
  /** Optional active vehicle name for leaderboard row */
  vehicleName?: string;
  /** Controlled callback to retry the current challenge */
  onRetry: () => void;
  /** Optional callback to watch 3D replay in the 3D viewport */
  onWatchReplay?: () => void;
  /** Optional callback to open the 2D Telemetry Replay Theatre */
  onOpenReplayTheatre?: () => void;
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
  pointsBreakdown,
  driverProfile: propProfile,
  vehicleName = 'New Tesla Roadster',
  onRetry,
  onWatchReplay,
  onOpenReplayTheatre,
  onNextChallenge,
  onNext,
}: ResultsPanelProps) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const handleNext = onNextChallenge ?? onNext;

  const profile = propProfile ?? loadDriverProfile();
  const standings = getLeaderboardStandings(profile, vehicleName);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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

            <span className="pk-results__rank-pill">
              <Trophy size={12} aria-hidden="true" />
              <span>
                LV {profile.level} · {profile.rankTitle}
              </span>
            </span>

            {pointsBreakdown && (
              <span className="pk-results__xp-pill">
                +{pointsBreakdown.totalEarnedPoints.toLocaleString()} PTS
              </span>
            )}
          </div>

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

      {/* Gamified XP Breakdown Strip */}
      {pointsBreakdown && (
        <div className="pk-results__xp-breakdown">
          <div className="pk-results__xp-header">
            <span className="pk-results__xp-title">
              <Flame size={13} aria-hidden="true" />
              <span>GAMIFIED SCORE &amp; BONUS BREAKDOWN</span>
            </span>
            <strong className="pk-results__xp-total">
              +{pointsBreakdown.totalEarnedPoints.toLocaleString()} PTS (TOTAL:{' '}
              {profile.totalPoints.toLocaleString()} PTS)
            </strong>
          </div>

          <div className="pk-results__xp-chips">
            <span className="pk-results__xp-chip">
              Base Score: +{pointsBreakdown.basePoints}
            </span>
            {pointsBreakdown.timeBlitzBonus > 0 && (
              <span className="pk-results__xp-chip pk-results__xp-chip--bonus">
                Time Blitz: +{pointsBreakdown.timeBlitzBonus}
              </span>
            )}
            {pointsBreakdown.cleanCarBonus > 0 && (
              <span className="pk-results__xp-chip pk-results__xp-chip--clean">
                Zero-Scratch Clean: +{pointsBreakdown.cleanCarBonus}
              </span>
            )}
            {pointsBreakdown.precisionBonus > 0 && (
              <span className="pk-results__xp-chip pk-results__xp-chip--bonus">
                Laser Precision: +{pointsBreakdown.precisionBonus}
              </span>
            )}
            {pointsBreakdown.skyFlightBonus > 0 && (
              <span className="pk-results__xp-chip pk-results__xp-chip--flight">
                <Rocket size={11} aria-hidden="true" />
                Sky-Flight ({pointsBreakdown.maxAltitudeMeters}m): +
                {pointsBreakdown.skyFlightBonus}
              </span>
            )}
            {pointsBreakdown.streakMultiplier > 1 && (
              <span className="pk-results__xp-chip pk-results__xp-chip--streak">
                Hot Streak ({pointsBreakdown.streakCount}x): ×
                {pointsBreakdown.streakMultiplier}
              </span>
            )}
          </div>
        </div>
      )}

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

      {/* Toggleable Examiner Feedback vs Global Leaderboard */}
      <div className="pk-results__tab-row">
        <button
          type="button"
          className={`pk-results__tab-btn ${!showLeaderboard ? 'is-active' : ''}`}
          onClick={() => setShowLeaderboard(false)}
        >
          Examiner Feedback
        </button>
        <button
          type="button"
          className={`pk-results__tab-btn ${showLeaderboard ? 'is-active' : ''}`}
          onClick={() => setShowLeaderboard(true)}
        >
          <Trophy size={13} aria-hidden="true" />
          <span>Park Master Leaderboard</span>
        </button>
      </div>

      {!showLeaderboard ? (
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
      ) : (
        <div className="pk-results__leaderboard-box">
          {standings.slice(0, 6).map((entry) => (
            <div
              key={entry.id}
              className={`pk-results__lb-row ${
                entry.isPlayer ? 'pk-results__lb-row--player' : ''
              }`}
            >
              <span className="pk-results__lb-rank">#{entry.rank}</span>
              <span
                className="pk-results__lb-lv"
                style={{ borderColor: entry.badgeColor }}
              >
                LV {entry.level}
              </span>
              <div className="pk-results__lb-driver">
                <strong>
                  {entry.driverName}
                  {entry.isPlayer ? ' (YOU)' : ''}
                </strong>
                <span>
                  {entry.rankTitle} · {entry.signatureVehicle}
                </span>
              </div>
              <strong className="pk-results__lb-pts">
                {entry.totalPoints.toLocaleString()} PTS
              </strong>
            </div>
          ))}
        </div>
      )}

      {/* Controlled Action Buttons */}
      <footer className="pk-results__actions">
        <button
          type="button"
          className="pk-btn pk-btn--secondary"
          onClick={onRetry}
        >
          <RotateCcw size={14} aria-hidden="true" />
          <span>Retry</span>
        </button>

        {onWatchReplay && (
          <button
            type="button"
            className="pk-btn pk-btn--replay"
            onClick={onWatchReplay}
          >
            <Film size={14} aria-hidden="true" />
            <span>Watch 3D Replay</span>
          </button>
        )}

        {onOpenReplayTheatre && (
          <button
            type="button"
            className="pk-btn pk-btn--secondary"
            onClick={onOpenReplayTheatre}
          >
            <History size={14} aria-hidden="true" />
            <span>2D Telemetry Replay</span>
          </button>
        )}

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
