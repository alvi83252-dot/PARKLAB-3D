import { useState, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Group } from 'three';
import {
  ArrowLeft,
  Car,
  Flame,
  Gauge,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { APP_ROUTES } from '../../constants/routes';
import { CustomizationStudioPanel } from '../ui/CustomizationStudioPanel';
import { useCustomization } from '../../config/customization.config';
import {
  VEHICLES,
  VehicleModel,
  VehicleSelector,
  createVehiclePartsRefs,
  getChassisSpec,
  getVehicleById,
  type VehicleDefinition,
  type VehicleLightRefs,
} from '../../features/vehicles';

interface ShowroomStageProps {
  vehicle: VehicleDefinition;
  autoRotate: boolean;
  thrusterBoostActive: boolean;
  steerPreview: boolean;
}

function ShowroomVehicleStage({
  vehicle,
  autoRotate,
  thrusterBoostActive,
  steerPreview,
}: ShowroomStageProps) {
  const bodyGroupRef = useRef<Group | null>(null);
  const wheelRefs = useRef(createVehiclePartsRefs());
  const lightRefs = useRef<VehicleLightRefs>({
    brakeLightLeft: null,
    brakeLightRight: null,
    brakeLightBar: null,
    reverseLightLeft: null,
    reverseLightRight: null,
    thrusterGlow: null,
    hoverRingGlow: null,
  });
  const chassis = useMemo(() => getChassisSpec(vehicle), [vehicle]);
  const isFlying = Boolean(chassis.isFlyingVehicle);
  const { themeSpec } = useCustomization();

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const wheels = wheelRefs.current;
    const lights = lightRefs.current;

    if (bodyGroupRef.current) {
      if (isFlying) {
        const bobAmp = thrusterBoostActive ? 0.055 : 0.032;
        bodyGroupRef.current.position.y =
          Math.sin(t * 2.8) * bobAmp + Math.cos(t * 1.4) * 0.01;
        bodyGroupRef.current.rotation.x = thrusterBoostActive
          ? -0.045
          : Math.sin(t * 1.8) * 0.015;
        bodyGroupRef.current.rotation.z = Math.cos(t * 1.5) * 0.02;
      } else {
        bodyGroupRef.current.position.y = 0;
        bodyGroupRef.current.rotation.x = 0;
        bodyGroupRef.current.rotation.z = 0;
      }
    }

    const steerAngle = steerPreview ? Math.sin(t * 1.6) * 0.48 : 0;
    if (wheels.frontLeftSteer) {
      wheels.frontLeftSteer.rotation.y = steerAngle;
    }
    if (wheels.frontRightSteer) {
      wheels.frontRightSteer.rotation.y = steerAngle;
    }

    const spinRate = isFlying
      ? thrusterBoostActive
        ? 26
        : 12
      : thrusterBoostActive
        ? 8
        : 2.2;
    const spinNodes = [
      wheels.frontLeftSpin,
      wheels.frontRightSpin,
      wheels.rearLeftSpin,
      wheels.rearRightSpin,
    ];
    for (const node of spinNodes) {
      if (node) {
        node.rotation.x -= delta * spinRate;
      }
    }

    if (lights.thrusterGlow) {
      lights.thrusterGlow.emissiveIntensity = thrusterBoostActive
        ? 3.8 + Math.sin(t * 24) * 0.5
        : 1.8 + Math.sin(t * 12) * 0.25;
      lights.thrusterGlow.opacity = thrusterBoostActive ? 0.92 : 0.72;
    }

    if (lights.hoverRingGlow) {
      lights.hoverRingGlow.emissiveIntensity = thrusterBoostActive
        ? 2.8 + Math.sin(t * 14) * 0.35
        : 1.55 + Math.sin(t * 7) * 0.2;
      lights.hoverRingGlow.opacity = thrusterBoostActive ? 0.65 : 0.45;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.75} />
      <hemisphereLight
        args={[themeSpec.hemiSkyColor, themeSpec.hemiGroundColor, 0.7]}
        position={[0, 15, 0]}
      />
      <directionalLight
        position={[8, 12, 9]}
        intensity={1.7}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[-8, 6, -7]}
        intensity={0.65}
        color={themeSpec.buildingAccentColor}
      />
      <pointLight
        position={[0, 2.8, -3.5]}
        intensity={isFlying ? 1.4 : 0.6}
        color={isFlying ? '#38bdf8' : '#f8fafc'}
      />

      {/* Showroom Turntable Platform (Adapts to active 3D Environment Theme) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <circleGeometry args={[3.8, 64]} />
        <meshStandardMaterial
          color={themeSpec.asphaltColor}
          roughness={themeSpec.surfaceRoughness}
          metalness={themeSpec.surfaceMetalness}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <ringGeometry args={[3.45, 3.55, 64]} />
        <meshBasicMaterial
          color={
            themeSpec.id === 'uk-test-centre'
              ? isFlying
                ? '#38bdf8'
                : vehicle.bodyColor
              : themeSpec.buildingAccentColor
          }
          transparent
          opacity={0.75}
        />
      </mesh>
      <gridHelper
        args={[16, 16, themeSpec.kerbColor, themeSpec.apronColor]}
        position={[0, -0.008, 0]}
      />

      {/* 3D Vehicle Model */}
      <group ref={bodyGroupRef}>
        <VehicleModel
          vehicle={vehicle}
          wheelRefs={wheelRefs}
          lightRefs={lightRefs}
        />
      </group>

      <OrbitControls
        enablePan={false}
        minDistance={3.4}
        maxDistance={9.5}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2 - 0.06}
        autoRotate={autoRotate}
        autoRotateSpeed={1.6}
        target={[0, 0.75, 0]}
      />
    </group>
  );
}

export function VehicleSelection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('vehicle') || 'tesla-roadster';

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(initialId);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [thrusterBoostActive, setThrusterBoostActive] = useState<boolean>(false);
  const [steerPreview, setSteerPreview] = useState<boolean>(false);

  const selectedVehicle = useMemo(
    () => getVehicleById(selectedVehicleId),
    [selectedVehicleId]
  );
  const chassis = useMemo(
    () => getChassisSpec(selectedVehicle),
    [selectedVehicle]
  );
  const isFlyingRoadster = Boolean(chassis.isFlyingVehicle);

  const handleLaunchSimulation = () => {
    navigate(`${APP_ROUTES.SIMULATION}?vehicle=${selectedVehicle.id}`);
  };

  return (
    <section
      aria-labelledby="vehicle-screen-title"
      style={{
        width: 'min(1260px, 100%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          padding: '18px 22px',
          borderRadius: '18px',
          background: 'rgba(15, 23, 42, 0.82)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          backdropFilter: 'blur(14px)',
        }}
      >
        <div>
          <div className="placeholder-card__eyebrow" style={{ marginBottom: '6px' }}>
            <Car size={14} aria-hidden="true" />
            <span>3D Fleet Hangar &amp; Creative Workshop</span>
          </div>
          <h1
            id="vehicle-screen-title"
            style={{
              margin: 0,
              fontSize: 'clamp(1.35rem, 2.4vw, 1.85rem)',
              fontWeight: 800,
              color: '#f8fafc',
              letterSpacing: '-0.02em',
            }}
          >
            Select &amp; Customize Your 3D Car and World
          </h1>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          <Link to={APP_ROUTES.HOME} className="btn-secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Overview</span>
          </Link>
          <button
            type="button"
            onClick={handleLaunchSimulation}
            className="showcase-btn showcase-btn--primary"
            style={{ cursor: 'pointer', border: 'none' }}
          >
            <Play size={16} aria-hidden="true" />
            <span>Park {selectedVehicle.name} in 3D</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Hangar Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
          alignItems: 'stretch',
        }}
      >
        {/* Left: Interactive 3D Turntable Canvas */}
        <div
          style={{
            position: 'relative',
            minHeight: '460px',
            borderRadius: '20px',
            overflow: 'hidden',
            background:
              'radial-gradient(circle at 50% 35%, rgba(30, 41, 59, 0.95), rgba(9, 13, 22, 0.98))',
            border: '1px solid rgba(56, 189, 248, 0.24)',
            boxShadow: '0 24px 60px rgba(2, 6, 23, 0.65)',
          }}
        >
          <Canvas
            shadows
            camera={{ position: [4.2, 2.3, 4.6], fov: 42 }}
            style={{ width: '100%', height: '100%', minHeight: '460px' }}
          >
            <ShowroomVehicleStage
              vehicle={selectedVehicle}
              autoRotate={autoRotate}
              thrusterBoostActive={thrusterBoostActive}
              steerPreview={steerPreview}
            />
          </Canvas>

          {/* Top-Left Live 3D Badge */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(9, 13, 22, 0.78)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              backdropFilter: 'blur(10px)',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: isFlyingRoadster ? '#38bdf8' : '#94a3b8',
              }}
            >
              <Sparkles size={13} />
              <span>
                {isFlyingRoadster
                  ? 'Anti-Gravity Flight Chassis Active (0.28m Hover)'
                  : 'Standard Ground Contact Chassis'}
              </span>
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
              {selectedVehicle.name}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
              Drag to orbit 360° • Scroll to zoom • Live skin &amp; topper preview
            </div>
          </div>

          {/* Bottom Interactive Showroom Controls */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              right: '16px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setAutoRotate((v) => !v)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: autoRotate
                    ? 'rgba(56, 189, 248, 0.2)'
                    : 'rgba(15, 23, 42, 0.85)',
                  color: autoRotate ? '#38bdf8' : '#cbd5e1',
                  border: `1px solid ${
                    autoRotate
                      ? 'rgba(56, 189, 248, 0.5)'
                      : 'rgba(148, 163, 184, 0.25)'
                  }`,
                }}
              >
                <RotateCcw size={13} />
                <span>{autoRotate ? 'Turntable: ON' : 'Turntable: OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSteerPreview((v) => !v)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: steerPreview
                    ? 'rgba(56, 189, 248, 0.2)'
                    : 'rgba(15, 23, 42, 0.85)',
                  color: steerPreview ? '#38bdf8' : '#cbd5e1',
                  border: `1px solid ${
                    steerPreview
                      ? 'rgba(56, 189, 248, 0.5)'
                      : 'rgba(148, 163, 184, 0.25)'
                  }`,
                }}
              >
                <Gauge size={13} />
                <span>
                  {isFlyingRoadster ? 'Vector Pod Sweep' : 'Front Steering Sweep'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setThrusterBoostActive((v) => !v)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: thrusterBoostActive
                    ? 'rgba(225, 29, 72, 0.28)'
                    : 'rgba(15, 23, 42, 0.85)',
                  color: thrusterBoostActive ? '#fda4af' : '#cbd5e1',
                  border: `1px solid ${
                    thrusterBoostActive
                      ? 'rgba(244, 63, 94, 0.6)'
                      : 'rgba(148, 163, 184, 0.25)'
                  }`,
                }}
              >
                <Flame size={13} />
                <span>
                  {isFlyingRoadster
                    ? thrusterBoostActive
                      ? 'SpaceX Thrusters: MAX'
                      : 'Test SpaceX Thrusters'
                    : thrusterBoostActive
                      ? 'Wheel Dyno: HIGH'
                      : 'Test Wheel Dyno'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Vehicle Selector & Engineering Specs */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            justifyContent: 'space-between',
          }}
        >
          <VehicleSelector
            vehicles={VEHICLES}
            selectedVehicleId={selectedVehicle.id}
            onSelectVehicle={setSelectedVehicleId}
          />

          {/* Detailed Engineering & Parking Telemetry Card */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.86)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#38bdf8',
              }}
            >
              3D Chassis &amp; Propulsion Profile
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '0.86rem',
                lineHeight: 1.55,
                color: '#cbd5e1',
              }}
            >
              {chassis.tagline}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                marginTop: '4px',
              }}
            >
              <div
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(30, 41, 59, 0.55)',
                  border: '1px solid rgba(148, 163, 184, 0.14)',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  WHEELBASE
                </div>
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                  }}
                >
                  {chassis.wheelbase.toFixed(2)}m
                </div>
              </div>
              <div
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(30, 41, 59, 0.55)',
                  border: '1px solid rgba(148, 163, 184, 0.14)',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  MAX STEER LOCK
                </div>
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                  }}
                >
                  {Math.round((chassis.maxSteeringAngleRad * 180) / Math.PI)}°
                </div>
              </div>
              <div
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(30, 41, 59, 0.55)',
                  border: '1px solid rgba(148, 163, 184, 0.14)',
                }}
              >
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  PROPULSION MODE
                </div>
                <div
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: isFlyingRoadster ? '#38bdf8' : '#10b981',
                    fontFamily: 'monospace',
                  }}
                >
                  {isFlyingRoadster ? 'HOVER + THRUSTER' : '4-WHEEL TARMAC'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Creative 3D Car & World Customization Workshop */}
      <CustomizationStudioPanel />
    </section>
  );
}
