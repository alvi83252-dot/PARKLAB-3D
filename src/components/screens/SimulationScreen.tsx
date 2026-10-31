import { Link } from 'react-router-dom';
import { ArrowLeft, Box } from 'lucide-react';
import { APP_ROUTES } from '../../constants/routes';

export function SimulationScreen() {
  return (
    <section className="placeholder-card" aria-labelledby="simulation-screen-title">
      <div className="placeholder-card__eyebrow">
        <Box size={14} aria-hidden="true" />
        <span>Under Development</span>
      </div>

      <h1 id="simulation-screen-title" className="placeholder-card__title">
        Simulation Screen
      </h1>

      <p className="placeholder-card__description">
        This screen is currently under development. Future stages will mount the
        Three.js / React Three Fiber 3D parking environment, vehicle dynamics,
        and real-time parking assessment HUD here.
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
