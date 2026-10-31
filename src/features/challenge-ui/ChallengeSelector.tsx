/**
 * PARKLAB 3D — ChallengeSelector Component
 *
 * Displays all five UK driving test parking challenges with difficulty badges,
 * bay dimensions, obstacle counts, and manoeuvre descriptions, allowing the
 * player to select a scenario.
 */

import { CheckCircle2, ChevronRight, Compass, ShieldAlert } from 'lucide-react';
import { CHALLENGES } from '../challenges/challengesData';
import type {
  ChallengeDifficulty,
  ChallengeId,
  ParkingChallengeDefinition,
} from '../challenges/types';
import './challenge-ui.css';

export interface ChallengeSelectorProps {
  /** Optional list of challenge definitions (defaults to central CHALLENGES) */
  challenges?: ParkingChallengeDefinition[];
  /** Currently active challenge ID */
  selectedChallengeId?: ChallengeId | string;
  /** Callback invoked with the selected ChallengeId */
  onSelect: (challengeId: ChallengeId) => void;
  /** Optional secondary callback receiving the full challenge definition */
  onSelectChallenge?: (challenge: ParkingChallengeDefinition) => void;
  /** Renders a compact bar/grid suitable for in-simulation quick switching */
  compact?: boolean;
}

const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export function ChallengeSelector({
  challenges = CHALLENGES,
  selectedChallengeId = CHALLENGES[0].id,
  onSelect,
  onSelectChallenge,
  compact = false,
}: ChallengeSelectorProps) {
  const handleSelect = (challenge: ParkingChallengeDefinition) => {
    onSelect(challenge.id);
    onSelectChallenge?.(challenge);
  };

  return (
    <section
      className={`pk-selector ${compact ? 'pk-selector--compact' : ''}`}
      aria-label="UK Driving Test Parking Challenges"
    >
      {!compact && (
        <header className="pk-selector__header">
          <div className="pk-selector__title-group">
            <span className="pk-selector__eyebrow">
              UK DVSA Manoeuvre Catalogue
            </span>
            <h2 className="pk-selector__heading">Select a Parking Challenge</h2>
            <p className="pk-selector__subtitle">
              Choose one of the five standard UK driving test manoeuvres to
              practise spatial control and bay alignment.
            </p>
          </div>
          <span className="pk-selector__count-pill">
            {challenges.length} Scenarios Available
          </span>
        </header>
      )}

      <div className="pk-selector__grid" role="list">
        {challenges.map((challenge, index) => {
          const isSelected = challenge.id === selectedChallengeId;
          const parkedCarsCount = challenge.obstacles.filter(
            (o) => o.kind === 'parked-car'
          ).length;
          const conesCount = challenge.obstacles.filter(
            (o) => o.kind === 'cone'
          ).length;

          return (
            <button
              key={challenge.id}
              type="button"
              role="listitem"
              aria-pressed={isSelected}
              className={`pk-challenge-card ${
                isSelected ? 'pk-challenge-card--selected' : ''
              }`}
              onClick={() => handleSelect(challenge)}
            >
              <div className="pk-challenge-card__top">
                <div className="pk-challenge-card__meta-row">
                  <span className="pk-challenge-card__index">
                    #{String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`pk-difficulty-badge pk-difficulty-badge--${challenge.difficulty}`}
                  >
                    {DIFFICULTY_LABELS[challenge.difficulty]}
                  </span>
                </div>

                <h3 className="pk-challenge-card__title">{challenge.title}</h3>

                {!compact && (
                  <p className="pk-challenge-card__description">
                    {challenge.description}
                  </p>
                )}
              </div>

              <div className="pk-challenge-card__footer">
                <div className="pk-challenge-card__specs">
                  <span
                    className="pk-challenge-card__spec-item"
                    title="Target Bay Dimensions"
                  >
                    <Compass size={12} aria-hidden="true" />
                    {challenge.parkingTarget.width.toFixed(1)}m ×{' '}
                    {challenge.parkingTarget.length.toFixed(1)}m
                  </span>
                  {!compact && (
                    <span
                      className="pk-challenge-card__spec-item"
                      title="Active Obstacles"
                    >
                      <ShieldAlert size={12} aria-hidden="true" />
                      {parkedCarsCount} cars · {conesCount} cones
                    </span>
                  )}
                </div>

                <span className="pk-challenge-card__cta">
                  {compact && isSelected ? (
                    <>
                      <CheckCircle2 size={14} aria-hidden="true" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <span>{compact ? 'Select' : 'Start'}</span>
                      <ChevronRight size={14} aria-hidden="true" />
                    </>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default ChallengeSelector;
