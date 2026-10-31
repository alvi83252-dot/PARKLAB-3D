/**
 * PARKLAB 3D — Static RAG Parking & Obstacle Knowledge Base
 *
 * Grounded directly in the repository's `CHALLENGES` definitions and obstacle
 * geometry (`src/features/challenges/challengesData.ts`). Provides structured,
 * retrievable coaching documents for hybrid TF-IDF + feature similarity search.
 */

import type { ObstacleDefinition } from '../challenges/types';
import type { StaticGuidanceDocument } from './crashRagTypes';

const OBSTACLE_LABELS_BY_ID: Record<string, string> = {
  // Parallel Parking
  'parallel-car-front': 'Front Reference Parked Car (parallel-car-front)',
  'parallel-car-rear': 'Rear Boundary Parked Car (parallel-car-rear)',
  'parallel-kerb-left': 'Left Roadside Kerbstone (parallel-kerb-left)',
  'parallel-cone-north': 'North Lane Boundary Cone (parallel-cone-north)',
  'parallel-cone-mid': 'Mid-Lane Boundary Cone (parallel-cone-mid)',
  'parallel-cone-south': 'South Lane Boundary Cone (parallel-cone-south)',

  // Reverse Bay Parking
  'revbay-car-left': 'North-Side Adjacent Bay Car (revbay-car-left)',
  'revbay-car-right': 'South-Side Adjacent Bay Car (revbay-car-right)',
  'revbay-kerb-back': 'Rear Bay Stop Kerb (revbay-kerb-back)',
  'revbay-cone-north': 'Opposite Aisle North Cone (revbay-cone-north)',
  'revbay-cone-south': 'Opposite Aisle South Cone (revbay-cone-south)',

  // Forward Bay Parking
  'fwdbay-car-north': 'North Adjacent Bay Car (fwdbay-car-north)',
  'fwdbay-car-south': 'South Entry-Side Bay Car (fwdbay-car-south)',
  'fwdbay-kerb-stop': 'Forward Bay Rear Wheel-Stop Kerb (fwdbay-kerb-stop)',
  'fwdbay-cone-entry-1': 'Approach Swing Guide Cone 1 (fwdbay-cone-entry-1)',
  'fwdbay-cone-entry-2': 'Approach Swing Guide Cone 2 (fwdbay-cone-entry-2)',

  // Angled Bay Parking
  'angled-car-north': 'Far-Side Echelon Parked Car (angled-car-north)',
  'angled-car-south': 'Near-Side Echelon Parked Car (angled-car-south)',
  'angled-kerb-edge': 'Diagonal Bay Front Kerb Edge (angled-kerb-edge)',
  'angled-cone-1': 'One-Way Lane South Cone (angled-cone-1)',
  'angled-cone-2': 'One-Way Lane North Cone (angled-cone-2)',

  // Pull Up on the Right & Reverse
  'pullright-kerb-right': 'Right-Hand Roadside Kerb (pullright-kerb-right)',
  'pullright-kerb-left': 'Left-Hand Lane Kerb (pullright-kerb-left)',
  'pullright-car-ahead': 'Forward Right-Side Parked Car (pullright-car-ahead)',
  'pullright-car-opposite': 'Opposite Left-Lane Parked Car (pullright-car-opposite)',
  'pullright-cone-pullup': 'Stage 1 Pull-Up Marker Cone (pullright-cone-pullup)',
  'pullright-cone-finish': 'Assessment Zone Marker Cone (pullright-cone-finish)',

  // World Boundary
  'world-boundary': 'Arena Perimeter Boundary (world-boundary)',
};

export function getObstacleReadableLabel(obstacle: ObstacleDefinition): string {
  if (OBSTACLE_LABELS_BY_ID[obstacle.id]) {
    return OBSTACLE_LABELS_BY_ID[obstacle.id];
  }
  switch (obstacle.kind) {
    case 'parked-car':
      return `Parked Vehicle (${obstacle.id})`;
    case 'cone':
      return `Traffic Cone (${obstacle.id})`;
    case 'kerb':
      return `Kerbstone (${obstacle.id})`;
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
    title: 'Parallel Park: Front Reference Car Clearance & S-Turn Pivot',
    searchKeywords:
      'parallel parking parallel-car-front parked-car reverse s-turn front-right-corner rear-left-corner bumper clip swing clearance',
    guidanceText:
      'In Parallel Parking, `parallel-car-front` at [-3.2, 0, -5.8] is your pivot vehicle. Starting closer than 0.6 m laterally or applying left reverse lock before your rear axle reaches the parked car’s rear bumper (-3.55 m Z) causes your rear-left or front-right nose to clip its bumper.',
    correctiveAction:
      'Line up parallel to `parallel-car-front` with a 0.7–1.0 m lateral gap (`x ≈ -1.0` to `-0.8`). Reverse straight back until your rear wheels align with its rear bumper, steer left to ~45°, then wait until your front bumper clears its rear corner before counter-steering right.',
    nextAttemptFocus:
      'Keep a wider 0.8 m parallel gap alongside the front car and pause to check front-corner clearance before counter-steering right.',
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
    title: 'Parallel Park: Initial Pull-Up Positioning Alongside Front Car',
    searchKeywords:
      'parallel parking parallel-car-front forward pull-up approach side clearance front-left-corner',
    guidanceText:
      'While pulling forward to set up for Parallel Parking, steering too close to `parallel-car-front` (`x = -3.2`) leaves no room for the outward nose swing when reversing.',
    correctiveAction:
      'Stay in the main driving lane (`x ≈ -0.8`) while pulling up alongside the front blue car so there is roughly one door-width (0.8 m) between the vehicles.',
    nextAttemptFocus:
      'Drive straight forward along `x = -0.8` and stop level with the front car without angling toward it.',
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
    title: 'Parallel Park: Rear Boundary Vehicle Depth Control',
    searchKeywords:
      'parallel parking parallel-car-rear reverse backing depth rear-bumper rear-left-corner',
    guidanceText:
      'The rear parked vehicle (`parallel-car-rear` at `z = +5.8`) marks the back limit of the 6.4 m bay. Reversing too deep or failing to counter-steer right early enough carries the rear bumper beyond `z = +3.2` into the rear car.',
    correctiveAction:
      'Begin your right counter-steer as soon as the rear-left tyre is ~0.5 m from the left kerb, and feather the throttle/brake below 2.5 mph to stop centered at `z = 0`.',
    nextAttemptFocus:
      'Switch to Overhead Camera (`C`) during the final straightening phase to judge rear bumper clearance.',
  },
  {
    id: 'kb-parallel-kerb-left',
    challengeId: 'parallel',
    obstacleIdPattern: 'parallel-kerb-left',
    obstacleKind: 'kerb',
    applicableDirections: ['reverse', 'forward'],
    applicableCauseTags: ['kerb-overrun', 'late-steering-correction'],
    title: 'Parallel Park: Left Roadside Kerb Strike Prevention',
    searchKeywords:
      'parallel parking parallel-kerb-left kerb strike overrun rear-left-corner counter-steer',
    guidanceText:
      'The left kerb face lies at `x = -4.40 m`. Holding left steering lock too long while reversing at ~45° drives the rear-left wheel directly into `parallel-kerb-left` before the car is parallel.',
    correctiveAction:
      'Start unwinding left lock and steering briskly to the right when your rear-left corner is still 0.35–0.45 m away from the kerb so the car swings parallel without touching the stone.',
    nextAttemptFocus:
      'Begin counter-steering right half a car-length earlier as you approach the left kerb.',
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
    title: 'Reverse Bay Park: 90° Turning Arc & Adjacent Bay Vehicle Clearance',
    searchKeywords:
      'reverse-bay revbay-car-left revbay-car-right parked-car perpendicular 90 bay clip corner turning arc',
    guidanceText:
      'The target bay at `[5.5, 0, 0]` is flanked by `revbay-car-left` (`z = -2.95`) and `revbay-car-right` (`z = +2.95`). Turning right too early clips `revbay-car-right`, while overshooting the turn-in point or reversing too fast clips `revbay-car-left`.',
    correctiveAction:
      'Drive forward past the target bay until your rear bumper is roughly aligned with the northern line of `revbay-car-left` (`z ≈ -3.0`), angle slightly left in the aisle, then reverse slowly (< 3 mph) under right lock while watching both side mirrors.',
    nextAttemptFocus:
      'Pull 1.5–2 car lengths past the bay before reversing and keep reverse speed under 3 mph so you can adjust steering mid-arc.',
  },
  {
    id: 'kb-revbay-rear-kerb',
    challengeId: 'reverse-bay',
    obstacleIdPattern: 'revbay-kerb-back',
    obstacleKind: 'kerb',
    applicableDirections: ['reverse'],
    applicableCauseTags: ['kerb-overrun', 'excessive-reverse-speed'],
    title: 'Reverse Bay Park: Rear Stop Kerb Braking Point',
    searchKeywords:
      'reverse-bay revbay-kerb-back kerb rear bumper stop depth',
    guidanceText:
      'The rear bay kerb (`revbay-kerb-back`) sits at `x = +8.45 m`, just behind the 5.5 m bay boundary (`x = 8.25 m`). Continuing to reverse after all four corners enter the bay causes the rear bumper to strike the kerb.',
    correctiveAction:
      'Watch the HUD Bay Distance and `4/4 CORNERS IN BAY` indicator; brake to a complete standstill as the vehicle centre reaches `x ≈ 5.5 m` (`Bay Distance < 0.35 m`).',
    nextAttemptFocus:
      'Apply the brake (`W` or `Space`) as soon as the HUD chip turns green (`READY TO ASSESS`).',
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
    title: 'Forward Bay Park: Wide Approach Swing & Entry Corner Clearance',
    searchKeywords:
      'forward-bay fwdbay-car-north fwdbay-car-south parked-car nose-in swing wide turn left clip',
    guidanceText:
      'Driving forward into the 90° left bay at `[-5.5, 0, -1.5]` requires a wider swing than reversing because the rear axle cuts inside the turning circle (`fwdbay-car-south` at `z = +1.45`) while the front-right corner swings toward `fwdbay-car-north` (`z = -4.45`).',
    correctiveAction:
      'Position your vehicle toward the right side of the aisle (`x ≈ +1.5` to `+2.2`, near the entry cones) before turning left, and wait until your front mirrors pass `z = +1.0` before applying full left steering lock.',
    nextAttemptFocus:
      'Swing wider toward the right-hand guide cones before initiating your 90° left turn into the bay.',
  },
  {
    id: 'kb-fwdbay-kerb-stop',
    challengeId: 'forward-bay',
    obstacleIdPattern: 'fwdbay-kerb-stop',
    obstacleKind: 'kerb',
    applicableDirections: ['forward'],
    applicableCauseTags: ['kerb-overrun', 'excessive-forward-speed'],
    title: 'Forward Bay Park: Front Bumper Stop Kerb Clearance',
    searchKeywords:
      'forward-bay fwdbay-kerb-stop kerb front-bumper nose-in stop distance',
    guidanceText:
      'The wheel-stop kerb (`fwdbay-kerb-stop` at `x = -8.45 m`) marks the front limit of the bay. Approaching above 4 mph makes it easy to overshoot `x = -5.5 m` and hit the kerb with the front bumper.',
    correctiveAction:
      'Coast below 2.5 mph as your nose enters the bay and press `Space` (handbrake) or `S` once all four corners are inside the markings.',
    nextAttemptFocus:
      'Release throttle (`W`) halfway into the bay and brake smoothly before the front kerb.',
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
    title: 'Angled Bay Park: 45° Echelon Entry Trajectory',
    searchKeywords:
      'angled-bay angled-car-north angled-car-south 45 degree diagonal echelon bay clip',
    guidanceText:
      'The diagonal bay at `[-4.6, 0, -2.0]` is angled at 45° (`rotationY = π/4`) between `angled-car-south` (`z = +2.1`) and `angled-car-north` (`z = -6.1`). Over-steering past 45° clips the near car, whereas turning too late clips the far car.',
    correctiveAction:
      'Approach straight along `x ≈ 0`, apply a moderate half-left turn as your front bumper passes `z = +2.0`, and straighten the wheels as soon as your heading matches the 45° diagonal lines.',
    nextAttemptFocus:
      'Use only half left lock to match the 45° angle and straighten the wheels immediately upon entering the bay mouth.',
  },
  {
    id: 'kb-angled-kerb-edge',
    challengeId: 'angled-bay',
    obstacleIdPattern: 'angled-kerb-edge',
    obstacleKind: 'kerb',
    applicableDirections: ['forward'],
    applicableCauseTags: ['kerb-overrun', 'excessive-forward-speed'],
    title: 'Angled Bay Park: Diagonal Front Kerb Clearance',
    searchKeywords:
      'angled-bay angled-kerb-edge kerb front-left-corner diagonal stop',
    guidanceText:
      'Because the bay is angled at 45° against a straight kerb (`angled-kerb-edge` at `x = -7.8 m`), the front-left corner of the vehicle reaches the kerb first.',
    correctiveAction:
      'Monitor the front-left corner of your vehicle and stop when the HUD Bay Distance drops below 0.35 m.',
    nextAttemptFocus:
      'Brake early before the front-left corner reaches the perimeter kerb.',
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
    title: 'Pull Up on Right: Right-Hand Roadside Kerb Alignment & Straight Reverse',
    searchKeywords:
      'pull-up-right pullright-kerb-right kerb right roadside parallel reverse straight',
    guidanceText:
      'The right-hand kerb inner face sits at `x = +4.45 m`. Approaching the kerb at too steep an angle during Stage 1 or holding steering lock while reversing in Stage 2 drives the right-side tyres into `pullright-kerb-right`.',
    correctiveAction:
      'Shallow out your approach angle as you cross to `x ≈ +3.3 m`, bring the steering wheel to 0.0° (dead straight) before stopping at Stage 1, and keep steering neutral (`0°`) while reversing straight back into `[3.3, 0, 2.5]`.',
    nextAttemptFocus:
      'Fully straighten your wheels parallel to the right kerb before shifting into reverse.',
  },
  {
    id: 'kb-pullright-car-ahead',
    challengeId: 'pull-up-right',
    obstacleIdPattern: 'pullright-car-ahead',
    obstacleKind: 'parked-car',
    applicableDirections: ['forward'],
    applicableCauseTags: ['excessive-forward-speed', 'late-steering-correction'],
    title: 'Pull Up on Right: Stopping Distance Behind Forward Parked Car',
    searchKeywords:
      'pull-up-right pullright-car-ahead parked-car forward stage 1 stop distance',
    guidanceText:
      'The forward parked vehicle (`pullright-car-ahead` at `[3.3, 0, -9.8]`) sits ahead of the Stage 1 pull-up zone (`z ≈ -4.2`). Driving past the amber Stage 1 box leads to a front-end collision.',
    correctiveAction:
      'Stop inside the amber Stage 1 guide box around `z = -4.2` (at least 3 m behind `pullright-car-ahead`) before selecting reverse.',
    nextAttemptFocus:
      'Brake to a stop inside the amber forward guide zone (`z ≈ -4.2`) before the parked car ahead.',
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
    title: 'Aisle & Boundary Cone Clearance Management',
    searchKeywords:
      'cone traffic-cone boundary aisle swing wide clearance',
    guidanceText:
      'Traffic cones mark the outer edge of the legal manoeuvring corridor. Striking a cone indicates that your approach swing or front-end counter-swing exceeded the lane width.',
    correctiveAction:
      'Leave a 0.4–0.6 m buffer inside the cone line when swinging out for bay entry, and keep speed low so the vehicle’s turning radius stays tight.',
    nextAttemptFocus:
      'Use the guide cones as visual reference markers rather than driving right up against their bases.',
  },
  {
    id: 'kb-general-high-reverse-speed',
    challengeId: 'all',
    obstacleKind: 'all',
    applicableDirections: ['reverse'],
    applicableCauseTags: ['excessive-reverse-speed'],
    title: 'Low-Speed Reverse Control (Feathering Throttle)',
    searchKeywords:
      'reverse speed fast excessive-reverse-speed braking momentum control',
    guidanceText:
      'Reversing above 4.5 mph (2.0 m/s) during tight bay or parallel manoeuvres significantly increases stopping distance and causes the front end to swing faster than you can counter-steer.',
    correctiveAction:
      'Pulse (`feather`) the `S` / `↓` key to keep reverse speed between 1.5 mph and 3.2 mph, and use `Space` (handbrake) for immediate stopping inside the bay.',
    nextAttemptFocus:
      'Keep your reverse speed below 3.5 mph on the HUD speedometer throughout the turn.',
  },
];
