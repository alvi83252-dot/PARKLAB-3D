import { Link } from 'react-router-dom';
import { ArrowLeft, Car } from 'lucide-react';
import { APP_ROUTES } from '../../constants/routes';

export function VehicleSelection() {
  return (
    <section className="placeholder-card" aria-labelledby="vehicle-screen-title">
      <div className="placeholder-card__eyebrow">
        <Car size={14} aria-hidden="true" />
        <span>Under Development</span>
      </div>

      <h1 id="vehicle-screen-title" className="placeholder-card__title">
        Vehicle Selection
      </h1>

      <p className="placeholder-card__description">
        This screen is currently under development. Future stages will introduce
        selectable vehicles—including the Tesla Roadster—alongside dimensional
        and handling specifications.
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
