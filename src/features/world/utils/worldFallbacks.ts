import type { Vec3 } from '../../../types/vehicle.types';
import type { CameraMode, CanonicalCameraMode } from '../world.types';

const MAX_SAFE_COORDINATE = 500;
const TWO_PI = Math.PI * 2;

/**
 * Safely coerces an unknown numeric input into a finite number,
 * returning the provided fallback if NaN, Infinity, or non-numeric.
 */
export function sanitizeNumber(
  value: unknown,
  fallback: number,
  min = -MAX_SAFE_COORDINATE,
  max = MAX_SAFE_COORDINATE
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

/**
 * Safely validates and clamps a 3D coordinate tuple [x, y, z].
 * Protects cameras and scene transforms if upstream physics state contains NaN/undefined.
 */
export function sanitizeVec3(
  value: unknown,
  fallback: Vec3 = [0, 0, 0]
): Vec3 {
  if (!Array.isArray(value) || value.length < 3) {
    return [fallback[0], fallback[1], fallback[2]];
  }

  return [
    sanitizeNumber(value[0], fallback[0]),
    sanitizeNumber(value[1], fallback[1]),
    sanitizeNumber(value[2], fallback[2]),
  ];
}

/**
 * Normalizes camera mode strings into 'follow' or 'overhead'.
 * Defaults safely to 'follow' if an unexpected value is supplied.
 */
export function normalizeCameraMode(mode: unknown): CanonicalCameraMode {
  if (mode === 'overhead' || mode === 'top-down') {
    return 'overhead';
  }
  return 'follow';
}

/**
 * Computes the shortest signed angular difference in [-PI, PI]
 * so camera rotation interpolation never spins 360 degrees across the +/-PI wrap boundary.
 */
export function shortestAngleDelta(fromRad: number, toRad: number): number {
  const safeFrom = sanitizeNumber(fromRad, 0, -1e6, 1e6);
  const safeTo = sanitizeNumber(toRad, 0, -1e6, 1e6);
  const diff = ((safeTo - safeFrom + Math.PI) % TWO_PI) - Math.PI;
  return diff < -Math.PI ? diff + TWO_PI : diff;
}

export interface CameraRigPose {
  cameraPosition: Vec3;
  lookAtTarget: Vec3;
  upVector: Vec3;
}

export interface CameraRigConfig {
  followDistance?: number;
  followHeight?: number;
  lookAheadDistance?: number;
  overheadHeight?: number;
}

/**
 * Computes the target camera position and look-at point following Part 3.1 conventions:
 * - Y is vertical axis, X and Z form the ground plane.
 * - Vehicle forward is local -Z before rotationY around Y.
 *   Therefore:
 *   forwardX = -sin(rotationY), forwardZ = -cos(rotationY)
 *   behindX  = +sin(rotationY), behindZ  = +cos(rotationY)
 */
export function computeCameraRigTarget(
  rawPosition: unknown,
  rawRotationY: unknown,
  rawMode: CameraMode | unknown,
  config: CameraRigConfig = {}
): CameraRigPose {
  const [tx, ty, tz] = sanitizeVec3(rawPosition, [0, 0, 0]);
  const rotationY = sanitizeNumber(rawRotationY, 0, -1e6, 1e6);
  const mode = normalizeCameraMode(rawMode);

  const followDistance = sanitizeNumber(config.followDistance, 9.2, 2, 40);
  const followHeight = sanitizeNumber(config.followHeight, 4.1, 1, 25);
  const lookAheadDistance = sanitizeNumber(config.lookAheadDistance, 3.2, 0, 20);
  const overheadHeight = sanitizeNumber(config.overheadHeight, 26, 8, 80);

  const sinY = Math.sin(rotationY);
  const cosY = Math.cos(rotationY);

  if (mode === 'overhead') {
    // Overhead view positioned directly above the vehicle with a slight offset
    // to prevent gimbal lock in lookAt while orienting with the vehicle heading.
    const slightBehindOffset = 0.01;
    return {
      cameraPosition: [
        tx + sinY * slightBehindOffset,
        ty + overheadHeight,
        tz + cosY * slightBehindOffset,
      ],
      lookAtTarget: [tx, ty + 0.4, tz],
      upVector: [-sinY, 0, -cosY],
    };
  }

  // Third-person follow camera: behind (+sinY, +cosY) and looking ahead (-sinY, -cosY)
  return {
    cameraPosition: [
      tx + sinY * followDistance,
      ty + followHeight,
      tz + cosY * followDistance,
    ],
    lookAtTarget: [
      tx - sinY * lookAheadDistance,
      ty + 1.15,
      tz - cosY * lookAheadDistance,
    ],
    upVector: [0, 1, 0],
  };
}
