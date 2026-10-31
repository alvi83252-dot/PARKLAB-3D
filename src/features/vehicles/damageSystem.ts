/**
 * PARKLAB 3D — Realistic Crash Damage, Dent Deformation & Detachable Parts Physics
 *
 * Models:
 * - Structural health (100% -> 0% Totaled)
 * - Directional crumple zones (front, rear, left, right, engine)
 * - Localized 3D dent records on the chassis
 * - Detachable vehicle parts (front/rear bumpers, hood/bonnet, trunk/spoiler,
 *   left/right wing mirrors, left/right fenders) that loosen and fly off in 3D
 *   with gravity, ground bounce, and skid friction
 * - Metallic impact spark bursts
 */

import type {
  DentRecord,
  DetachablePartId,
  DetachedPartDebris,
  ImpactSparkParticle,
  ObstacleDefinition,
  PartCondition,
  Vec3,
  VehicleDamageState,
  VehicleDamageZone,
  VehicleDefinition,
} from './types';
import {
  resolveEffectiveCarPhysics,
  type EffectiveCustomCarPhysics,
} from '../../config/customization.config';

export interface CollisionImpactEvent {
  obstacle: ObstacleDefinition;
  /** World-space contact point [x, y, z] */
  contactPoint: Vec3;
  /** Collision normal pointing from obstacle toward player vehicle */
  normalX: number;
  normalZ: number;
  /** Penetration depth in metres */
  penetration: number;
  /** Vehicle speed magnitude right before impact (m/s) */
  impactSpeedMps: number;
  /** Relative speed along collision normal (m/s) */
  normalImpactSpeedMps: number;
  /** Angular yaw velocity impulse (rad/s) from off-center torque */
  yawImpulseRadPerSec: number;
  /** Lateral bounce/shunt velocity impulse in world XZ (m/s) */
  lateralImpulseX: number;
  lateralImpulseZ: number;
  /** Suspension pitch & roll shock impulses (rad) */
  pitchImpulse: number;
  rollImpulse: number;
}

const PART_LABELS: Record<DetachablePartId, string> = {
  'front-bumper': 'Front Bumper',
  'rear-bumper': 'Rear Bumper',
  hood: 'Bonnet / Hood',
  trunk: 'Boot / Rear Deck',
  'left-mirror': 'Left Wing Mirror',
  'right-mirror': 'Right Wing Mirror',
  'left-fender': 'Front-Left Wing Panel',
  'right-fender': 'Front-Right Wing Panel',
};

const OBSTACLE_HARDNESS: Record<ObstacleDefinition['kind'], number> = {
  building: 1.55,
  'parked-car': 1.3,
  barrier: 1.25,
  island: 1.1,
  lamppost: 1.2,
  kerb: 0.65,
  cone: 0.22,
};

const OBSTACLE_READABLE_NAME: Record<ObstacleDefinition['kind'], string> = {
  building: 'Building Structure',
  'parked-car': 'Parked Vehicle',
  barrier: 'Road Barrier',
  island: 'Traffic Island',
  lamppost: 'Streetlight Column',
  kerb: 'Concrete Kerb',
  cone: 'Traffic Cone',
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function createInitialDamageState(): VehicleDamageState {
  return {
    health: 100,
    maxHealth: 100,
    isTotaled: false,
    lastImpactDescription: undefined,
    lastImpactSpeedMps: 0,
    lastImpactZone: undefined,
    zones: {
      front: 0,
      rear: 0,
      left: 0,
      right: 0,
      engine: 0,
    },
    parts: {
      'front-bumper': 'intact',
      'rear-bumper': 'intact',
      hood: 'intact',
      trunk: 'intact',
      'left-mirror': 'intact',
      'right-mirror': 'intact',
      'left-fender': 'intact',
      'right-fender': 'intact',
    },
    detachedPartLabels: [],
    dents: [],
    debris: [],
    sparks: [],
  };
}

export function cloneDamageStateSnapshot(
  state: VehicleDamageState
): VehicleDamageState {
  return {
    health: state.health,
    maxHealth: state.maxHealth,
    isTotaled: state.isTotaled,
    lastImpactDescription: state.lastImpactDescription,
    lastImpactSpeedMps: state.lastImpactSpeedMps,
    lastImpactZone: state.lastImpactZone,
    zones: { ...state.zones },
    parts: { ...state.parts },
    detachedPartLabels: [...state.detachedPartLabels],
    dents: state.dents.map((d) => ({ ...d, localPos: [...d.localPos] as Vec3 })),
    debris: state.debris.map((d) => ({
      ...d,
      dimensions: [...d.dimensions] as Vec3,
      position: [...d.position] as Vec3,
      velocity: [...d.velocity] as Vec3,
      rotation: [...d.rotation] as Vec3,
      angularVelocity: [...d.angularVelocity] as Vec3,
    })),
    sparks: state.sparks.map((s) => ({
      ...s,
      position: [...s.position] as Vec3,
      velocity: [...s.velocity] as Vec3,
    })),
  };
}

/**
 * Transform a local vehicle offset [lx, ly, lz] into world space [wx, wy, wz]
 */
function localToWorld(
  vehiclePos: Vec3,
  rotationY: number,
  localOffset: Vec3
): Vec3 {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const wx =
    vehiclePos[0] + localOffset[0] * cos + localOffset[2] * sin;
  const wy = vehiclePos[1] + localOffset[1];
  const wz =
    vehiclePos[2] - localOffset[0] * sin + localOffset[2] * cos;
  return [wx, wy, wz];
}

/**
 * Transform a world point [wx, wy, wz] into vehicle local coordinates [lx, ly, lz]
 */
export function worldToLocal(
  vehiclePos: Vec3,
  rotationY: number,
  worldPoint: Vec3
): Vec3 {
  const dx = worldPoint[0] - vehiclePos[0];
  const dy = worldPoint[1] - vehiclePos[1];
  const dz = worldPoint[2] - vehiclePos[2];
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  // Inverse rotation around Y
  const lx = dx * cos - dz * sin;
  const lz = dx * sin + dz * cos;
  return [lx, dy, lz];
}

function getPartSpec(
  partId: DetachablePartId,
  vehicle: VehicleDefinition,
  customBodyColor?: string
): {
  localOffset: Vec3;
  dimensions: Vec3;
  color: string;
} {
  const { width: W, height: H, length: L } = vehicle.dimensions;
  const partColor = customBodyColor ?? vehicle.bodyColor;
  switch (partId) {
    case 'front-bumper':
      return {
        localOffset: [0, H * 0.26, -L * 0.49],
        dimensions: [W * 0.92, H * 0.22, 0.18],
        color: partColor,
      };
    case 'rear-bumper':
      return {
        localOffset: [0, H * 0.26, L * 0.49],
        dimensions: [W * 0.92, H * 0.22, 0.18],
        color: partColor,
      };
    case 'hood':
      return {
        localOffset: [0, H * 0.56, -L * 0.3],
        dimensions: [W * 0.84, 0.08, L * 0.32],
        color: partColor,
      };
    case 'trunk':
      return {
        localOffset: [0, H * 0.58, L * 0.36],
        dimensions: [W * 0.82, 0.08, L * 0.24],
        color: partColor,
      };
    case 'left-mirror':
      return {
        localOffset: [-W * 0.53, H * 0.62, -L * 0.13],
        dimensions: [0.16, 0.1, 0.16],
        color: partColor,
      };
    case 'right-mirror':
      return {
        localOffset: [W * 0.53, H * 0.62, -L * 0.13],
        dimensions: [0.16, 0.1, 0.16],
        color: partColor,
      };
    case 'left-fender':
      return {
        localOffset: [-W * 0.47, H * 0.38, -L * 0.28],
        dimensions: [0.12, H * 0.34, L * 0.28],
        color: partColor,
      };
    case 'right-fender':
      return {
        localOffset: [W * 0.47, H * 0.38, -L * 0.28],
        dimensions: [0.12, H * 0.34, L * 0.28],
        color: partColor,
      };
  }
}

function detachPart(
  damage: VehicleDamageState,
  partId: DetachablePartId,
  vehicle: VehicleDefinition,
  vehiclePos: Vec3,
  rotationY: number,
  impactEvent: CollisionImpactEvent,
  customBodyColor?: string
): void {
  if (damage.parts[partId] === 'detached') {
    return;
  }

  damage.parts[partId] = 'detached';
  const label = PART_LABELS[partId];
  if (!damage.detachedPartLabels.includes(label)) {
    damage.detachedPartLabels.push(label);
  }

  const spec = getPartSpec(partId, vehicle, customBodyColor);
  const worldPos = localToWorld(vehiclePos, rotationY, spec.localOffset);

  const ejectSpeed = clamp(1.8 + impactEvent.impactSpeedMps * 0.45, 2.0, 8.5);
  const lateralSpread = (Math.random() - 0.5) * 2.4;
  const upwardKick = clamp(1.6 + impactEvent.impactSpeedMps * 0.28, 1.5, 5.2);

  const debrisItem: DetachedPartDebris = {
    id: `debris-${partId}-${Date.now()}-${Math.round(Math.random() * 999)}`,
    partId,
    label,
    color: spec.color,
    dimensions: spec.dimensions,
    position: [worldPos[0], Math.max(0.15, worldPos[1]), worldPos[2]],
    velocity: [
      impactEvent.normalX * ejectSpeed + lateralSpread,
      upwardKick,
      impactEvent.normalZ * ejectSpeed + (Math.random() - 0.5) * 2.0,
    ],
    rotation: [
      (Math.random() - 0.5) * 0.4,
      rotationY,
      (Math.random() - 0.5) * 0.4,
    ],
    angularVelocity: [
      (Math.random() - 0.5) * 9.0,
      (Math.random() - 0.5) * 7.0,
      (Math.random() - 0.5) * 9.0,
    ],
    grounded: false,
  };

  damage.debris.push(debrisItem);
}

function advancePartCondition(
  damage: VehicleDamageState,
  partId: DetachablePartId,
  severity: number,
  vehicle: VehicleDefinition,
  vehiclePos: Vec3,
  rotationY: number,
  impactEvent: CollisionImpactEvent,
  customBodyColor?: string
): void {
  const current: PartCondition = damage.parts[partId];
  if (current === 'detached') return;

  if (severity >= 0.42 || (current === 'loose' && severity >= 0.16)) {
    detachPart(
      damage,
      partId,
      vehicle,
      vehiclePos,
      rotationY,
      impactEvent,
      customBodyColor
    );
  } else if (severity >= 0.2 || (current === 'dented' && severity >= 0.1)) {
    damage.parts[partId] = 'loose';
  } else if (severity >= 0.08 && current === 'intact') {
    damage.parts[partId] = 'dented';
  }
}

/**
 * Applies physical crash damage, localized dents, and part detachment from a collision event.
 */
export function applyCollisionDamage(
  damage: VehicleDamageState,
  impactEvent: CollisionImpactEvent,
  vehicle: VehicleDefinition,
  vehiclePos: Vec3,
  rotationY: number,
  customPhysics?: EffectiveCustomCarPhysics
): void {
  if (damage.isTotaled) {
    return;
  }

  const phys = customPhysics ?? resolveEffectiveCarPhysics();
  const customBodyColor = phys.effectiveBodyColor(vehicle.bodyColor);
  const { obstacle, impactSpeedMps, normalImpactSpeedMps, contactPoint } =
    impactEvent;
  const hardness = OBSTACLE_HARDNESS[obstacle.kind] ?? 1.0;

  // Effective collision speed combines normal impact and scraping speed
  const effectiveSpeed = Math.max(
    0.6,
    normalImpactSpeedMps * 0.8 + impactSpeedMps * 0.45
  );

  // Health loss formula: realistic non-linear scaling with speed, obstacle rigidity, and customized skin/tuning durability
  // Low speed tap (~1.2 m/s): ~6-10 HP
  // Medium crash (~4.5 m/s): ~24-35 HP
  // High speed crash (~9+ m/s): ~55-85 HP
  const rawHealthLoss =
    ((4.5 + Math.pow(effectiveSpeed, 1.38) * 3.8) * hardness) /
    Math.max(0.65, phys.durabilityMultiplier);
  const healthDelta = clamp(Math.round(rawHealthLoss), 3, 88);

  damage.health = Math.max(0, damage.health - healthDelta);
  damage.lastImpactSpeedMps = impactSpeedMps;

  // Determine local impact coordinates on the car body
  const localHit = worldToLocal(vehiclePos, rotationY, contactPoint);
  const { width: W, height: H, length: L } = vehicle.dimensions;
  const halfW = W / 2;
  const halfL = L / 2;

  const normX = localHit[0] / Math.max(0.5, halfW); // -1 (left) to +1 (right)
  const normZ = localHit[2] / Math.max(0.5, halfL); // -1 (front) to +1 (rear)

  let primaryZone: VehicleDamageZone = 'front';
  if (Math.abs(normZ) >= Math.abs(normX) * 0.78) {
    primaryZone = normZ <= 0 ? 'front' : 'rear';
  } else {
    primaryZone = normX <= 0 ? 'left' : 'right';
  }
  damage.lastImpactZone = primaryZone;

  const zoneSeverity = clamp((healthDelta / 100) * 1.45, 0.08, 0.75);

  if (primaryZone === 'front') {
    damage.zones.front = clamp(damage.zones.front + zoneSeverity, 0, 1);
    damage.zones.engine = clamp(
      damage.zones.engine + zoneSeverity * 0.75,
      0,
      1
    );
    if (normX < -0.25) {
      damage.zones.left = clamp(damage.zones.left + zoneSeverity * 0.45, 0, 1);
    } else if (normX > 0.25) {
      damage.zones.right = clamp(
        damage.zones.right + zoneSeverity * 0.45,
        0,
        1
      );
    }
  } else if (primaryZone === 'rear') {
    damage.zones.rear = clamp(damage.zones.rear + zoneSeverity, 0, 1);
    if (normX < -0.25) {
      damage.zones.left = clamp(damage.zones.left + zoneSeverity * 0.4, 0, 1);
    } else if (normX > 0.25) {
      damage.zones.right = clamp(
        damage.zones.right + zoneSeverity * 0.4,
        0,
        1
      );
    }
  } else if (primaryZone === 'left') {
    damage.zones.left = clamp(damage.zones.left + zoneSeverity, 0, 1);
    if (normZ < -0.25) {
      damage.zones.front = clamp(
        damage.zones.front + zoneSeverity * 0.45,
        0,
        1
      );
    } else if (normZ > 0.25) {
      damage.zones.rear = clamp(damage.zones.rear + zoneSeverity * 0.4, 0, 1);
    }
  } else if (primaryZone === 'right') {
    damage.zones.right = clamp(damage.zones.right + zoneSeverity, 0, 1);
    if (normZ < -0.25) {
      damage.zones.front = clamp(
        damage.zones.front + zoneSeverity * 0.45,
        0,
        1
      );
    } else if (normZ > 0.25) {
      damage.zones.rear = clamp(damage.zones.rear + zoneSeverity * 0.4, 0, 1);
    }
  }

  // Record a localized 3D dent on the vehicle body (keep up to 14 distinct dents)
  const clampedLocalX = clamp(localHit[0], -halfW * 0.96, halfW * 0.96);
  const clampedLocalZ = clamp(localHit[2], -halfL * 0.96, halfL * 0.96);
  const dentY = clamp(H * (0.28 + Math.random() * 0.26), 0.22, H * 0.72);
  const dentRecord: DentRecord = {
    id: `dent-${Date.now()}-${damage.dents.length}`,
    zone: primaryZone,
    localPos: [clampedLocalX, dentY, clampedLocalZ],
    depth: clamp(0.05 + zoneSeverity * 0.22, 0.05, 0.28),
    radius: clamp(0.22 + zoneSeverity * 0.38, 0.22, 0.62),
  };
  damage.dents.push(dentRecord);
  if (damage.dents.length > 14) {
    damage.dents.shift();
  }

  // Evaluate detachable parts based on impact zone and cumulative deformation
  if (primaryZone === 'front' || normZ < -0.35) {
    advancePartCondition(
      damage,
      'front-bumper',
      zoneSeverity + damage.zones.front * 0.35,
      vehicle,
      vehiclePos,
      rotationY,
      impactEvent,
      customBodyColor
    );
    if (damage.zones.front > 0.22 || zoneSeverity > 0.28) {
      advancePartCondition(
        damage,
        'hood',
        zoneSeverity * 0.9 + damage.zones.front * 0.3,
        vehicle,
        vehiclePos,
        rotationY,
        impactEvent,
        customBodyColor
      );
    }
    if (normX <= -0.2) {
      advancePartCondition(
        damage,
        'left-fender',
        zoneSeverity + damage.zones.left * 0.3,
        vehicle,
        vehiclePos,
        rotationY,
        impactEvent,
        customBodyColor
      );
    }
    if (normX >= 0.2) {
      advancePartCondition(
        damage,
        'right-fender',
        zoneSeverity + damage.zones.right * 0.3,
        vehicle,
        vehiclePos,
        rotationY,
        impactEvent,
        customBodyColor
      );
    }
  }

  if (primaryZone === 'rear' || normZ > 0.35) {
    advancePartCondition(
      damage,
      'rear-bumper',
      zoneSeverity + damage.zones.rear * 0.35,
      vehicle,
      vehiclePos,
      rotationY,
      impactEvent,
      customBodyColor
    );
    if (damage.zones.rear > 0.24 || zoneSeverity > 0.3) {
      advancePartCondition(
        damage,
        'trunk',
        zoneSeverity * 0.9 + damage.zones.rear * 0.3,
        vehicle,
        vehiclePos,
        rotationY,
        impactEvent,
        customBodyColor
      );
    }
  }

  if (primaryZone === 'left' || normX < -0.35) {
    advancePartCondition(
      damage,
      'left-mirror',
      zoneSeverity * 1.35 + damage.zones.left * 0.4,
      vehicle,
      vehiclePos,
      rotationY,
      impactEvent,
      customBodyColor
    );
    advancePartCondition(
      damage,
      'left-fender',
      zoneSeverity * 0.95 + damage.zones.left * 0.3,
      vehicle,
      vehiclePos,
      rotationY,
      impactEvent,
      customBodyColor
    );
  }

  if (primaryZone === 'right' || normX > 0.35) {
    advancePartCondition(
      damage,
      'right-mirror',
      zoneSeverity * 1.35 + damage.zones.right * 0.4,
      vehicle,
      vehiclePos,
      rotationY,
      impactEvent,
      customBodyColor
    );
    advancePartCondition(
      damage,
      'right-fender',
      zoneSeverity * 0.95 + damage.zones.right * 0.3,
      vehicle,
      vehiclePos,
      rotationY,
      impactEvent,
      customBodyColor
    );
  }

  // Spawn 3D metallic crash sparks at the world contact point
  const sparkCount = clamp(Math.round(6 + effectiveSpeed * 2.5), 6, 22);
  const sparkColors = ['#fbbf24', '#f97316', '#fde047', '#ffffff'];
  for (let i = 0; i < sparkCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.2 + Math.random() * (3.5 + effectiveSpeed * 0.6);
    const maxLife = 0.25 + Math.random() * 0.38;
    const spark: ImpactSparkParticle = {
      id: `spark-${Date.now()}-${i}-${Math.random()}`,
      position: [
        contactPoint[0] + (Math.random() - 0.5) * 0.25,
        0.35 + Math.random() * 0.35,
        contactPoint[2] + (Math.random() - 0.5) * 0.25,
      ],
      velocity: [
        Math.cos(angle) * speed + impactEvent.normalX * 1.5,
        1.8 + Math.random() * 3.6,
        Math.sin(angle) * speed + impactEvent.normalZ * 1.5,
      ],
      life: maxLife,
      maxLife,
      color: sparkColors[i % sparkColors.length],
    };
    damage.sparks.push(spark);
  }
  if (damage.sparks.length > 48) {
    damage.sparks.splice(0, damage.sparks.length - 48);
  }

  // Describe the impact for HUD / Totaled telemetry
  const mph = (impactSpeedMps * 2.23694).toFixed(1);
  const obstacleLabel =
    obstacle.label || OBSTACLE_READABLE_NAME[obstacle.kind] || 'Obstacle';
  const zoneTitle =
    primaryZone.charAt(0).toUpperCase() + primaryZone.slice(1);
  damage.lastImpactDescription = `${zoneTitle} impact with ${obstacleLabel} (${mph} mph)`;

  if (damage.health <= 0) {
    damage.health = 0;
    damage.isTotaled = true;
    // Ensure dramatic part detachment on fatal crash
    if (primaryZone === 'front') {
      detachPart(damage, 'front-bumper', vehicle, vehiclePos, rotationY, impactEvent, customBodyColor);
      detachPart(damage, 'hood', vehicle, vehiclePos, rotationY, impactEvent, customBodyColor);
    } else if (primaryZone === 'rear') {
      detachPart(damage, 'rear-bumper', vehicle, vehiclePos, rotationY, impactEvent, customBodyColor);
      detachPart(damage, 'trunk', vehicle, vehiclePos, rotationY, impactEvent, customBodyColor);
    } else if (primaryZone === 'left') {
      detachPart(damage, 'left-mirror', vehicle, vehiclePos, rotationY, impactEvent, customBodyColor);
      detachPart(damage, 'left-fender', vehicle, vehiclePos, rotationY, impactEvent, customBodyColor);
    } else {
      detachPart(damage, 'right-mirror', vehicle, vehiclePos, rotationY, impactEvent, customBodyColor);
      detachPart(damage, 'right-fender', vehicle, vehiclePos, rotationY, impactEvent, customBodyColor);
    }
  }
}

/**
 * Steps 3D rigid-body kinematics for detached car parts (gravity, road bounce, friction)
 * and crash spark particles every frame.
 */
export function stepDamageDebrisAndSparks(
  damage: VehicleDamageState,
  dtRaw: number,
  customPhysics?: EffectiveCustomCarPhysics
): void {
  const dt = clamp(dtRaw, 0.001, 0.05);
  const gravity = 9.81;
  const phys = customPhysics ?? resolveEffectiveCarPhysics();
  const bounceFactor = clamp(0.36 * phys.restitutionMultiplier, 0.22, 0.62);

  // Step detached car parts in world space
  for (let i = 0; i < damage.debris.length; i++) {
    const part = damage.debris[i];
    if (part.grounded) {
      continue;
    }

    part.velocity[1] -= gravity * dt;

    part.position[0] += part.velocity[0] * dt;
    part.position[1] += part.velocity[1] * dt;
    part.position[2] += part.velocity[2] * dt;

    part.rotation[0] += part.angularVelocity[0] * dt;
    part.rotation[1] += part.angularVelocity[1] * dt;
    part.rotation[2] += part.angularVelocity[2] * dt;

    const minGroundY = Math.max(0.04, part.dimensions[1] * 0.5);
    if (part.position[1] <= minGroundY) {
      part.position[1] = minGroundY;

      if (Math.abs(part.velocity[1]) > 0.65) {
        part.velocity[1] = -part.velocity[1] * bounceFactor;
        part.velocity[0] *= 0.72;
        part.velocity[2] *= 0.72;
        part.angularVelocity[0] *= 0.65;
        part.angularVelocity[1] *= 0.7;
        part.angularVelocity[2] *= 0.65;
      } else {
        part.velocity[1] = 0;
        // Ground sliding friction on asphalt
        const slideDrag = Math.max(0, 1 - dt * 5.5);
        part.velocity[0] *= slideDrag;
        part.velocity[2] *= slideDrag;
        part.angularVelocity[0] *= slideDrag;
        part.angularVelocity[1] *= slideDrag;
        part.angularVelocity[2] *= slideDrag;

        // Flatten pitch/roll gently when resting on tarmac
        part.rotation[0] *= 0.85;
        part.rotation[2] *= 0.85;

        if (
          Math.hypot(part.velocity[0], part.velocity[2]) < 0.06 &&
          Math.abs(part.angularVelocity[1]) < 0.08
        ) {
          part.velocity[0] = 0;
          part.velocity[2] = 0;
          part.angularVelocity = [0, 0, 0];
          part.grounded = true;
        }
      }
    }
  }

  // Step active crash sparks
  for (let i = damage.sparks.length - 1; i >= 0; i--) {
    const spark = damage.sparks[i];
    spark.life -= dt;
    if (spark.life <= 0) {
      damage.sparks.splice(i, 1);
      continue;
    }
    spark.velocity[1] -= gravity * 1.15 * dt;
    spark.position[0] += spark.velocity[0] * dt;
    spark.position[1] += spark.velocity[1] * dt;
    spark.position[2] += spark.velocity[2] * dt;
    if (spark.position[1] < 0.02) {
      spark.position[1] = 0.02;
      spark.velocity[1] = -spark.velocity[1] * 0.4;
    }
  }
}
