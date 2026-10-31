import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import { APP_ROUTES } from '../../constants/routes';
import type { ChallengeId } from '../../types/challenge.types';
import {
  CHALLENGES,
  DEFAULT_CHALLENGE,
  getChallengeById,
} from '../../features/challenges';
import { ChallengeSelector } from '../../features/challenge-ui';

export function ChallengeSelection() {
  const [selectedChallengeId, setSelectedChallengeId] = useState<ChallengeId>(
    DEFAULT_CHALLENGE.id
  );
  const navigate = useNavigate();
  const activeChallenge = getChallengeById(selectedChallengeId);

  return (
    <section
      className="placeholder-card"
      aria-labelledby="challenge-screen-title"
      style={{ gap: '1.5rem' }}
    >
      <ChallengeSelector
        challenges={CHALLENGES}
        selectedChallengeId={selectedChallengeId}
        onSelect={(id) => setSelectedChallengeId(id)}
      />

      <div
        className="placeholder-actions"
        style={{
          justifyContent: 'space-between',
          paddingTop: '1rem',
          borderTop: '1px solid var(--color-border-subtle)',
        }}
      >
        <Link to={APP_ROUTES.HOME} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Overview</span>
        </Link>

        <button
          type="button"
          onClick={() =>
            navigate(
              `${APP_ROUTES.SIMULATION}?challenge=${selectedChallengeId}`
            )
          }
          className="pk-btn pk-btn--primary"
          style={{ padding: '0.6rem 1.2rem', fontSize: 'var(--text-sm)' }}
        >
          <Play size={16} aria-hidden="true" />
          <span>Practise {activeChallenge.title}</span>
        </button>
      </div>
    </section>
  );
}
