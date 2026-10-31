/**
 * PARKLAB 3D — Realistic Vehicle Driving, SpaceX 3D Flight & Impact Physics
 * Responsive kinematic bicycle-model ground physics + 6-DOF SpaceX Cold-Gas Thruster 3D flight:
 * - Full 3D vertical ascent, altitude-hold flight, banked turns, mid-air yaw vectoring, and cushioned landing for the Roadster
 * - Off-center crash rotational yaw spin (angularVelocityY) with tire-scrub damping
 * - Lateral collision shunt/rebound velocity (lateralVelocityX/Z)
 * - Suspension pitch & roll shock response
 * - Mechanical degradation from engine & front-axle damage
 */

import type { Vec3, VehicleDamageState, VehicleDefinition } from './types';
import type { DrivingInputState } from './useKeyboardControls';
import { getChassisSpec } from './vehicles';
import {
  resolveEffectiveCarPhysics,
  type EffectiveCustomCarPhysics,
} from '../../config/customization.config';

export interface InternalPhysicsState {
  position: Vec3;
  rotationY: number;
  speedMps: number;
  verticalVelocityY: number;
  isAirborne: boolean;
  steeringAngle: number;
  wheelSpinRad: number;
  pitchRad: number;
  rollRad: number;
  /** Residual angular yaw velocity (rad/s) from off-center collision torque */
  angularVelocityY: number;
  /** Residual lateral velocity in world X (m/s) from collision rebound */
  lateralVelocityX: number;
  /** Residual lateral velocity in world Z (m/s) from collision rebound */
  lateralVelocityZ: number;
  isBraking: boolean;
  isReversing: boolean;
  reverseGateTimer: number;
  wasBrakingFromForward: boolean;
}

const STOP_SPEED_EPSILON = 0.025;
const BASE_ROLLING_FRICTION_MPS2 = 2.15;
const AERO_DRAG_COEFFICIENT = 0.16;
const CORNERING_SCRUB_FACTOR = 0.32;
const REVERSE_TRANSITION_HOLD_SEC = 0.14;
const TIRE_LATERAL_SCRUB_MPS2 = 11.5;
const YAW_SPIN_DAMPING_RAD_S2 = 8.5;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function moveTowards(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }
  return current + Math.sign(target - current) * maxDelta;
}

export function createInitialPhysicsState(
  initialPosition: Vec3,
  initialRotationY: number
): InternalPhysicsState {
  return {
    position: [initialPosition[0], initialPosition[1], initialPosition[2]],
    rotationY: initialRotationY,
    speedMps: 0,
    verticalVelocityY: 0,
    isAirborne: initialPosition[1] > 0.18,
    steeringAngle: 0,
    wheelSpinRad: 0,
    pitchRad: 0,
    rollRad: 0,
    angularVelocityY: 0,
    lateralVelocityX: 0,
    lateralVelocityZ: 0,
    isBraking: false,
    isReversing: false,
    reverseGateTimer: 0,
    wasBrakingFromForward: false,
  };
}

export function stepDrivingPhysics(
  state: InternalPhysicsState,
  input: DrivingInputState,
  vehicle: VehicleDefinition,
  dtRaw: number,
  enabled: boolean,
  damage?: VehicleDamageState,
  customPhysics?: EffectiveCustomCarPhysics
): void {
  // Clamp frame delta to prevent large physics jumps on tab switches
  const dt = clamp(dtRaw, 0.001, 0.05);
  const { handling } = vehicle;
  const chassis = getChassisSpec(vehicle);
  const canFly = Boolean(chassis.isFlyingVehicle);
  const maxFlightAltitude = chassis.maxFlightAltitudeMetres ?? 38;

  const phys = customPhysics ?? resolveEffectiveCarPhysics();
  const effectiveAccelerationMps2 =
    handling.accelerationMps2 * phys.accelerationMultiplier;
  const effectiveBrakingMps2 =
    handling.brakingMps2 * phys.brakingMultiplier;
  const effectiveLateralScrubMps2 =
    TIRE_LATERAL_SCRUB_MPS2 * phys.gripMultiplier;
  const effectiveYawSpinDamping =
    YAW_SPIN_DAMPING_RAD_S2 * phys.gripMultiplier;

  const isTotaled = Boolean(damage?.isTotaled);
  const engineDamage = clamp(damage?.zones.engine ?? 0, 0, 1);
  const enginePowerMultiplier = isTotaled ? 0 : 1 - engineDamage * 0.45;

  const canDrive = enabled && !isTotaled;
  const activeInput: DrivingInputState = canDrive
    ? input
    : {
        accelerate: false,
        brakeOrReverse: false,
        steerLeft: false,
        steerRight: false,
        handbrake: true,
        ascend: false,
        descend: false,
      };

  // =========================================================================
  // 0. SpaceX Cold-Gas 3D Vertical Flight Kinematics (Roadster Flight Mode)
  // =========================================================================
  if (canFly) {
    let vy = state.verticalVelocityY;
    const currentAlt = state.position[1];

    if (activeInput.descend && !activeInput.ascend) {
      const descendAccel = 18.0;
      // Soft retro-thruster cushion near ground (Y < 1.2m) for smooth bay landings
      const maxSinkRate =
        currentAlt < 1.2 ? Math.max(2.6, currentAlt * 4.5) : 12.0;
      vy = Math.max(-maxSinkRate, vy - descendAccel * dt);
    } else if (activeInput.ascend && !activeInput.descend) {
      const climbAccel = 16.5 * enginePowerMultiplier;
      vy = Math.min(11.5, vy + climbAccel * dt);
    } else if (activeInput.descend && activeInput.ascend) {
      // If both are held simultaneously, prioritize descending back toward ground
      const descendAccel = 16.0;
      vy = Math.max(-9.5, vy - descendAccel * dt);
    } else {
      // Active altitude-hold thrusters stabilize vertical velocity in mid-air
      vy = moveTowards(vy, 0, 24.0 * dt);
    }

    let nextY = currentAlt + vy * dt;
    if (nextY <= 0.01) {
      nextY = 0;
      if (vy < 0) vy = 0;
    } else if (nextY >= maxFlightAltitude) {
      nextY = maxFlightAltitude;
      if (vy > 0) vy = 0;
    }

    state.position[1] = nextY;
    state.verticalVelocityY = vy;
    state.isAirborne = nextY > 0.16;
  } else {
    state.position[1] = moveTowards(state.position[1], 0, 9.8 * dt);
    state.verticalVelocityY = 0;
    state.isAirborne = false;
  }

  const isAirborne = state.isAirborne;
  // In flight mode, cold-gas rear thrusters unlock 38% higher airspeed
  const flightSpeedBoost = isAirborne ? 1.38 : 1.0;
  const effectiveMaxForwardSpeed =
    handling.maxForwardSpeedMps * flightSpeedBoost * (1 - engineDamage * 0.38);
  const effectiveMaxReverseSpeed =
    handling.maxReverseSpeedMps * (isAirborne ? 1.25 : 1.0) * (1 - engineDamage * 0.3);

  const prevSpeed = state.speedMps;
  let speed = state.speedMps;
  let isBraking = false;

  // On flight-capable vehicles, Space is used for vertical ascent rather than wheel handbrake
  const useHandbrake = activeInput.handbrake && (!canFly || !activeInput.ascend);

  // 1. Longitudinal acceleration, braking, reverse, handbrake, and friction
  if (useHandbrake) {
    isBraking = true;
    state.wasBrakingFromForward = false;
    state.reverseGateTimer = 0;
    const handbrakeDecel = effectiveBrakingMps2 * 1.65;
    speed = moveTowards(speed, 0, handbrakeDecel * dt);
  } else if (activeInput.accelerate && !activeInput.brakeOrReverse) {
    state.wasBrakingFromForward = false;
    state.reverseGateTimer = 0;

    if (speed < -STOP_SPEED_EPSILON) {
      isBraking = true;
      speed = moveTowards(speed, 0, effectiveBrakingMps2 * dt);
    } else {
      const speedRatio = clamp(speed / Math.max(1, effectiveMaxForwardSpeed), 0, 1);
      const torqueCurve = 1.0 - speedRatio * 0.25;
      const accel =
        effectiveAccelerationMps2 *
        (isAirborne ? 1.28 : 1.0) *
        torqueCurve *
        enginePowerMultiplier;
      speed = Math.min(effectiveMaxForwardSpeed, speed + accel * dt);
    }
  } else if (activeInput.brakeOrReverse && !activeInput.accelerate) {
    if (speed > STOP_SPEED_EPSILON) {
      isBraking = true;
      if (speed > 0.35) {
        state.wasBrakingFromForward = true;
      }
      speed = moveTowards(speed, 0, effectiveBrakingMps2 * dt);
      if (speed <= STOP_SPEED_EPSILON) {
        speed = 0;
        if (state.wasBrakingFromForward) {
          state.reverseGateTimer = REVERSE_TRANSITION_HOLD_SEC;
        }
      }
    } else if (state.reverseGateTimer > 0) {
      isBraking = true;
      speed = 0;
      state.reverseGateTimer = Math.max(0, state.reverseGateTimer - dt);
    } else {
      state.wasBrakingFromForward = false;
      const reverseRatio = clamp(
        Math.abs(speed) / Math.max(1, effectiveMaxReverseSpeed),
        0,
        1
      );
      const reverseAccel =
        effectiveAccelerationMps2 *
        0.78 *
        (1.0 - reverseRatio * 0.25) *
        enginePowerMultiplier;
      speed = Math.max(-effectiveMaxReverseSpeed, speed - reverseAccel * dt);
    }
  } else {
    state.wasBrakingFromForward = false;
    state.reverseGateTimer = 0;

    const absSpeed = Math.abs(speed);
    if (absSpeed > 0) {
      const baseFriction = isAirborne
        ? BASE_ROLLING_FRICTION_MPS2 * 0.42
        : BASE_ROLLING_FRICTION_MPS2;
      const drag =
        baseFriction +
        absSpeed * AERO_DRAG_COEFFICIENT +
        Math.abs(state.steeringAngle) * absSpeed * CORNERING_SCRUB_FACTOR;
      speed = moveTowards(speed, 0, drag * dt);
    }
  }

  if (
    Math.abs(speed) < STOP_SPEED_EPSILON &&
    !activeInput.accelerate &&
    !activeInput.brakeOrReverse
  ) {
    speed = 0;
  }

  // 2. Steering angle and speed-dependent turning limit
  const absSpeed = Math.abs(speed);
  const highSpeedSteerFactor =
    1 / (1 + Math.max(0, absSpeed - 3.5) * (isAirborne ? 0.055 : 0.095));
  const maxSteerAngle = chassis.maxSteeringAngleRad * highSpeedSteerFactor;

  const steerInput =
    (activeInput.steerLeft ? 1 : 0) - (activeInput.steerRight ? 1 : 0);

  const alignmentBias = damage
    ? (damage.zones.left - damage.zones.right) * 0.045 * clamp(absSpeed / 3.0, 0, 1)
    : 0;

  if (steerInput !== 0) {
    const targetSteer = clamp(
      steerInput * maxSteerAngle + alignmentBias,
      -maxSteerAngle,
      maxSteerAngle
    );
    const activeSteerRate =
      handling.steeringRate *
      (Math.sign(targetSteer) !== Math.sign(state.steeringAngle) &&
      Math.abs(state.steeringAngle) > 0.02
        ? 1.45
        : 1.0);
    state.steeringAngle = moveTowards(
      state.steeringAngle,
      targetSteer,
      activeSteerRate * dt
    );
  } else {
    const returnRate =
      handling.steeringRate *
      1.35 *
      (0.65 + 0.35 * clamp(absSpeed / 2.5, 0, 1));
    state.steeringAngle = moveTowards(
      state.steeringAngle,
      alignmentBias,
      returnRate * dt
    );
  }

  state.steeringAngle = clamp(state.steeringAngle, -maxSteerAngle, maxSteerAngle);

  // 3. Kinematic bicycle-model heading + mid-air reaction thruster yaw vectoring
  let kinematicYawRate = 0;
  if (Math.abs(speed) > 0.005 && Math.abs(state.steeringAngle) > 0.001) {
    const lowSpeedTurnGain = 1.0 + 0.12 * (1 - clamp(absSpeed / 4.0, 0, 1));
    kinematicYawRate =
      (speed / chassis.wheelbase) *
      Math.tan(state.steeringAngle) *
      lowSpeedTurnGain;
  } else if (isAirborne && steerInput !== 0) {
    // Reaction-control cold-gas thrusters allow mid-air yaw rotation even while hovering stationary
    kinematicYawRate = steerInput * 1.45;
  }

  state.rotationY += (kinematicYawRate + state.angularVelocityY) * dt;
  state.angularVelocityY = moveTowards(
    state.angularVelocityY,
    0,
    effectiveYawSpinDamping * dt
  );

  const forwardX = -Math.sin(state.rotationY);
  const forwardZ = -Math.cos(state.rotationY);

  state.position[0] += (forwardX * speed + state.lateralVelocityX) * dt;
  state.position[2] += (forwardZ * speed + state.lateralVelocityZ) * dt;

  state.lateralVelocityX = moveTowards(
    state.lateralVelocityX,
    0,
    effectiveLateralScrubMps2 * dt
  );
  state.lateralVelocityZ = moveTowards(
    state.lateralVelocityZ,
    0,
    effectiveLateralScrubMps2 * dt
  );

  // 4. Wheel spin & 3D flight / suspension pitch & roll attitude
  state.wheelSpinRad -= (speed * dt) / Math.max(0.2, chassis.wheelRadius);
  if (Math.abs(state.wheelSpinRad) > Math.PI * 200) {
    state.wheelSpinRad %= Math.PI * 2;
  }

  const longitudinalAccel = (speed - prevSpeed) / dt;
  const lateralAccel = speed * (kinematicYawRate + state.angularVelocityY);

  if (isAirborne) {
    // Dynamic 3D aircraft-style pitch (climb/dive + thrust) and banked roll in turns
    const climbPitch = clamp(state.verticalVelocityY * 0.028, -0.26, 0.28);
    const thrustPitch = clamp(-longitudinalAccel * 0.006, -0.08, 0.08);
    const targetFlightPitch = clamp(climbPitch + thrustPitch, -0.32, 0.32);

    const bankRoll = clamp(
      -state.steeringAngle * (0.38 + clamp(absSpeed / 12, 0, 0.45)),
      -0.42,
      0.42
    );
    state.pitchRad += (targetFlightPitch - state.pitchRad) * Math.min(1, dt * 8.5);
    state.rollRad += (bankRoll - state.rollRad) * Math.min(1, dt * 8.5);
  } else {
    const comp = phys.suspensionCompliance;
    const targetPitch = clamp(
      -longitudinalAccel * 0.0045 * comp,
      -0.075,
      0.08
    );
    const targetRoll = clamp(
      lateralAccel * 0.0065 * comp,
      -0.085,
      0.085
    );

    state.pitchRad += (targetPitch - state.pitchRad) * Math.min(1, dt * 10);
    state.rollRad += (targetRoll - state.rollRad) * Math.min(1, dt * 10);
  }

  state.speedMps = speed;
  state.isBraking = isBraking;
  state.isReversing = speed < -STOP_SPEED_EPSILON;
}
