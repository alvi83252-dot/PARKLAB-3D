import { Link } from 'react-router-dom';
import { ArrowRight, Car, Compass, Play, ShieldCheck } from 'lucide-react';
import { APP_ROUTES } from '../../constants/routes';
import { VEHICLES } from '../../features/vehicles';
import { CHALLENGES } from '../../features/challenges';

export function HomeScreen() {
  return (
    <section className="placeholder-card" aria-labelledby="home-title">
      <div className="placeholder-card__eyebrow">
        <ShieldCheck size={14} aria-hidden="true" />
        <span>Interactive UK Driving Test 3D Parking Simulator</span>
      </div>

      <h1 id="home-title" className="placeholder-card__title">
        PARKLAB 3D
      </h1>

      <p className="placeholder-card__description">
        Practise all five official UK DVSA driving test parking manoeuvres in a
        realistic 3D training centre. Select from {VEHICLES.length} distinct
        vehicles—including the new Tesla Roadster—experience Ackermann-inspired
        driving physics, and receive instant precision telemetry and scoring.
      </p>

      <div className="placeholder-actions">
        <Link
          to={APP_ROUTES.SIMULATION}
          className="pk-btn pk-btn--primary"
          style={{ padding: '0.65rem 1.35rem', fontSize: 'var(--text-sm)' }}
        >
          <Play size={16} aria-hidden="true" />
          <span>Launch 3D Parking Simulator</span>
        </Link>

        <Link
          to={`${APP_ROUTES.SIMULATION}?vehicle=tesla-roadster`}
          className="btn-secondary"
        >
          <Car size={16} aria-hidden="true" />
          <span>Drive New Tesla Roadster</span>
        </Link>
      </div>

      <div className="route-grid" aria-label="Application screens">
        <Link to={APP_ROUTES.VEHICLES} className="route-tile">
          <div className="route-tile__header">
            <span>Vehicle Garage</span>
            <ArrowRight size={16} aria-hidden="true" />
          </div>
          <span className="route-tile__meta">
            {VEHICLES.length} Selectable Vehicles · Hatchback, Sedan, SUV &amp;
            Tesla Roadster
          </span>
        </Link>

        <Link to={APP_ROUTES.CHALLENGES} className="route-tile">
          <div className="route-tile__header">
            <span>UK Parking Challenges</span>
            <ArrowRight size={16} aria-hidden="true" />
          </div>
          <span className="route-tile__meta">
            {CHALLENGES.length} DVSA Manoeuvres · Parallel, Bay, Angled &amp;
            Roadside
          </span>
        </Link>

        <Link to={APP_ROUTES.SIMULATION} className="route-tile">
          <div className="route-tile__header">
            <span>3D Simulation Arena</span>
            <Compass size={16} aria-hidden="true" />
          </div>
          <span className="route-tile__meta">
            Full 3D Environment · Follow &amp; Overhead Cameras · Live Scoring
          </span>
        </Link>
      </div>
    </section>
  );
}
