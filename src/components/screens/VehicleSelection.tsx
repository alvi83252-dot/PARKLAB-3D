import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import { APP_ROUTES } from '../../constants/routes';
import {
  VEHICLES,
  VehicleSelector,
  getVehicleById,
} from '../../features/vehicles';

export function VehicleSelection() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    VEHICLES[0].id
  );
  const navigate = useNavigate();
  const selectedVehicle = getVehicleById(selectedVehicleId);

  return (
    <section
      className="placeholder-card"
      aria-labelledby="vehicle-screen-title"
      style={{ gap: '1.5rem' }}
    >
      <VehicleSelector
        selectedVehicleId={selectedVehicleId}
        onSelect={(id) => setSelectedVehicleId(id)}
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
            navigate(`${APP_ROUTES.SIMULATION}?vehicle=${selectedVehicleId}`)
          }
          className="pk-btn pk-btn--primary"
          style={{ padding: '0.6rem 1.2rem', fontSize: 'var(--text-sm)' }}
        >
          <Play size={16} aria-hidden="true" />
          <span>Drive {selectedVehicle.name} in 3D Simulator</span>
        </button>
      </div>
    </section>
  );
}
