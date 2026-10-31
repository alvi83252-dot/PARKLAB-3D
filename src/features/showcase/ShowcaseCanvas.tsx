/**
 * PARKLAB 3D — Real-Time 3D Automotive Studio Showcase Canvas
 * Renders the dark studio environment, dramatic automotive rim/softbox lighting,
 * specular floor plinth, and scroll-synchronized 3D vehicle choreography.
 */

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VehicleDefinition } from '../vehicles/types';
import { getChassisSpec } from '../vehicles/vehicles';
import { StudioReflectionEnv } from '../vehicles/StudioReflectionEnv';
import {
  VehicleModel,
  type VehicleLightRefs,
  type VehicleWheelRefs,
} from '../vehicles/VehicleModels';
import type { LenisScrollState } from '../../hooks/useLenisScroll';

export interface ShowcaseCanvasProps {
  vehicle: VehicleDefinition;
  scrollStateRef: React.MutableRefObject<LenisScrollState>;
  interactiveOrbitYaw?: number;
}

interface StudioStageProps {
  vehicle: VehicleDefinition;
  scrollStateRef: React.MutableRefObject<LenisScrollState>;
  interactiveOrbitYaw: number;
}

function StudioStage({
  vehicle,
  scrollStateRef,
  interactiveOrbitYaw,
}: StudioStageProps) {
  const turntableRef = useRef<THREE.Group | null>(null);
  const carTiltRef = useRef<THREE.Group | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.SpotLight | null>(null);
  const accentLightRef = useRef<THREE.PointLight | null>(null);
  const softboxMeshRef = useRef<THREE.Mesh | null>(null);

  const wheelRefs = useRef<VehicleWheelRefs>({
    frontLeftSteer: null,
    frontRightSteer: null,
    frontLeftSpin: null,
    frontRightSpin: null,
    rearLeftSpin: null,
    rearRightSpin: null,
  });

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

  const accentThreeColor = useMemo(
    () => new THREE.Color(chassis.accentColor || '#ef4444'),
    [chassis.accentColor]
  );

  // Target camera state vectors to avoid allocations inside useFrame
  const targetCamPos = useMemo(() => new THREE.Vector3(3.4, 1.35, 4.8), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(-0.6, 0.55, 0), []);
  const currentLookAt = useMemo(() => new THREE.Vector3(-0.6, 0.55, 0), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const elapsed = state.clock.getElapsedTime();
    const scroll = scrollStateRef.current;
    const p = scroll.progress; // 0..1 across entire landing page
    const heroP = scroll.heroProgress; // 0..1 across hero section
    const showcaseP = scroll.showcaseProgress; // 0..1 across showcase section

    const isWideViewport = state.size.width > 960;

    // Determine camera composition & vehicle rotation based on scroll progression
    // Phase A: Hero (heroP: 0 -> 1) — Dramatic 3/4 Front-Left Hero Stance (Screenshot 1)
    // Phase B: Showcase (showcaseP: 0 -> 1) — Side Profile Silhouette (Screenshot 1.02 & Screenshot 3) -> Rear 3/4
    // Phase C: Manoeuvres & Launch (p > 0.72) — Low poised launch stance

    let desiredYaw = 0.62; // Classic 3/4 front-left automotive angle
    let desiredSteer = -0.26; // Front wheels turned slightly toward camera like a studio shoot
    let camX = isWideViewport ? 2.65 : 2.9;
    let camY = 1.18;
    let camZ = isWideViewport ? 4.45 : 5.4;
    let lookX = isWideViewport ? -0.78 : 0;
    let lookY = 0.54;
    let lookZ = 0;

    if (heroP < 1 && showcaseP <= 0.01) {
      // Hero section transitions into Showcase entry
      const t = THREE.MathUtils.smoothstep(heroP, 0, 1);
      desiredYaw = THREE.MathUtils.lerp(0.58, Math.PI * 0.5, t);
      desiredSteer = THREE.MathUtils.lerp(-0.28, -0.12, t);
      camX = THREE.MathUtils.lerp(
        isWideViewport ? 2.55 : 2.8,
        isWideViewport ? 0.15 : 0.2,
        t
      );
      camY = THREE.MathUtils.lerp(1.14, 1.02, t);
      camZ = THREE.MathUtils.lerp(
        isWideViewport ? 4.35 : 5.3,
        isWideViewport ? 5.15 : 6.1,
        t
      );
      lookX = THREE.MathUtils.lerp(isWideViewport ? -0.82 : 0, 0, t);
      lookY = THREE.MathUtils.lerp(0.52, 0.58, t);
    } else if (p < 0.72) {
      // Inside the Interactive 3D Vehicle Showcase (Section 02)
      // Rotate smoothly from pure side-profile (Car CraftTaycan view) through 360° studio angles
      const s = THREE.MathUtils.clamp(showcaseP, 0, 1);
      desiredYaw = Math.PI * 0.5 + s * Math.PI * 1.35;
      desiredSteer = Math.sin(s * Math.PI * 2) * 0.24;
      camX = Math.sin(s * Math.PI) * (isWideViewport ? 1.45 : 0.9);
      camY = 1.02 + Math.sin(s * Math.PI * 2) * 0.18;
      camZ = THREE.MathUtils.lerp(
        isWideViewport ? 5.1 : 6.0,
        isWideViewport ? 4.6 : 5.6,
        s
      );
      lookX = isWideViewport
        ? THREE.MathUtils.lerp(0, -0.35, Math.sin(s * Math.PI))
        : 0;
      lookY = 0.55;
    } else {
      // Section 03 (Manoeuvres) & Section 04 (Final Launch CTA)
      const endT = THREE.MathUtils.smoothstep(p, 0.72, 0.98);
      desiredYaw = THREE.MathUtils.lerp(
        Math.PI * 1.85,
        Math.PI * 2 + 0.42,
        endT
      );
      desiredSteer = THREE.MathUtils.lerp(0.15, -0.22, endT);
      camX = THREE.MathUtils.lerp(1.2, isWideViewport ? 2.4 : 2.6, endT);
      camY = THREE.MathUtils.lerp(1.38, 1.05, endT);
      camZ = THREE.MathUtils.lerp(5.4, isWideViewport ? 4.2 : 5.1, endT);
      lookX = THREE.MathUtils.lerp(0, isWideViewport ? -0.45 : 0, endT);
      lookY = THREE.MathUtils.lerp(0.5, 0.48, endT);
    }

    // Add subtle idle studio breathing + user interactive drag yaw
    const idleYaw = Math.sin(elapsed * 0.45) * 0.045;
    const totalTargetYaw = desiredYaw + idleYaw + interactiveOrbitYaw;

    if (turntableRef.current) {
      turntableRef.current.rotation.y = THREE.MathUtils.damp(
        turntableRef.current.rotation.y,
        totalTargetYaw,
        5.5,
        dt
      );
    }

    // Subtle pitch/roll reaction to scroll velocity
    if (carTiltRef.current) {
      const velClamped = THREE.MathUtils.clamp(scroll.velocity * 0.0015, -0.04, 0.04);
      carTiltRef.current.rotation.x = THREE.MathUtils.damp(
        carTiltRef.current.rotation.x,
        velClamped,
        6,
        dt
      );
    }

    // Steer front wheels smoothly & spin wheels gently with scroll velocity
    const wheels = wheelRefs.current;
    if (wheels.frontLeftSteer && wheels.frontRightSteer) {
      const nextSteer = THREE.MathUtils.damp(
        wheels.frontLeftSteer.rotation.y,
        desiredSteer,
        6,
        dt
      );
      wheels.frontLeftSteer.rotation.y = nextSteer;
      wheels.frontRightSteer.rotation.y = nextSteer;
    }

    const spinStep = dt * 0.55 + scroll.velocity * 0.004;
    if (wheels.frontLeftSpin) wheels.frontLeftSpin.rotation.x -= spinStep;
    if (wheels.frontRightSpin) wheels.frontRightSpin.rotation.x -= spinStep;
    if (wheels.rearLeftSpin) wheels.rearLeftSpin.rotation.x -= spinStep;
    if (wheels.rearRightSpin) wheels.rearRightSpin.rotation.x -= spinStep;

    // Smoothly interpolate camera position and lookAt target
    targetCamPos.set(
      camX + Math.cos(elapsed * 0.35) * 0.06,
      camY + Math.sin(elapsed * 0.5) * 0.03,
      camZ
    );
    targetLookAt.set(lookX, lookY, lookZ);

    state.camera.position.lerp(targetCamPos, 1 - Math.exp(-5.0 * dt));
    currentLookAt.lerp(targetLookAt, 1 - Math.exp(-6.0 * dt));
    state.camera.lookAt(currentLookAt);

    // Evolve studio accent lighting color smoothly toward active vehicle's accent color
    if (accentLightRef.current) {
      accentLightRef.current.color.lerp(accentThreeColor, 1 - Math.exp(-4 * dt));
    }
  });

  return (
    <group name="automotive-studio-stage">
      {/* Studio Ambient & Hemisphere Fill */}
      <ambientLight intensity={0.42} color="#cbd5e1" />
      <hemisphereLight
        color="#e2e8f0"
        groundColor="#05070d"
        intensity={0.75}
      />

      {/* Primary Overhead Softbox Key Light */}
      <directionalLight
        ref={keyLightRef}
        position={[4.5, 7.5, 4.0]}
        intensity={2.6}
        color="#f8fafc"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0005}
      />

      {/* Cool Sculpting Rim Light (Back-Left) */}
      <spotLight
        ref={rimLightRef}
        position={[-5.5, 4.2, -4.5]}
        angle={0.65}
        penumbra={0.85}
        intensity={3.4}
        color="#e0f2fe"
      />

      {/* Low Front Fill Strip for Grill, Splitter & Alloy Rim Detail */}
      <spotLight
        position={[3.2, 0.85, 5.5]}
        angle={0.7}
        penumbra={0.9}
        intensity={1.65}
        color="#f1f5f9"
      />

      {/* Dynamic Vehicle-Accent Studio Side Glow */}
      <pointLight
        ref={accentLightRef}
        position={[-3.6, 1.8, 2.2]}
        intensity={2.4}
        distance={12}
        color={chassis.accentColor}
      />

      {/* Overhead Studio Softbox Light Panel (Visual + Specular Reflection Source) */}
      <mesh
        ref={softboxMeshRef}
        position={[0, 4.6, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[7.5, 2.6]} />
        <meshBasicMaterial color="#f8fafc" transparent opacity={0.12} />
      </mesh>

      {/* Dark Specular Studio Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.005, 0]}
        receiveShadow
      >
        <circleGeometry args={[26, 64]} />
        <meshStandardMaterial
          color="#07090f"
          roughness={0.26}
          metalness={0.72}
        />
      </mesh>

      {/* Subtle Brushed Turntable Plinth Disc & Telemetry Rings */}
      <group position={[0, 0.001, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[2.95, 64]} />
          <meshStandardMaterial
            color="#0b0e17"
            roughness={0.32}
            metalness={0.65}
          />
        </mesh>

        {/* Outer Precision Turntable Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <ringGeometry args={[2.94, 2.97, 96]} />
          <meshBasicMaterial
            color={chassis.accentColor}
            transparent
            opacity={0.42}
          />
        </mesh>

        {/* Inner Measurement Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
          <ringGeometry args={[2.15, 2.165, 96]} />
          <meshBasicMaterial color="#475569" transparent opacity={0.28} />
        </mesh>
      </group>

      {/* Rotating Vehicle Turntable */}
      <group ref={turntableRef} position={[0, 0, 0]}>
        <group ref={carTiltRef}>
          <VehicleModel
            vehicle={vehicle}
            wheelRefs={wheelRefs}
            lightRefs={lightRefs}
          />
        </group>
      </group>
    </group>
  );
}

export function ShowcaseCanvas({
  vehicle,
  scrollStateRef,
  interactiveOrbitYaw = 0,
}: ShowcaseCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      camera={{
        position: [2.65, 1.18, 4.45],
        fov: 36,
        near: 0.1,
        far: 60,
      }}
    >
      <color attach="background" args={['#05060a']} />
      <fog attach="fog" args={['#05060a', 9.5, 24]} />
      <StudioReflectionEnv />
      <StudioStage
        vehicle={vehicle}
        scrollStateRef={scrollStateRef}
        interactiveOrbitYaw={interactiveOrbitYaw}
      />
    </Canvas>
  );
}
