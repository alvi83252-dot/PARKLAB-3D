import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { APP_ROUTES } from '../../constants/routes';

export function ChallengeSelection() {
  return (
    <section className="placeholder-card" aria-labelledby="challenge-screen-title">
      <div className="placeholder-card__eyebrow">
        <Compass size={14} aria-hidden="true" />
        <span>Under Development</span>
      </div>

      <h1 id="challenge-screen-title" className="placeholder-card__title">
        Challenge Selection
      </h1>

      <p className="placeholder-card__description">
        This screen is currently under development. Future stages will provide
        five UK driving test parking manoeuvres with difficulty tiers and
        completion criteria.
      </p>

      <div className="placeholder-actions">
        <Link to={APP_ROUTES.HOME} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Return to Overview</span>
        </Link>
      </div>
    </section>
  );
}
