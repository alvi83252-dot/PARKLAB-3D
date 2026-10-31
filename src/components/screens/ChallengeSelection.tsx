import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Car,
  Compass,
  Play,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { APP_ROUTES } from '../../constants/routes';
import {
  CHALLENGES,
  ChallengeSelector,
  getChallengeById,
  type ChallengeId,
} from '../../features/challenges';
import { VEHICLES, getVehicleById } from '../../features/vehicles';

export function ChallengeSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialChallengeId =
    (searchParams.get('challenge') as ChallengeId | null) || CHALLENGES[0].id;
  const initialVehicleId = searchParams.get('vehicle') || 'tesla-roadster';

  const [selectedChallengeId, setSelectedChallengeId] =
    useState<ChallengeId>(initialChallengeId);
  const [selectedVehicleId, setSelectedVehicleId] =
    useState<string>(initialVehicleId);

  const selectedVehicle = getVehicleById(selectedVehicleId);
  const selectedChallenge = getChallengeById(selectedChallengeId);

  const handleLaunch = (challengeId: ChallengeId = selectedChallenge.id) => {
    navigate(
      `${APP_ROUTES.SIMULATION}?challenge=${challengeId}&vehicle=${selectedVehicle.id}`
    );
  };

  return (
    <section
      aria-labelledby="challenge-screen-title"
      style={{
        width: 'min(1240px, 100%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          padding: '18px 22px',
          borderRadius: '18px',
          background: 'rgba(15, 23, 42, 0.84)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div>
          <div className="placeholder-card__eyebrow" style={{ marginBottom: '6px' }}>
            <Compass size={14} aria-hidden="true" />
            <span>UK DVSA Manoeuvre Catalogue &amp; Aero-Docking</span>
          </div>
          <h1
            id="challenge-screen-title"
            style={{
              margin: 0,
              fontSize: 'clamp(1.35rem, 2.4vw, 1.85rem)',
              fontWeight: 800,
              color: '#f8fafc',
              letterSpacing: '-0.02em',
            }}
          >
            Select a 3D Parking Manoeuvre
          </h1>
        </div>

        {/* Quick Vehicle Switcher Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#94a3b8',
              marginRight: '4px',
            }}
          >
            Active Vehicle:
          </span>
          {VEHICLES.map((v) => {
            const active = v.id === selectedVehicle.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicleId(v.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '999px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: active
                    ? 'rgba(56, 189, 248, 0.2)'
                    : 'rgba(30, 41, 59, 0.65)',
                  color: active ? '#f8fafc' : '#cbd5e1',
                  border: `1px solid ${
                    active ? '#38bdf8' : 'rgba(148, 163, 184, 0.22)'
                  }`,
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: v.bodyColor,
                  }}
                />
                <span>{v.name}</span>
              </button>
            );
          })}
          <Link
            to={`${APP_ROUTES.VEHICLES}?vehicle=${selectedVehicle.id}`}
            className="btn-secondary"
          >
            <Car size={15} aria-hidden="true" />
            <span>3D Hangar</span>
          </Link>
          <Link to={APP_ROUTES.HOME} className="btn-secondary">
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Overview</span>
          </Link>
        </div>
      </div>

      {/* Canonical ChallengeSelector Component */}
      <ChallengeSelector
        challenges={CHALLENGES}
        selectedChallengeId={selectedChallengeId}
        onSelect={(id) => setSelectedChallengeId(id)}
      />

      {/* Selected Challenge Launch Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          padding: '18px 22px',
          borderRadius: '18px',
          background:
            'linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.92))',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          boxShadow: '0 16px 38px rgba(2, 6, 23, 0.5)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#38bdf8',
            }}
          >
            Ready for 3D Manoeuvre Assessment
          </span>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
            {selectedChallenge.title} — Driving {selectedVehicle.name}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            Target Bay: {selectedChallenge.parkingTarget.width.toFixed(1)}m ×{' '}
            {selectedChallenge.parkingTarget.length.toFixed(1)}m ·{' '}
            {selectedChallenge.obstacles.length} Active 3D Obstacles
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleLaunch(selectedChallenge.id)}
          className="showcase-btn showcase-btn--primary"
          style={{ cursor: 'pointer', border: 'none' }}
        >
          <Play size={16} aria-hidden="true" />
          <span>
            Launch {selectedChallenge.title} with {selectedVehicle.name}
          </span>
        </button>
      </div>

      {/* Bottom Tip Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '14px 18px',
          borderRadius: '14px',
          background: 'rgba(15, 23, 42, 0.78)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          fontSize: '0.82rem',
          color: '#cbd5e1',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
          <span>
            <strong>Flying Tesla Roadster Support:</strong> All 5 UK parking bays
            support both wheeled vehicles and the hovering{' '}
            <strong>Flying Tesla Roadster</strong> with real-time 4-corner
            footprint containment and OBB collision detection.
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#94a3b8',
            fontSize: '0.76rem',
          }}
        >
          <ShieldAlert size={14} />
          <span>Zero-kerb-strike telemetry active</span>
        </div>
      </div>
    </section>
  );
}
