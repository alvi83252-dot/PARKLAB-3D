import { Link } from 'react-router-dom';
import { ArrowRight, Layers } from 'lucide-react';
import { APP_ROUTES } from '../../constants/routes';

export function HomeScreen() {
  return (
    <section className="placeholder-card" aria-labelledby="home-title">
      <div className="placeholder-card__eyebrow">
        <Layers size={14} aria-hidden="true" />
        <span>Stage 1 — Project Scaffolding &amp; Deployment Foundation</span>
      </div>

      <h1 id="home-title" className="placeholder-card__title">
        PARKLAB 3D
      </h1>

      <p className="placeholder-card__description">
        Interactive 3D UK driving test parking simulator foundation. Core
        TypeScript domain interfaces, routing architecture, and Vercel
        deployment configurations are initialised and ready for future stages.
      </p>

      <div className="route-grid" aria-label="Application screens">
        <Link to={APP_ROUTES.VEHICLES} className="route-tile">
          <div className="route-tile__header">
            <span>Vehicle Selection</span>
            <ArrowRight size={16} aria-hidden="true" />
          </div>
          <span className="route-tile__meta">Route: {APP_ROUTES.VEHICLES} · Under Development</span>
        </Link>

        <Link to={APP_ROUTES.CHALLENGES} className="route-tile">
          <div className="route-tile__header">
            <span>Challenge Selection</span>
            <ArrowRight size={16} aria-hidden="true" />
          </div>
          <span className="route-tile__meta">Route: {APP_ROUTES.CHALLENGES} · Under Development</span>
        </Link>

        <Link to={APP_ROUTES.SIMULATION} className="route-tile">
          <div className="route-tile__header">
            <span>Simulation Screen</span>
            <ArrowRight size={16} aria-hidden="true" />
          </div>
          <span className="route-tile__meta">Route: {APP_ROUTES.SIMULATION} · Under Development</span>
        </Link>
      </div>
    </section>
  );
}
