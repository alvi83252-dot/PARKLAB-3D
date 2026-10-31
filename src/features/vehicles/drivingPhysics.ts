/**
 * PARKLAB 3D — Arcade Vehicle Driving Physics
 * Lightweight, responsive kinematic bicycle-model physics with momentum, friction,
 * speed-dependent steering, wheel spin, and suspension pitch/roll telemetry.
 */

import type { Vec3, VehicleDefinition } from './types';
import type { DrivingInputState } from './useKeyboardControls';
import { getChassisSpec } from './vehicles';

export interface InternalPhysicsState {
  position: Vec3;
  rotationY: number;
  speedMps: number;
  steeringAngle: number;
  wheelSpinRad: number;
  pitchRad: number;
  rollRad: number;
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
    steeringAngle: 0,
    wheelSpinRad: 0,
    pitchRad: 0,
    rollRad: 0,
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
  enabled: boolean
): void {
  // Clamp frame delta to prevent large physics jumps on tab switches
  const dt = clamp(dtRaw, 0.001, 0.05);
  const { handling } = vehicle;
  const chassis = getChassisSpec(vehicle);

  const prevSpeed = state.speedMps;
  let speed = state.speedMps;
  let isBraking = false;

  const activeInput: DrivingInputState = enabled
    ? input
    : {
        accelerate: false,
        brakeOrReverse: false,
        steerLeft: false,
        steerRight: false,
        handbrake: true,
      };

  // 1. Longitudinal acceleration, braking, reverse, handbrake, and friction
  if (activeInput.handbrake) {
    isBraking = true;
    state.wasBrakingFromForward = false;
    state.reverseGateTimer = 0;
    const handbrakeDecel = handling.brakingMps2 * 1.65;
    speed = moveTowards(speed, 0, handbrakeDecel * dt);
  } else if (activeInput.accelerate && !activeInput.brakeOrReverse) {
    state.wasBrakingFromForward = false;
    state.reverseGateTimer = 0;

    if (speed < -STOP_SPEED_EPSILON) {
      // Braking while moving in reverse
      isBraking = true;
      speed = moveTowards(speed, 0, handling.brakingMps2 * dt);
    } else {
      // Progressive forward throttle
      const speedRatio = clamp(speed / handling.maxForwardSpeedMps, 0, 1);
      const torqueCurve = 1.0 - speedRatio * 0.28;
      const accel = handling.accelerationMps2 * torqueCurve;
      speed = Math.min(handling.maxForwardSpeedMps, speed + accel * dt);
    }
  } else if (activeInput.brakeOrReverse && !activeInput.accelerate) {
    if (speed > STOP_SPEED_EPSILON) {
      // Active braking from forward speed
      isBraking = true;
      if (speed > 0.35) {
        state.wasBrakingFromForward = true;
      }
      speed = moveTowards(speed, 0, handling.brakingMps2 * dt);
      if (speed <= STOP_SPEED_EPSILON) {
        speed = 0;
        if (state.wasBrakingFromForward) {
          state.reverseGateTimer = REVERSE_TRANSITION_HOLD_SEC;
        }
      }
    } else if (state.reverseGateTimer > 0) {
      // Brief pause at 0 m/s when braking from forward speed so stopping is effortless
      isBraking = true;
      speed = 0;
      state.reverseGateTimer = Math.max(0, state.reverseGateTimer - dt);
    } else {
      // Accelerate in reverse
      state.wasBrakingFromForward = false;
      const reverseRatio = clamp(
        Math.abs(speed) / handling.maxReverseSpeedMps,
        0,
        1
      );
      const reverseAccel =
        handling.accelerationMps2 * 0.78 * (1.0 - reverseRatio * 0.25);
      speed = Math.max(-handling.maxReverseSpeedMps, speed - reverseAccel * dt);
    }
  } else {
    // Coasting: rolling resistance + aerodynamic drag + cornering scrub
    state.wasBrakingFromForward = false;
    state.reverseGateTimer = 0;

    const absSpeed = Math.abs(speed);
    if (absSpeed > 0) {
      const drag =
        BASE_ROLLING_FRICTION_MPS2 +
        absSpeed * AERO_DRAG_COEFFICIENT +
        Math.abs(state.steeringAngle) * absSpeed * CORNERING_SCRUB_FACTOR;
      speed = moveTowards(speed, 0, drag * dt);
    }
  }

  if (Math.abs(speed) < STOP_SPEED_EPSILON && !activeInput.accelerate && !activeInput.brakeOrReverse) {
    speed = 0;
  }

  // 2. Steering angle and speed-dependent turning limit
  const absSpeed = Math.abs(speed);
  // Full steering angle at parking speeds (<= 3.5 m/s), smoothly tapering at higher road speeds
  const highSpeedSteerFactor =
    1 / (1 + Math.max(0, absSpeed - 3.5) * 0.095);
  const maxSteerAngle = chassis.maxSteeringAngleRad * highSpeedSteerFactor;

  const steerInput =
    (activeInput.steerLeft ? 1 : 0) - (activeInput.steerRight ? 1 : 0);

  if (steerInput !== 0) {
    const targetSteer = steerInput * maxSteerAngle;
    // Steering is slightly quicker when moving slowly for nimble parking adjustments
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
    // Smooth self-centring when steering keys are released
    const returnRate =
      handling.steeringRate *
      1.35 *
      (0.65 + 0.35 * clamp(absSpeed / 2.5, 0, 1));
    state.steeringAngle = moveTowards(state.steeringAngle, 0, returnRate * dt);
  }

  state.steeringAngle = clamp(state.steeringAngle, -maxSteerAngle, maxSteerAngle);

  // 3. Kinematic bicycle-model heading & world position integration
  // Forward direction in local space is negative Z: [ -sin(rotationY), 0, -cos(rotationY) ]
  let angularVelocityY = 0;
  if (Math.abs(speed) > 0.005 && Math.abs(state.steeringAngle) > 0.001) {
    // Low-speed maneuverability boost so tight parking feels crisp
    const lowSpeedTurnGain = 1.0 + 0.12 * (1 - clamp(absSpeed / 4.0, 0, 1));
    angularVelocityY =
      (speed / chassis.wheelbase) *
      Math.tan(state.steeringAngle) *
      lowSpeedTurnGain;
    state.rotationY += angularVelocityY * dt;
  }

  const forwardX = -Math.sin(state.rotationY);
  const forwardZ = -Math.cos(state.rotationY);

  state.position[0] += forwardX * speed * dt;
  state.position[2] += forwardZ * speed * dt;

  // 4. Wheel spin & subtle suspension pitch/roll for visual polish
  state.wheelSpinRad -= (speed * dt) / Math.max(0.2, chassis.wheelRadius);
  // Keep wheelSpinRad bounded to avoid float precision drift over long sessions
  if (Math.abs(state.wheelSpinRad) > Math.PI * 200) {
    state.wheelSpinRad %= Math.PI * 2;
  }

  const longitudinalAccel = (speed - prevSpeed) / dt;
  const lateralAccel = speed * angularVelocityY;

  const targetPitch = clamp(-longitudinalAccel * 0.0045, -0.04, 0.045);
  const targetRoll = clamp(lateralAccel * 0.0065, -0.05, 0.05);

  state.pitchRad += (targetPitch - state.pitchRad) * Math.min(1, dt * 10);
  state.rollRad += (targetRoll - state.rollRad) * Math.min(1, dt * 10);

  state.speedMps = speed;
  state.isBraking = isBraking;
  state.isReversing = speed < -STOP_SPEED_EPSILON;
}
