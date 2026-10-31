import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { DrivingCameraProps } from '../world.types';
import {
  computeCameraRigTarget,
  normalizeCameraMode,
  sanitizeNumber,
  sanitizeVec3,
  shortestAngleDelta,
} from '../utils/worldFallbacks';

/**
 * DrivingCamera
 * Dual-mode camera controller operating inside an existing React Three Fiber <Canvas>.
 *
 * Modes:
 * - "follow" (or "third-person"): Smoothly trails behind the player's vehicle,
 *   adapting to vehicle heading without jitter.
 * - "overhead" (or "top-down"): Provides a clear bird's-eye view of the entire
 *   parking manoeuvre to judge bay alignment and spatial clearances.
 */
export function DrivingCamera({
  targetPosition = [0, 0, 0],
  targetRotationY = 0,
  mode = 'follow',
  followDistance = 9.2,
  followHeight = 4.1,
  lookAheadDistance = 3.2,
  overheadHeight = 26,
  smoothingFactor = 6.5,
}: DrivingCameraProps) {
  const { camera } = useThree();

  const initializedRef = useRef(false);
  const smoothedRotationYRef = useRef<number>(
    sanitizeNumber(targetRotationY, 0, -1e6, 1e6)
  );
  const currentPositionRef = useRef(new THREE.Vector3(0, 6, 10));
  const currentLookAtRef = useRef(new THREE.Vector3(0, 1, 0));
  const currentUpRef = useRef(new THREE.Vector3(0, 1, 0));

  const desiredPositionScratch = useRef(new THREE.Vector3());
  const desiredLookAtScratch = useRef(new THREE.Vector3());
  const desiredUpScratch = useRef(new THREE.Vector3());

  // Snap immediately on first mount so the camera starts framed on the vehicle
  useEffect(() => {
    const safePos = sanitizeVec3(targetPosition, [0, 0, 0]);
    const safeRot = sanitizeNumber(targetRotationY, 0, -1e6, 1e6);
    const canonicalMode = normalizeCameraMode(mode);

    const initialPose = computeCameraRigTarget(
      safePos,
      safeRot,
      canonicalMode,
      {
        followDistance,
        followHeight,
        lookAheadDistance,
        overheadHeight,
      }
    );

    if (!initializedRef.current) {
      smoothedRotationYRef.current = safeRot;
      currentPositionRef.current.set(...initialPose.cameraPosition);
      currentLookAtRef.current.set(...initialPose.lookAtTarget);
      currentUpRef.current.set(...initialPose.upVector);

      camera.position.copy(currentPositionRef.current);
      camera.up.copy(currentUpRef.current);
      camera.lookAt(currentLookAtRef.current);
      initializedRef.current = true;
    }
  }, [
    camera,
    followDistance,
    followHeight,
    lookAheadDistance,
    mode,
    overheadHeight,
    targetPosition,
    targetRotationY,
  ]);

  useFrame((_state, rawDelta) => {
    try {
      // Clamp frame delta to avoid camera jumps when switching browser tabs
      const delta = Math.min(Math.max(rawDelta, 0.001), 0.1);
      const damping = sanitizeNumber(smoothingFactor, 6.5, 1, 30);
      const alpha = 1 - Math.exp(-damping * delta);

      const safePos = sanitizeVec3(targetPosition, [0, 0, 0]);
      const safeTargetRot = sanitizeNumber(targetRotationY, 0, -1e6, 1e6);
      const canonicalMode = normalizeCameraMode(mode);

      // Smoothly interpolate vehicle heading across the +/-PI boundary
      const angleDiff = shortestAngleDelta(
        smoothedRotationYRef.current,
        safeTargetRot
      );
      smoothedRotationYRef.current += angleDiff * alpha;

      const desiredPose = computeCameraRigTarget(
        safePos,
        smoothedRotationYRef.current,
        canonicalMode,
        {
          followDistance,
          followHeight,
          lookAheadDistance,
          overheadHeight,
        }
      );

      desiredPositionScratch.current.set(...desiredPose.cameraPosition);
      desiredLookAtScratch.current.set(...desiredPose.lookAtTarget);
      desiredUpScratch.current.set(...desiredPose.upVector);

      currentPositionRef.current.lerp(desiredPositionScratch.current, alpha);
      currentLookAtRef.current.lerp(desiredLookAtScratch.current, alpha);
      currentUpRef.current.lerp(desiredUpScratch.current, alpha).normalize();

      camera.position.copy(currentPositionRef.current);
      camera.up.copy(currentUpRef.current);
      camera.lookAt(currentLookAtRef.current);
    } catch {
      // Ultimate fallback if camera state encounters any unexpected error
      camera.position.set(0, 12, 18);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}

export default DrivingCamera;
