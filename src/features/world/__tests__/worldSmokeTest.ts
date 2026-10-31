import { DrivingCamera } from '../components/DrivingCamera';
import { ParkingEnvironment } from '../components/ParkingEnvironment';
import {
  DECORATIVE_PARKED_VEHICLES,
  STREETLIGHTS,
  SURROUNDING_BUILDINGS,
  TRAFFIC_SIGNS,
  TREE_PLANTERS,
  WORLD_BOUNDS,
} from '../constants/worldLayout';
import {
  computeCameraRigTarget,
  normalizeCameraMode,
  sanitizeNumber,
  sanitizeVec3,
  shortestAngleDelta,
} from '../utils/worldFallbacks';

export interface SmokeTestCheckResult {
  name: string;
  passed: boolean;
  details: string;
}

export interface WorldSmokeTestReport {
  allPassed: boolean;
  totalChecks: number;
  passedChecks: number;
  results: SmokeTestCheckResult[];
}

function approxEqual(a: number, b: number, epsilon = 1e-4): boolean {
  return Math.abs(a - b) <= epsilon;
}

/**
 * Executes a deterministic suite of architectural, mathematical, and fallback
 * smoke checks on Faizan's 3D World & Environment module.
 */
export function runWorldModuleSmokeTests(): WorldSmokeTestReport {
  const results: SmokeTestCheckResult[] = [];

  const record = (name: string, passed: boolean, details: string) => {
    results.push({ name, passed, details });
  };

  // 1. Required exports check (Section 4.5)
  record(
    'Export: ParkingEnvironment component',
    typeof ParkingEnvironment === 'function',
    `typeof ParkingEnvironment = ${typeof ParkingEnvironment}`
  );

  record(
    'Export: DrivingCamera component',
    typeof DrivingCamera === 'function',
    `typeof DrivingCamera = ${typeof DrivingCamera}`
  );

  // 2. Follow camera coordinate convention check at rotationY = 0 (local -Z forward)
  const poseZero = computeCameraRigTarget([0, 0, 0], 0, 'follow', {
    followDistance: 9.2,
    followHeight: 4.1,
    lookAheadDistance: 3.2,
  });
  const zeroPoseOk =
    approxEqual(poseZero.cameraPosition[0], 0) &&
    approxEqual(poseZero.cameraPosition[1], 4.1) &&
    approxEqual(poseZero.cameraPosition[2], 9.2) &&
    approxEqual(poseZero.lookAtTarget[0], 0) &&
    approxEqual(poseZero.lookAtTarget[2], -3.2);
  record(
    'Camera Math: Follow mode at rotationY = 0 (-Z forward convention)',
    zeroPoseOk,
    `camera=${JSON.stringify(poseZero.cameraPosition)}, lookAt=${JSON.stringify(
      poseZero.lookAtTarget
    )}`
  );

  // 3. Follow camera coordinate convention at rotationY = PI / 2 (facing -X)
  const poseQuarter = computeCameraRigTarget(
    [10, 0, -5],
    Math.PI / 2,
    'follow',
    {
      followDistance: 9.2,
      followHeight: 4.1,
      lookAheadDistance: 3.2,
    }
  );
  const quarterPoseOk =
    approxEqual(poseQuarter.cameraPosition[0], 19.2) &&
    approxEqual(poseQuarter.cameraPosition[1], 4.1) &&
    approxEqual(poseQuarter.cameraPosition[2], -5) &&
    approxEqual(poseQuarter.lookAtTarget[0], 6.8) &&
    approxEqual(poseQuarter.lookAtTarget[2], -5);
  record(
    'Camera Math: Follow mode at rotationY = PI/2 (-X heading)',
    quarterPoseOk,
    `camera=${JSON.stringify(
      poseQuarter.cameraPosition
    )}, lookAt=${JSON.stringify(poseQuarter.lookAtTarget)}`
  );

  // 4. Overhead camera mode check
  const poseOverhead = computeCameraRigTarget([4, 0, -8], 0, 'overhead', {
    overheadHeight: 26,
  });
  const overheadOk =
    approxEqual(poseOverhead.cameraPosition[0], 4, 0.05) &&
    approxEqual(poseOverhead.cameraPosition[1], 26) &&
    approxEqual(poseOverhead.cameraPosition[2], -8, 0.05) &&
    approxEqual(poseOverhead.lookAtTarget[0], 4) &&
    approxEqual(poseOverhead.lookAtTarget[2], -8);
  record(
    'Camera Math: Overhead mode positioning',
    overheadOk,
    `camera=${JSON.stringify(poseOverhead.cameraPosition)}`
  );

  // 5. Fallback resilience against NaN, Infinity, undefined, and unknown modes
  const corruptedPose = computeCameraRigTarget(
    [Number.NaN, Number.POSITIVE_INFINITY, undefined] as unknown,
    Number.NaN,
    'invalid-mode' as unknown
  );
  const fallbackOk =
    corruptedPose.cameraPosition.every((n) => Number.isFinite(n)) &&
    corruptedPose.lookAtTarget.every((n) => Number.isFinite(n)) &&
    normalizeCameraMode('top-down') === 'overhead' &&
    normalizeCameraMode('third-person') === 'follow' &&
    normalizeCameraMode(undefined) === 'follow' &&
    sanitizeNumber(Number.NaN, 5) === 5 &&
    sanitizeVec3(null, [1, 2, 3])[2] === 3;
  record(
    'Fallback Resilience: Sanitizes NaN/Infinity/invalid camera inputs',
    fallbackOk,
    `corruptedFallbackCamera=${JSON.stringify(corruptedPose.cameraPosition)}`
  );

  // 6. Shortest angle wrap across +/-PI boundary
  const wrapDelta = shortestAngleDelta(Math.PI - 0.1, -Math.PI + 0.1);
  record(
    'Camera Smoothing: Shortest angle interpolation across +/-PI',
    approxEqual(wrapDelta, 0.2, 1e-3),
    `delta=${wrapDelta.toFixed(4)} rad (expected +0.2000 rad)`
  );

  // 7. Decorative Tesla Roadster presence check (Section 1.3 & 4.3)
  const roadsters = DECORATIVE_PARKED_VEHICLES.filter(
    (v) => v.kind === 'tesla-roadster'
  );
  record(
    'Environment: Stationary parked vehicles include New Tesla Roadster',
    DECORATIVE_PARKED_VEHICLES.length >= 6 && roadsters.length >= 1,
    `totalParked=${DECORATIVE_PARKED_VEHICLES.length}, roadsters=${roadsters.length}`
  );

  // 8. Active manoeuvring zone clearance check (keeps central [-30, 30] clear for Anjila's challenges)
  const arenaLimit = WORLD_BOUNDS.activeArenaHalfExtent;
  const allOutsideActiveZone = [
    ...DECORATIVE_PARKED_VEHICLES.map((v) => v.position),
    ...SURROUNDING_BUILDINGS.map((b) => b.position),
    ...STREETLIGHTS.map((l) => l.position),
    ...TRAFFIC_SIGNS.map((s) => s.position),
    ...TREE_PLANTERS.map((t) => t.position),
  ].every(
    ([x, y, z]) =>
      y === 0 && (Math.abs(x) >= arenaLimit || Math.abs(z) >= arenaLimit)
  );
  record(
    'Environment: Central challenge arena [-30m, 30m] unobstructed & Y=0 grounded',
    allOutsideActiveZone,
    `checked ${
      DECORATIVE_PARKED_VEHICLES.length +
      SURROUNDING_BUILDINGS.length +
      STREETLIGHTS.length +
      TRAFFIC_SIGNS.length +
      TREE_PLANTERS.length
    } static world objects`
  );

  const passedChecks = results.filter((r) => r.passed).length;
  return {
    allPassed: passedChecks === results.length,
    totalChecks: results.length,
    passedChecks,
    results,
  };
}

// Auto-execute report when run via CLI in Node (no window object)
if (typeof window === 'undefined') {
  const report = runWorldModuleSmokeTests();
  console.log(
    `[PARKLAB 3D — World Smoke Test] ${report.passedChecks}/${report.totalChecks} checks passed.`
  );
  for (const check of report.results) {
    console.log(
      `  ${check.passed ? 'PASS' : 'FAIL'} | ${check.name} -> ${check.details}`
    );
  }
}

