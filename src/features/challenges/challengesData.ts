/**
 * PARKLAB 3D — UK Driving Test Parking Challenge Definitions
 *
 * Defines the five playable parking challenges using the shared
 * `ParkingChallengeDefinition` contract and Three.js coordinate conventions:
 * - Y is vertical; X/Z form the ground plane.
 * - Vehicle length is along local Z; width is along local X.
 * - Vehicle forward is local negative Z (-Z) before rotation.
 * - Positions and dimensions are in metres; rotations are in radians.
 */

import type {
  ChallengeId,
  ParkingChallengeDefinition,
} from './types';

export const CHALLENGES: ParkingChallengeDefinition[] = [
  {
    id: 'parallel',
    title: 'Parallel Parking',
    description:
      'Pull up alongside the parked vehicle ahead, then reverse smoothly using an S-turn into the roadside space on the left, finishing parallel and close to the kerb.',
    difficulty: 'intermediate',
    instructions: [
      'Drive forward along the lane and stop parallel to the front blue parked car (~0.8 m gap).',
      'Select reverse and back up slowly until your rear axle aligns with the front car’s rear bumper.',
      'Steer left to angle ~45° into the bay, then counter-steer right as your front clears the bumper.',
      'Straighten the wheels and stop parallel within 0.15–0.45 m of the left kerb inside the markings.',
    ],
    spawnPosition: [-0.8, 0, 8.5],
    spawnRotationY: 0,
    parkingTarget: {
      position: [-3.2, 0, 0],
      rotationY: 0,
      width: 2.4,
      length: 6.4,
    },
    obstacles: [
      {
        id: 'parallel-car-front',
        kind: 'parked-car',
        position: [-3.2, 0, -5.8],
        rotationY: 0,
        dimensions: { width: 1.82, height: 1.45, length: 4.5 },
      },
      {
        id: 'parallel-car-rear',
        kind: 'parked-car',
        position: [-3.2, 0, 5.8],
        rotationY: 0,
        dimensions: { width: 1.8, height: 1.48, length: 4.4 },
      },
      {
        id: 'parallel-kerb-left',
        kind: 'kerb',
        position: [-4.55, 0, 0],
        rotationY: 0,
        dimensions: { width: 0.3, height: 0.15, length: 24 },
      },
      {
        id: 'parallel-cone-north',
        kind: 'cone',
        position: [1.8, 0, -5.8],
        rotationY: 0,
        dimensions: { width: 0.38, height: 0.75, length: 0.38 },
      },
      {
        id: 'parallel-cone-mid',
        kind: 'cone',
        position: [1.8, 0, 0],
        rotationY: 0,
        dimensions: { width: 0.38, height: 0.75, length: 0.38 },
      },
      {
        id: 'parallel-cone-south',
        kind: 'cone',
        position: [1.8, 0, 5.8],
        rotationY: 0,
        dimensions: { width: 0.38, height: 0.75, length: 0.38 },
      },
    ],
  },
  {
    id: 'reverse-bay',
    title: 'Reverse Bay Parking',
    description:
      'Drive forward past the perpendicular 90° target bay on the right, position the car cleanly in the aisle, and reverse squarely between the bay lines.',
    difficulty: 'intermediate',
    instructions: [
      'Drive forward along the central aisle until your vehicle passes the target bay on the right.',
      'Angle slightly left or stop ~2 car lengths past the bay line for a clean 90° turning arc.',
      'Reverse slowly while steering right, checking clearance against both adjacent parked cars.',
      'Straighten your steering as the vehicle aligns with the bay and come to a complete stop inside the markings.',
    ],
    spawnPosition: [0.4, 0, 7.0],
    spawnRotationY: 0,
    parkingTarget: {
      position: [5.5, 0, 0],
      rotationY: Math.PI / 2,
      width: 2.7,
      length: 5.5,
    },
    obstacles: [
      {
        id: 'revbay-car-left',
        kind: 'parked-car',
        position: [5.5, 0, -2.95],
        rotationY: Math.PI / 2,
        dimensions: { width: 1.82, height: 1.45, length: 4.5 },
      },
      {
        id: 'revbay-car-right',
        kind: 'parked-car',
        position: [5.5, 0, 2.95],
        rotationY: -Math.PI / 2,
        dimensions: { width: 1.88, height: 1.66, length: 4.75 },
      },
      {
        id: 'revbay-kerb-back',
        kind: 'kerb',
        position: [8.45, 0, 0],
        rotationY: 0,
        dimensions: { width: 0.3, height: 0.15, length: 14 },
      },
      {
        id: 'revbay-cone-north',
        kind: 'cone',
        position: [-3.2, 0, -4.2],
        rotationY: 0,
        dimensions: { width: 0.38, height: 0.75, length: 0.38 },
      },
      {
        id: 'revbay-cone-south',
        kind: 'cone',
        position: [-3.2, 0, 4.2],
        rotationY: 0,
        dimensions: { width: 0.38, height: 0.75, length: 0.38 },
      },
    ],
  },
  {
    id: 'forward-bay',
    title: 'Forward Bay Parking',
    description:
      'Approach along the aisle, swing out to the right side of the lane to widen your turning circle, and drive forward cleanly into the 90° bay on the left.',
    difficulty: 'beginner',
    instructions: [
      'Move forward and position your vehicle toward the right side of the aisle (near the guide cones).',
      'As your front mirrors approach the southern line of the target bay, steer smoothly to the left.',
      'Control your speed and straighten the wheels as the nose enters between the two parked vehicles.',
      'Stop completely before the rear kerb stop with all four corners inside the painted bay markings.',
    ],
    spawnPosition: [0.8, 0, 8.0],
    spawnRotationY: 0,
    parkingTarget: {
      position: [-5.5, 0, -1.5],
      rotationY: Math.PI / 2,
      width: 2.75,
      length: 5.5,
    },
    obstacles: [
      {
        id: 'fwdbay-car-north',
        kind: 'parked-car',
        position: [-5.5, 0, -4.45],
        rotationY: Math.PI / 2,
        dimensions: { width: 1.8, height: 1.44, length: 4.35 },
      },
      {
        id: 'fwdbay-car-south',
        kind: 'parked-car',
        position: [-5.5, 0, 1.45],
        rotationY: -Math.PI / 2,
        dimensions: { width: 1.84, height: 1.48, length: 4.6 },
      },
      {
        id: 'fwdbay-kerb-stop',
        kind: 'kerb',
        position: [-8.45, 0, -1.5],
        rotationY: 0,
        dimensions: { width: 0.3, height: 0.15, length: 14 },
      },
      {
        id: 'fwdbay-cone-entry-1',
        kind: 'cone',
        position: [3.0, 0, 3.5],
        rotationY: 0,
        dimensions: { width: 0.38, height: 0.75, length: 0.38 },
      },
      {
        id: 'fwdbay-cone-entry-2',
        kind: 'cone',
        position: [3.0, 0, -1.5],
        rotationY: 0,
        dimensions: { width: 0.38, height: 0.75, length: 0.38 },
      },
    ],
  },
  {
    id: 'angled-bay',
    title: 'Angled Bay Parking',
    description:
      'Navigate along the one-way lane and turn smoothly at 45° into a diagonally marked echelon parking space between two angled vehicles.',
    difficulty: 'beginner',
    instructions: [
      'Drive forward along the approach lane while maintaining a central-right aisle position.',
      'Begin a smooth 45° left turn as your front bumper reaches the entry corner of the diagonal bay.',
      'Align your vehicle parallel with the 45° bay lines and adjacent echelon-parked cars.',
      'Bring the vehicle to a complete stop centered inside the diagonal markings without touching the front kerb.',
    ],
    spawnPosition: [-0.2, 0, 8.5],
    spawnRotationY: 0,
    parkingTarget: {
      position: [-4.6, 0, -2.0],
      rotationY: Math.PI / 4,
      width: 2.75,
      length: 5.5,
    },
    obstacles: [
      {
        id: 'angled-car-north',
        kind: 'parked-car',
        position: [-4.6, 0, -6.1],
        rotationY: Math.PI / 4,
        dimensions: { width: 1.8, height: 1.45, length: 4.4 },
      },
      {
        id: 'angled-car-south',
        kind: 'parked-car',
        position: [-4.6, 0, 2.1],
        rotationY: Math.PI / 4,
        dimensions: { width: 1.85, height: 1.52, length: 4.6 },
      },
      {
        id: 'angled-kerb-edge',
        kind: 'kerb',
        position: [-7.8, 0, -2.0],
        rotationY: 0,
        dimensions: { width: 0.3, height: 0.15, length: 16 },
      },
      {
        id: 'angled-cone-1',
        kind: 'cone',
        position: [2.2, 0, 4.0],
        rotationY: 0,
        dimensions: { width: 0.38, height: 0.75, length: 0.38 },
      },
      {
        id: 'angled-cone-2',
        kind: 'cone',
        position: [2.2, 0, -2.0],
        rotationY: 0,
        dimensions: { width: 0.38, height: 0.75, length: 0.38 },
      },
    ],
  },
  {
    id: 'pull-up-right',
    title: 'Pull Up on the Right & Reverse',
    description:
      'Complete the UK driving test roadside manoeuvre: pull across safely to the right-hand kerb ahead, stop parallel to the kerb, then reverse straight back for two car lengths into the assessment zone.',
    difficulty: 'advanced',
    instructions: [
      'Check mirrors and steer smoothly from the left lane across to the right-hand roadside ahead (near the forward cone marker).',
      'Pull up parallel and close (0.15–0.45 m) to the right-hand kerb behind the parked car ahead, and come to a stop.',
      'Select reverse and back up straight for approximately two car lengths (~7–8 m) along the right kerb.',
      'Come to a complete standstill inside the green roadside assessment box while staying parallel and close to the kerb.',
    ],
    spawnPosition: [-2.2, 0, 8.0],
    spawnRotationY: 0,
    parkingTarget: {
      position: [3.3, 0, 2.5],
      rotationY: 0,
      width: 2.3,
      length: 6.2,
    },
    obstacles: [
      {
        id: 'pullright-kerb-right',
        kind: 'kerb',
        position: [4.6, 0, -1.0],
        rotationY: 0,
        dimensions: { width: 0.3, height: 0.15, length: 26 },
      },
      {
        id: 'pullright-kerb-left',
        kind: 'kerb',
        position: [-4.6, 0, -1.0],
        rotationY: 0,
        dimensions: { width: 0.3, height: 0.15, length: 26 },
      },
      {
        id: 'pullright-car-ahead',
        kind: 'parked-car',
        position: [3.3, 0, -9.8],
        rotationY: 0,
        dimensions: { width: 1.82, height: 1.46, length: 4.5 },
      },
      {
        id: 'pullright-car-opposite',
        kind: 'parked-car',
        position: [-3.3, 0, -3.5],
        rotationY: Math.PI,
        dimensions: { width: 1.8, height: 1.44, length: 4.4 },
      },
      {
        id: 'pullright-cone-pullup',
        kind: 'cone',
        position: [4.95, 0, -4.2],
        rotationY: 0,
        dimensions: { width: 0.38, height: 0.75, length: 0.38 },
      },
      {
        id: 'pullright-cone-finish',
        kind: 'cone',
        position: [4.95, 0, 2.5],
        rotationY: 0,
        dimensions: { width: 0.38, height: 0.75, length: 0.38 },
      },
    ],
  },
];

export const DEFAULT_CHALLENGE: ParkingChallengeDefinition = CHALLENGES[0];

/**
 * Retrieve a challenge definition by its ChallengeId, falling back to Parallel Parking.
 */
export function getChallengeById(
  id: ChallengeId | string
): ParkingChallengeDefinition {
  return CHALLENGES.find((challenge) => challenge.id === id) ?? CHALLENGES[0];
}

/**
 * Return the next challenge in sequence (wrapping around to the first).
 */
export function getNextChallenge(
  currentId: ChallengeId | string
): ParkingChallengeDefinition {
  const index = CHALLENGES.findIndex((challenge) => challenge.id === currentId);
  if (index === -1) {
    return CHALLENGES[0];
  }
  return CHALLENGES[(index + 1) % CHALLENGES.length];
}
