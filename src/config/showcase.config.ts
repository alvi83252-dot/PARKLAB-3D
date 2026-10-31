import type {
  ChallengeDifficulty,
  UKParkingManoeuvreType,
} from '../types/challenge.types';

export interface GameplayTelemetrySpec {
  targetBayDimensions: string;
  maxOffsetTolerance: string;
  maxAngleTolerance: string;
  cameraRig: string;
  featuredVehicle: string;
  steeringLockAngle: string;
}

export interface GameplayReelSection {
  id: string;
  indexLabel: string;
  codeName: string;
  title: string;
  subtitle: string;
  description: string;
  manoeuvreType?: UKParkingManoeuvreType;
  difficulty: ChallengeDifficulty;
  videoSrc: string;
  webmSrc?: string;
  posterSrc?: string;
  accentColor: string;
  telemetry: GameplayTelemetrySpec;
  highlights: string[];
  /** Trajectory preset used for the interactive telemetry fallback canvas */
  simulationPreset:
    | 'parallel'
    | 'reverse-bay'
    | 'forward-bay'
    | 'pull-up-right'
    | 'telemetry-eval';
}

export const HERO_GAMEPLAY_CONFIG = {
  id: 'hero-showcase',
  eyebrow: 'LENIS SMOOTH SCROLL · REAL-TIME 3D GAMEPLAY ENGINE',
  title: 'MASTER PRECISION PARKING IN 3D',
  subtitle:
    'Experience UK driving test manoeuvres through high-frame-rate WebGL simulation, millimetre-accurate bay telemetry, and realistic vehicle steering geometry.',
  videoSrc: '/assets/videos/hero-loop.mp4',
  webmSrc: '/assets/videos/hero-loop.webm',
  specs: [
    { label: 'MANOEUVRES', value: '05 UK DVSA' },
    { label: 'TELEMETRY', value: '60 HZ LIVE' },
    { label: 'STEERING MODEL', value: 'ACKERMANN + VECTOR' },
    { label: 'FEATURED CHASSIS', value: 'FLYING TESLA ROADSTER' },
  ],
} as const;

export const GAMEPLAY_SHOWCASE_SECTIONS: readonly GameplayReelSection[] = [
  {
    id: 'parallel-park',
    indexLabel: '01',
    codeName: 'MANOEUVRE // PARALLEL_KERB_ENTRY',
    title: 'Parallel Parking',
    subtitle: 'Reverse S-Curve & Kerbside Envelope Control',
    description:
      'Pull alongside the lead reference vehicle, establish your rear-axle pivot point, and execute a controlled reverse S-turn into a two-car-length kerbside bay without touching the pavement.',
    manoeuvreType: 'parallel-park',
    difficulty: 'intermediate',
    videoSrc: '/assets/videos/parallel-park.mp4',
    webmSrc: '/assets/videos/parallel-park.webm',
    accentColor: '#3b82f6',
    telemetry: {
      targetBayDimensions: '6.20m × 2.10m',
      maxOffsetTolerance: '±0.25m from kerb',
      maxAngleTolerance: '±2.5° yaw',
      cameraRig: 'Orbit + Kerb Mirror Split',
      featuredVehicle: 'UK Test Hatchback',
      steeringLockAngle: '36.5° Ackermann',
    },
    highlights: [
      'Live kerb proximity radar and rear-wheel trajectory projection',
      'Reference vehicle alignment markers at 45° reverse entry angle',
      'Instant kerb-contact fault detection matching DVSA criteria',
    ],
    simulationPreset: 'parallel',
  },
  {
    id: 'reverse-bay-park',
    indexLabel: '02',
    codeName: 'MANOEUVRE // REVERSE_BAY_90',
    title: 'Reverse Bay Parking',
    subtitle: '90-Degree Reference Line & Mirror Calibration',
    description:
      'Position your vehicle perpendicular to the car park aisle, lock steering at the exact three-line reference point, and guide the chassis cleanly between painted bay boundaries.',
    manoeuvreType: 'reverse-bay-park',
    difficulty: 'beginner',
    videoSrc: '/assets/videos/reverse-bay.mp4',
    webmSrc: '/assets/videos/reverse-bay.webm',
    accentColor: '#10b981',
    telemetry: {
      targetBayDimensions: '4.80m × 2.40m',
      maxOffsetTolerance: '±0.20m lateral',
      maxAngleTolerance: '±2.0° yaw',
      cameraRig: 'Chase + Top-Down Ortho',
      featuredVehicle: 'Flying Tesla Roadster',
      steeringLockAngle: '33.0° Sport Ratio',
    },
    highlights: [
      'Dynamic turning-circle arc overlay showing front-bumper swing clearance',
      'Four-corner bounding box containment verification inside bay lines',
      'Compare compact hatchback vs. wide-track Tesla Roadster geometry',
    ],
    simulationPreset: 'reverse-bay',
  },
  {
    id: 'forward-bay-park',
    indexLabel: '03',
    codeName: 'MANOEUVRE // FORWARD_BAY_SWING',
    title: 'Forward Bay Parking',
    subtitle: 'Wide Approach Arc & Front-Axle Entry',
    description:
      'Swing wide across the driving lane to compensate for rear-axle tracking, turning smoothly into a standard UK car park bay and straightening before the front stop line.',
    manoeuvreType: 'forward-bay-park',
    difficulty: 'beginner',
    videoSrc: '/assets/videos/forward-bay.mp4',
    webmSrc: '/assets/videos/forward-bay.webm',
    accentColor: '#06b6d4',
    telemetry: {
      targetBayDimensions: '4.80m × 2.40m',
      maxOffsetTolerance: '±0.22m centreline',
      maxAngleTolerance: '±2.0° yaw',
      cameraRig: 'Bonnet + Overhead Drone',
      featuredVehicle: 'UK Test Hatchback',
      steeringLockAngle: '36.5° Ackermann',
    },
    highlights: [
      'Inner rear-wheel tracking path visualization to avoid clipping bay corners',
      'Forward ultrasonic distance bar with progressive braking feedback',
      'Followed by controlled reverse exit back into the main aisle',
    ],
    simulationPreset: 'forward-bay',
  },
  {
    id: 'pull-up-on-right-reverse',
    indexLabel: '04',
    codeName: 'MANOEUVRE // OFFSIDE_REVERSE_2CL',
    title: 'Pull Up on the Right & Reverse',
    subtitle: 'Offside Kerb Alignment & Straight-Line Reverse',
    description:
      'Cross cleanly to the right-hand side of the road, come to a parallel stop within 30cm of the kerb, and reverse in a dead-straight trajectory for two car lengths while maintaining all-round observation.',
    manoeuvreType: 'pull-up-on-right-reverse',
    difficulty: 'intermediate',
    videoSrc: '/assets/videos/pull-up-right.mp4',
    webmSrc: '/assets/videos/pull-up-right.webm',
    accentColor: '#f59e0b',
    telemetry: {
      targetBayDimensions: '9.00m × 2.00m corridor',
      maxOffsetTolerance: '±0.18m kerb drift',
      maxAngleTolerance: '±1.5° yaw',
      cameraRig: 'Offside Wing Mirror + Rear',
      featuredVehicle: 'Compact Saloon',
      steeringLockAngle: 'Micro-Trim ±3.0°',
    },
    highlights: [
      'Real-time lateral drift telemetry across the 2-car-length reverse zone',
      'Offside kerb gap gauge in centimetres for precise parallel stopping',
      'Micro-steering sensitivity training for straight-line reversing',
    ],
    simulationPreset: 'pull-up-right',
  },
  {
    id: 'telemetry-scoring',
    indexLabel: '05',
    codeName: 'SYSTEM // TELEMETRY_ASSESSMENT_HUD',
    title: 'Precision Angle Bay & Live Scoring',
    subtitle: 'Automated DVSA Telemetry & Spatial Evaluation',
    description:
      'Every manoeuvre is graded in real time against UK driving test standards—measuring lateral and longitudinal bay offsets, heading deviation in degrees, standstill duration, and zero-collision compliance.',
    manoeuvreType: 'emergency-or-angle-bay',
    difficulty: 'advanced',
    videoSrc: '/assets/videos/telemetry-scoring.mp4',
    webmSrc: '/assets/videos/telemetry-scoring.webm',
    accentColor: '#8b5cf6',
    telemetry: {
      targetBayDimensions: '5.00m × 2.50m (45° Angle)',
      maxOffsetTolerance: '±0.15m precision',
      maxAngleTolerance: '±1.5° yaw',
      cameraRig: '360° Free Orbit + Telemetry',
      featuredVehicle: 'Flying Tesla Roadster',
      steeringLockAngle: 'Full Telemetry Lock',
    },
    highlights: [
      '0–100 normalized accuracy score with Pass / Minor / Fail breakdown',
      'Spatial snapshot capturing exact X/Z offset and yaw angle upon standstill',
      'Instant replay & retry loop to sharpen muscle memory before test day',
    ],
    simulationPreset: 'telemetry-eval',
  },
];
