/**
 * PARKLAB 3D — Vehicle Selector Component
 * Allows players to switch between the four selectable vehicles and inspect
 * their physical dimensions and handling characteristics.
 */

import { CarFront } from 'lucide-react';
import type { VehicleCategory, VehicleDefinition } from './types';
import { getChassisSpec, getVehicleById, VEHICLES } from './vehicles';
import './VehicleSelector.css';

export interface VehicleSelectorProps {
  /** Currently selected vehicle ID */
  selectedVehicleId: string;
  /** Callback fired when a user selects a vehicle */
  onSelect?: (vehicleId: string) => void;
  /** Alias callback fired when a user selects a vehicle */
  onSelectVehicle?: (vehicleId: string) => void;
  /** Optional override list of vehicles (defaults to VEHICLES) */
  vehicles?: readonly VehicleDefinition[];
  /** Optional flag to disable switching during active locking states */
  disabled?: boolean;
  /** Optional additional CSS class name */
  className?: string;
}

function VehicleSilhouetteSvg({
  category,
  color,
}: {
  category: VehicleCategory;
  color: string;
}) {
  if (category === 'hatchback') {
    return (
      <svg viewBox="0 0 96 32" aria-hidden="true">
        <path
          d="M12 22 L15 14 L30 12 L44 6 L75 6 L82 14 L84 22 Z"
          fill={color}
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.2"
        />
        <path d="M33 12 L44 7.5 L72 7.5 L76 12 Z" fill="#0f172a" />
        <circle cx="26" cy="22" r="5.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
        <circle cx="70" cy="22" r="5.5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
      </svg>
    );
  }

  if (category === 'sedan') {
    return (
      <svg viewBox="0 0 96 32" aria-hidden="true">
        <path
          d="M6 22 L9 14 L29 12 L42 6.5 L67 6.5 L78 12.5 L90 14 L91 22 Z"
          fill={color}
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.2"
        />
        <path d="M32 12 L42 8 L65 8 L74 12 Z" fill="#0f172a" />
        <circle cx="23" cy="22" r="5.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx="74" cy="22" r="5.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />
      </svg>
    );
  }

  if (category === 'suv') {
    return (
      <svg viewBox="0 0 96 32" aria-hidden="true">
        <path
          d="M7 22 L9 11 L29 10 L37 4 L83 4 L88 12 L89 22 Z"
          fill={color}
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.2"
        />
        <path d="M32 10 L38 5.5 L80 5.5 L84 10 Z" fill="#0f172a" />
        <circle cx="24" cy="22.5" r="6.2" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.6" />
        <circle cx="73" cy="22.5" r="6.2" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.6" />
      </svg>
    );
  }

  // Flying Tesla Roadster: Levitating aerodynamic wedge with cyan hover pods & rear thruster plume
  return (
    <svg viewBox="0 0 96 32" aria-hidden="true">
      {/* Ground anti-gravity hover ring */}
      <ellipse
        cx="48"
        cy="27.5"
        rx="34"
        ry="2.2"
        fill="rgba(56, 189, 248, 0.2)"
        stroke="#38bdf8"
        strokeWidth="1"
        strokeDasharray="4 2"
      />
      {/* Rear cold-gas rocket plume */}
      <polygon points="86,14 96,11.5 96,17.5" fill="#38bdf8" opacity="0.85" />
      {/* Hovering Roadster fuselage */}
      <path
        d="M6 18 L12 12 L34 7.5 L52 4.5 L74 6.5 L88 10.5 L88 18 Z"
        fill={color}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.2"
      />
      <path d="M33 8 L51 5.2 L71 7.2 L62 9.5 Z" fill="#090d16" />
      {/* Tilted Hover-Turbine Nacelles */}
      <ellipse
        cx="24"
        cy="19.5"
        rx="6.2"
        ry="2.6"
        fill="#0f172a"
        stroke="#38bdf8"
        strokeWidth="1.4"
      />
      <ellipse
        cx="72"
        cy="19.5"
        rx="6.2"
        ry="2.6"
        fill="#0f172a"
        stroke="#38bdf8"
        strokeWidth="1.4"
      />
    </svg>
  );
}

const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  hatchback: 'Hatchback',
  sedan: 'Sedan',
  suv: 'Large SUV',
  sports: 'Flying Roadster',
  compact: 'Compact',
  saloon: 'Saloon',
  'electric-roadster': 'Flying Roadster',
};

export function VehicleSelector({
  selectedVehicleId,
  onSelect,
  onSelectVehicle,
  vehicles = VEHICLES,
  disabled = false,
  className = '',
}: VehicleSelectorProps) {
  const activeVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ??
    getVehicleById(selectedVehicleId);
  const activeChassis = getChassisSpec(activeVehicle);

  const topSpeedMph = Math.round(
    activeVehicle.handling.maxForwardSpeedMps * 2.23694
  );
  const speedPercent = Math.min(
    100,
    Math.round((activeVehicle.handling.maxForwardSpeedMps / 16.5) * 100)
  );
  const accelPercent = Math.min(
    100,
    Math.round((activeVehicle.handling.accelerationMps2 / 10.0) * 100)
  );
  const agilityPercent = Math.min(
    100,
    Math.round((activeVehicle.handling.steeringRate / 3.0) * 100)
  );

  return (
    <section
      className={`vk-selector ${className}`.trim()}
      aria-label="Vehicle selection"
    >
      <div className="vk-selector__header">
        <div className="vk-selector__title-group">
          <CarFront size={15} className="vk-selector__icon" aria-hidden="true" />
          <h2 className="vk-selector__title">Select Vehicle</h2>
        </div>
        <span className="vk-selector__active-pill">{activeVehicle.name}</span>
      </div>

      <div
        className="vk-selector__grid"
        role="radiogroup"
        aria-label="Available vehicles"
      >
        {vehicles.map((vehicle) => {
          const isSelected = vehicle.id === activeVehicle.id;
          const { length, width } = vehicle.dimensions;

          return (
            <button
              key={vehicle.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              className={`vk-selector__card ${
                isSelected ? 'vk-selector__card--selected' : ''
              }`.trim()}
              onClick={() => {
                onSelect?.(vehicle.id);
                onSelectVehicle?.(vehicle.id);
              }}
            >
              <div className="vk-selector__card-top">
                <span className="vk-selector__category-tag">
                  {CATEGORY_LABELS[vehicle.category]}
                </span>
                <span
                  className="vk-selector__swatch"
                  style={{ backgroundColor: vehicle.bodyColor }}
                  aria-hidden="true"
                />
              </div>

              <div className="vk-selector__silhouette">
                <VehicleSilhouetteSvg
                  category={vehicle.category}
                  color={vehicle.bodyColor}
                />
              </div>

              <span className="vk-selector__name">{vehicle.name}</span>
              <span className="vk-selector__dims">
                {length.toFixed(2)}m × {width.toFixed(2)}m
              </span>
            </button>
          );
        })}
      </div>

      <div className="vk-selector__telemetry" aria-live="polite">
        <p className="vk-selector__tagline">{activeChassis.tagline}</p>

        <div className="vk-selector__stats">
          <div className="vk-selector__stat">
            <div className="vk-selector__stat-header">
              <span>Top Speed</span>
              <span className="vk-selector__stat-value">{topSpeedMph} mph</span>
            </div>
            <div className="vk-selector__bar-track">
              <div
                className="vk-selector__bar-fill"
                style={{
                  width: `${speedPercent}%`,
                  backgroundColor: activeVehicle.bodyColor,
                }}
              />
            </div>
          </div>

          <div className="vk-selector__stat">
            <div className="vk-selector__stat-header">
              <span>Accel</span>
              <span className="vk-selector__stat-value">
                {activeVehicle.handling.accelerationMps2.toFixed(1)} m/s²
              </span>
            </div>
            <div className="vk-selector__bar-track">
              <div
                className="vk-selector__bar-fill"
                style={{
                  width: `${accelPercent}%`,
                  backgroundColor: activeVehicle.bodyColor,
                }}
              />
            </div>
          </div>

          <div className="vk-selector__stat">
            <div className="vk-selector__stat-header">
              <span>Steering</span>
              <span className="vk-selector__stat-value">
                {activeVehicle.handling.steeringRate.toFixed(1)} rad/s
              </span>
            </div>
            <div className="vk-selector__bar-track">
              <div
                className="vk-selector__bar-fill"
                style={{
                  width: `${agilityPercent}%`,
                  backgroundColor: activeVehicle.bodyColor,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
