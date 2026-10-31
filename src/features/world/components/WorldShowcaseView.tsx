import { useMemo, useState } from 'react';
import { Camera, CheckCircle2, Compass, Eye, RotateCcw } from 'lucide-react';
import type { Vec3 } from '../../../types/vehicle.types';
import type { CameraMode } from '../world.types';
import { runWorldModuleSmokeTests } from '../__tests__/worldSmokeTest';
import { WorldPreviewCanvas } from './WorldPreviewCanvas';

interface CameraPreset {
  id: string;
  label: string;
  position: Vec3;
  rotationY: number;
}

const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'arena-center',
    label: 'Central Driving Arena',
    position: [0, 0, 12],
    rotationY: 0,
  },
  {
    id: 'tesla-roadster-bay',
    label: 'Tesla Roadster EV Bay',
    position: [-29.5, 0, -14.0],
    rotationY: Math.PI / 2,
  },
  {
    id: 'north-test-centre',
    label: 'DVSA Test Centre Approach',
    position: [0, 0, -20.0],
    rotationY: 0,
  },
  {
    id: 'south-angled-bays',
    label: 'South Angled Bays',
    position: [-6.0, 0, 26.0],
    rotationY: Math.PI,
  },
];

/**
 * Interactive 3D World preview & camera test harness for Faizan's module.
 * Allows testing both DrivingCamera modes ('follow' and 'overhead') and inspecting
 * the 3D parking environment before vehicle/challenge branches are merged.
 */
export function WorldShowcaseView() {
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [activePresetId, setActivePresetId] = useState<string>('arena-center');
  const [headingOffsetDeg, setHeadingOffsetDeg] = useState<number>(0);

  const smokeReport = useMemo(() => runWorldModuleSmokeTests(), []);

  const activePreset =
    CAMERA_PRESETS.find((p) => p.id === activePresetId) ?? CAMERA_PRESETS[0];

  const effectiveRotationY =
    activePreset.rotationY + (headingOffsetDeg * Math.PI) / 180;

  return (
    <section
      aria-label="PARKLAB 3D Environment & Camera Preview"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: '100%',
      }}
    >
      {/* Top Telemetry & Camera Control Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.875rem 1.25rem',
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="placeholder-card__eyebrow">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>
              World Module Ready ({smokeReport.passedChecks}/
              {smokeReport.totalChecks} Checks)
            </span>
          </span>
          <span
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            3D Parking Environment &amp; Dual-Mode Camera System
          </span>
        </div>

        {/* Camera Mode Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setCameraMode('follow')}
            className="btn-secondary"
            style={{
              borderColor:
                cameraMode === 'follow'
                  ? 'var(--color-accent-primary)'
                  : undefined,
              backgroundColor:
                cameraMode === 'follow'
                  ? 'var(--color-accent-subtle)'
                  : undefined,
              cursor: 'pointer',
            }}
          >
            <Camera size={15} aria-hidden="true" />
            <span>Third-Person Follow</span>
          </button>

          <button
            type="button"
            onClick={() => setCameraMode('overhead')}
            className="btn-secondary"
            style={{
              borderColor:
                cameraMode === 'overhead'
                  ? 'var(--color-accent-primary)'
                  : undefined,
              backgroundColor:
                cameraMode === 'overhead'
                  ? 'var(--color-accent-subtle)'
                  : undefined,
              cursor: 'pointer',
            }}
          >
            <Eye size={15} aria-hidden="true" />
            <span>Overhead View</span>
          </button>
        </div>
      </div>

      {/* 3D Viewport Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '62vh',
          minHeight: '460px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--color-border-strong)',
          boxShadow: 'var(--shadow-card)',
          backgroundColor: '#0b0d10',
        }}
      >
        <WorldPreviewCanvas
          targetPosition={activePreset.position}
          targetRotationY={effectiveRotationY}
          cameraMode={cameraMode}
        >
          {/* Reference Target Marker at the active camera focus point */}
          <group
            position={activePreset.position}
            rotation={[0, effectiveRotationY, 0]}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
              <ringGeometry args={[1.1, 1.35, 32]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            {/* Forward (-Z) heading indicator arrow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, -1.8]}>
              <coneGeometry args={[0.35, 0.8, 3]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
          </group>
        </WorldPreviewCanvas>
      </div>

      {/* Camera Target & Heading Inspection Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.875rem 1.25rem',
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-muted)',
              marginRight: '0.25rem',
            }}
          >
            <Compass size={14} aria-hidden="true" />
            VIEWPOINT:
          </span>
          {CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setActivePresetId(preset.id);
                setHeadingOffsetDeg(0);
              }}
              className="btn-secondary"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: 'var(--text-xs)',
                borderColor:
                  activePresetId === preset.id
                    ? 'var(--color-accent-primary)'
                    : undefined,
                cursor: 'pointer',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label
            htmlFor="camera-heading-slider"
            style={{
              fontSize: 'var(--text-xs)',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Orbit Heading: {headingOffsetDeg}°
          </label>
          <input
            id="camera-heading-slider"
            type="range"
            min={-180}
            max={180}
            step={5}
            value={headingOffsetDeg}
            onChange={(e) => setHeadingOffsetDeg(Number(e.target.value))}
            style={{ accentColor: 'var(--color-accent-primary)' }}
          />
          <button
            type="button"
            onClick={() => setHeadingOffsetDeg(0)}
            className="btn-secondary"
            style={{
              padding: '0.3rem 0.6rem',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
            }}
            title="Reset heading"
          >
            <RotateCcw size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
