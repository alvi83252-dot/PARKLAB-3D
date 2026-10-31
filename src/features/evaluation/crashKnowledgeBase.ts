/**
 * PARKLAB 3D — Static RAG Parking & Obstacle Knowledge Base
 *
 * Grounded directly in the repository's `CHALLENGES` definitions and obstacle
 * geometry (`src/features/challenges/challengesData.ts`). Provides concise,
 * actionable coaching documents for hybrid TF-IDF + feature similarity search.
 */

import type { ObstacleDefinition } from '../challenges/types';
import type { StaticGuidanceDocument } from './crashRagTypes';

const OBSTACLE_LABELS_BY_ID: Record<string, string> = {
  // Parallel Parking
  'parallel-car-front': 'Front Parked Car',
  'parallel-car-rear': 'Rear Parked Car',
  'parallel-kerb-left': 'Left Kerb',
  'parallel-cone-north': 'North Lane Cone',
  'parallel-cone-mid': 'Mid-Lane Cone',
  'parallel-cone-south': 'South Lane Cone',

  // Reverse Bay Parking
  'revbay-car-left': 'Left Bay Car',
  'revbay-car-right': 'Right Bay Car',
  'revbay-kerb-back': 'Rear Bay Kerb',
  'revbay-cone-north': 'North Aisle Cone',
  'revbay-cone-south': 'South Aisle Cone',

  // Forward Bay Parking
  'fwdbay-car-north': 'North Bay Car',
  'fwdbay-car-south': 'South Bay Car',
  'fwdbay-kerb-stop': 'Front Stop Kerb',
  'fwdbay-cone-entry-1': 'Entry Cone 1',
  'fwdbay-cone-entry-2': 'Entry Cone 2',

  // Angled Bay Parking
  'angled-car-north': 'Far Angled Car',
  'angled-car-south': 'Near Angled Car',
  'angled-kerb-edge': 'Front Kerb Edge',
  'angled-cone-1': 'South Lane Cone',
  'angled-cone-2': 'North Lane Cone',

  // Pull Up on the Right & Reverse
  'pullright-kerb-right': 'Right Roadside Kerb',
  'pullright-kerb-left': 'Left Lane Kerb',
  'pullright-car-ahead': 'Forward Parked Car',
  'pullright-car-opposite': 'Opposite Lane Car',
  'pullright-cone-pullup': 'Pull-Up Cone',
  'pullright-cone-finish': 'Finish Zone Cone',

  // World Boundary
  'world-boundary': 'Arena Boundary',
};

export function getObstacleReadableLabel(obstacle: ObstacleDefinition): string {
  if (OBSTACLE_LABELS_BY_ID[obstacle.id]) {
    return `${OBSTACLE_LABELS_BY_ID[obstacle.id]} (${obstacle.id})`;
  }
  switch (obstacle.kind) {
    case 'parked-car':
      return `Parked Car (${obstacle.id})`;
    case 'cone':
      return `Traffic Cone (${obstacle.id})`;
    case 'kerb':
      return `Kerb (${obstacle.id})`;
  }
}

export const STATIC_CRASH_KNOWLEDGE_BASE: StaticGuidanceDocument[] = [
  // =========================================================================
  // 1. PARALLEL PARKING (`parallel`)
  // =========================================================================
  {
    id: 'kb-parallel-front-car-reverse-swing',
    challengeId: 'parallel',
    obstacleIdPattern: 'parallel-car-front',
    obstacleKind: 'parked-car',
    applicableDirections: ['reverse'],
    applicableImpactZones: [
      'front-right-corner',
      'front-bumper',
      'right-flank',
      'rear-left-corner',
    ],
    applicableCauseTags: [
      'front-swing-clip-during-reverse',
      'early-turn-in-clip',
      'insufficient-lateral-clearance',
    ],
    title: 'Parallel Park: Front Car Bumper Clearance',
    searchKeywords:
      'parallel parking parallel-car-front parked-car reverse s-turn front-right-corner rear-left-corner bumper clip swing clearance',
    guidanceText:
      'Turned too close to the front car before the bumper cleared.',
    correctiveAction:
      'Leave a wider ~0.8 m side gap and let your front bumper clear the rear of the front car before counter-steering right.',
    nextAttemptFocus:
      'Wait until your nose clears the front car before steering right.',
  },
  {
    id: 'kb-parallel-front-car-forward-approach',
    challengeId: 'parallel',
    obstacleIdPattern: 'parallel-car-front',
    obstacleKind: 'parked-car',
    applicableDirections: ['forward'],
    applicableImpactZones: [
      'front-left-corner',
      'front-bumper',
      'left-flank',
    ],
    applicableCauseTags: [
      'insufficient-lateral-clearance',
      'excessive-forward-speed',
    ],
    title: 'Parallel Park: Initial Pull-Up Gap',
    searchKeywords:
      'parallel parking parallel-car-front forward pull-up approach side clearance front-left-corner',
    guidanceText:
      'Pulled up too close to the side of the front parked car.',
    correctiveAction:
      'Pull forward in the center lane with roughly one door-width (0.8 m) between the cars.',
    nextAttemptFocus:
      'Keep a 0.8 m side gap when pulling up beside the front car.',
  },
  {
    id: 'kb-parallel-rear-car-backing',
    challengeId: 'parallel',
    obstacleIdPattern: 'parallel-car-rear',
    obstacleKind: 'parked-car',
    applicableDirections: ['reverse'],
    applicableImpactZones: [
      'rear-bumper',
      'rear-left-corner',
      'rear-right-corner',
    ],
    applicableCauseTags: [
      'blind-spot-rear-backing',
      'excessive-reverse-speed',
      'late-steering-correction',
    ],
    title: 'Parallel Park: Rear Car Stopping Depth',
    searchKeywords:
      'parallel parking parallel-car-rear reverse backing depth rear-bumper rear-left-corner',
    guidanceText:
      'Reversed too deep into the bay past the rear stopping point.',
    correctiveAction:
      'Counter-steer right earlier and brake below 2.5 mph as your car straightens in the space.',
    nextAttemptFocus:
      'Brake earlier once aligned in the bay to avoid the rear car.',
  },
  {
    id: 'kb-parallel-kerb-left',
    challengeId: 'parallel',
    obstacleIdPattern: 'parallel-kerb-left',
    obstacleKind: 'kerb',
    applicableDirections: ['reverse', 'forward'],
    applicableCauseTags: ['kerb-overrun', 'late-steering-correction'],
    title: 'Parallel Park: Left Kerb Counter-Steer',
    searchKeywords:
      'parallel parking parallel-kerb-left kerb strike overrun rear-left-corner counter-steer',
    guidanceText:
      'Held left steering lock too long while reversing toward the kerb.',
    correctiveAction:
      'Counter-steer right when your rear-left wheel is ~0.4 m from the kerb so the car swings parallel.',
    nextAttemptFocus:
      'Counter-steer right half a car-length earlier before the kerb.',
  },

  // =========================================================================
  // 2. REVERSE BAY PARKING (`reverse-bay`)
  // =========================================================================
  {
    id: 'kb-revbay-adjacent-cars',
    challengeId: 'reverse-bay',
    obstacleIdPattern: 'revbay-car',
    obstacleKind: 'parked-car',
    applicableDirections: ['reverse', 'forward'],
    applicableImpactZones: [
      'rear-left-corner',
      'rear-right-corner',
      'front-left-corner',
      'front-right-corner',
    ],
    applicableCauseTags: [
      'early-turn-in-clip',
      'late-steering-correction',
      'front-swing-clip-during-reverse',
    ],
    title: 'Reverse Bay: 90° Turn-In & Side Clearance',
    searchKeywords:
      'reverse-bay revbay-car-left revbay-car-right parked-car perpendicular 90 bay clip corner turning arc',
    guidanceText:
      'Turned into the 90° bay too early or too tightly alongside the adjacent parked car.',
    correctiveAction:
      'Pull 2 car lengths past the bay, reverse slowly (< 3 mph), and straighten the wheels as you enter between the cars.',
    nextAttemptFocus:
      'Pull slightly further past the bay before reversing under right lock.',
  },
  {
    id: 'kb-revbay-rear-kerb',
    challengeId: 'reverse-bay',
    obstacleIdPattern: 'revbay-kerb-back',
    obstacleKind: 'kerb',
    applicableDirections: ['reverse'],
    applicableCauseTags: ['kerb-overrun', 'excessive-reverse-speed'],
    title: 'Reverse Bay: Rear Kerb Stop Point',
    searchKeywords:
      'reverse-bay revbay-kerb-back kerb rear bumper stop depth',
    guidanceText:
      'Reversed past the back line of the bay into the rear stop kerb.',
    correctiveAction:
      'Stop as soon as all 4 corners are inside the bay markings (`READY TO ASSESS`).',
    nextAttemptFocus:
      'Brake (`Space` or `W`) as soon as `4/4 CORNERS IN BAY` turns green.',
  },

  // =========================================================================
  // 3. FORWARD BAY PARKING (`forward-bay`)
  // =========================================================================
  {
    id: 'kb-fwdbay-adjacent-cars',
    challengeId: 'forward-bay',
    obstacleIdPattern: 'fwdbay-car',
    obstacleKind: 'parked-car',
    applicableDirections: ['forward', 'reverse'],
    applicableImpactZones: [
      'front-left-corner',
      'front-right-corner',
      'left-flank',
      'right-flank',
    ],
    applicableCauseTags: [
      'early-turn-in-clip',
      'insufficient-lateral-clearance',
      'late-steering-correction',
    ],
    title: 'Forward Bay: Wide Swing Entry',
    searchKeywords:
      'forward-bay fwdbay-car-north fwdbay-car-south parked-car nose-in swing wide turn left clip',
    guidanceText:
      'Turned left into the bay too tightly without swinging wide first.',
    correctiveAction:
      'Swing out toward the right-hand cones first, then turn left smoothly into the center of the bay.',
    nextAttemptFocus:
      'Swing wider toward the right cones before turning left into the bay.',
  },
  {
    id: 'kb-fwdbay-kerb-stop',
    challengeId: 'forward-bay',
    obstacleIdPattern: 'fwdbay-kerb-stop',
    obstacleKind: 'kerb',
    applicableDirections: ['forward'],
    applicableCauseTags: ['kerb-overrun', 'excessive-forward-speed'],
    title: 'Forward Bay: Front Stop Kerb',
    searchKeywords:
      'forward-bay fwdbay-kerb-stop kerb front-bumper nose-in stop distance',
    guidanceText:
      'Drove too deep into the bay and hit the front wheel-stop kerb.',
    correctiveAction:
      'Coast below 2.5 mph entering the bay and press `Space` once all 4 corners are inside.',
    nextAttemptFocus:
      'Ease off `W` halfway into the bay and brake before the front kerb.',
  },

  // =========================================================================
  // 4. ANGLED BAY PARKING (`angled-bay`)
  // =========================================================================
  {
    id: 'kb-angled-bay-cars',
    challengeId: 'angled-bay',
    obstacleIdPattern: 'angled-car',
    obstacleKind: 'parked-car',
    applicableDirections: ['forward', 'reverse'],
    applicableCauseTags: [
      'early-turn-in-clip',
      'late-steering-correction',
      'insufficient-lateral-clearance',
    ],
    title: 'Angled Bay: 45° Diagonal Entry',
    searchKeywords:
      'angled-bay angled-car-north angled-car-south 45 degree diagonal echelon bay clip',
    guidanceText:
      'Over-steered or turned too late for the 45° diagonal bay angle.',
    correctiveAction:
      'Use a gentle 45° left turn at the bay mouth and straighten the wheels as soon as you align with the lines.',
    nextAttemptFocus:
      'Use half left lock to match the 45° angle and straighten early.',
  },
  {
    id: 'kb-angled-kerb-edge',
    challengeId: 'angled-bay',
    obstacleIdPattern: 'angled-kerb-edge',
    obstacleKind: 'kerb',
    applicableDirections: ['forward'],
    applicableCauseTags: ['kerb-overrun', 'excessive-forward-speed'],
    title: 'Angled Bay: Front Kerb Clearance',
    searchKeywords:
      'angled-bay angled-kerb-edge kerb front-left-corner diagonal stop',
    guidanceText:
      'Front-left corner reached the front kerb before braking.',
    correctiveAction:
      'Stop as soon as the HUD Bay Distance drops below 0.35 m.',
    nextAttemptFocus:
      'Brake early before your front-left corner touches the front kerb.',
  },

  // =========================================================================
  // 5. PULL UP ON THE RIGHT & REVERSE (`pull-up-right`)
  // =========================================================================
  {
    id: 'kb-pullright-kerb-right',
    challengeId: 'pull-up-right',
    obstacleIdPattern: 'pullright-kerb-right',
    obstacleKind: 'kerb',
    applicableDirections: ['forward', 'reverse'],
    applicableCauseTags: ['kerb-overrun', 'late-steering-correction'],
    title: 'Pull Up on Right: Parallel Kerb Control',
    searchKeywords:
      'pull-up-right pullright-kerb-right kerb right roadside parallel reverse straight',
    guidanceText:
      'Angled into the right-hand kerb instead of straightening parallel.',
    correctiveAction:
      'Straighten your wheels (`0°`) parallel to the right kerb before stopping and keep steering straight while reversing.',
    nextAttemptFocus:
      'Straighten wheels to 0° parallel with the kerb before reversing.',
  },
  {
    id: 'kb-pullright-car-ahead',
    challengeId: 'pull-up-right',
    obstacleIdPattern: 'pullright-car-ahead',
    obstacleKind: 'parked-car',
    applicableDirections: ['forward'],
    applicableCauseTags: ['excessive-forward-speed', 'late-steering-correction'],
    title: 'Pull Up on Right: Forward Car Stopping Gap',
    searchKeywords:
      'pull-up-right pullright-car-ahead parked-car forward stage 1 stop distance',
    guidanceText:
      'Drove past the forward pull-up zone into the parked car ahead.',
    correctiveAction:
      'Stop inside the amber forward box at least 3 m behind the parked car ahead before reversing.',
    nextAttemptFocus:
      'Stop inside the amber Stage 1 box well behind the car ahead.',
  },

  // =========================================================================
  // 6. CROSS-CHALLENGE CONE & SPEED KINEMATICS GUIDANCE
  // =========================================================================
  {
    id: 'kb-general-lane-cone-strike',
    challengeId: 'all',
    obstacleKind: 'cone',
    applicableDirections: ['forward', 'reverse'],
    applicableCauseTags: [
      'insufficient-lateral-clearance',
      'front-swing-clip-during-reverse',
      'late-steering-correction',
    ],
    title: 'Lane Boundary Cone Clearance',
    searchKeywords:
      'cone traffic-cone boundary aisle swing wide clearance',
    guidanceText:
      'Swung too wide across the outer lane cone line.',
    correctiveAction:
      'Keep a 0.5 m buffer inside the cones and slow down to tighten your turning circle.',
    nextAttemptFocus:
      'Stay ~0.5 m inside the cone line during your approach swing.',
  },
  {
    id: 'kb-general-high-reverse-speed',
    challengeId: 'all',
    obstacleKind: 'all',
    applicableDirections: ['reverse'],
    applicableCauseTags: ['excessive-reverse-speed'],
    title: 'Reverse Speed Control',
    searchKeywords:
      'reverse speed fast excessive-reverse-speed braking momentum control',
    guidanceText:
      'Reversed too quickly to adjust steering in time.',
    correctiveAction:
      'Feather `S` / `↓` to keep reverse speed under 3.0 mph and use `Space` to stop.',
    nextAttemptFocus:
      'Keep reverse speed below 3.0 mph for tighter control.',
  },
];
