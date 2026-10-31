/**
 * PARKLAB 3D — Gamification, XP Points, Driver Rank & Global Leaderboard Store
 *
 * Provides:
 * - Persistent driver profile (Level, Rank Title, Total Points, Win Streak,
 *   Clean Parks, Highest SpaceX Flight Altitude, Best Challenge Scores).
 * - Rich Attempt Points Breakdown (Base Score + Time Blitz + Zero-Scratch Clean
 *   Bonus + Laser Precision Bonus + SpaceX Sky-Flight Airtime Bonus + Streak Multiplier).
 * - Competitive Leaderboard Standings featuring rival drivers from the 3D world
 *   (including ARTHUR [LV 85 PARK MASTER] and YUSUFDEMIR201 [LV 85 PARK MASTER]).
 */

import type {
  ParkingEvaluationResult,
  VehicleDefinition,
} from '../challenges/types';

const STORAGE_KEY = 'parklab3d_driver_profile_v1';

export interface DriverProfile {
  driverName: string;
  totalPoints: number;
  level: number;
  rankTitle: string;
  currentStreak: number;
  bestStreak: number;
  totalPasses: number;
  totalCleanParks: number;
  highestAltitudeMeters: number;
  bestPointsByChallenge: Record<string, number>;
}

export interface AttemptPointsBreakdown {
  basePoints: number;
  timeBlitzBonus: number;
  cleanCarBonus: number;
  precisionBonus: number;
  skyFlightBonus: number;
  maxAltitudeMeters: number;
  streakCount: number;
  streakMultiplier: number;
  totalEarnedPoints: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  newRankTitle: string;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  driverName: string;
  level: number;
  rankTitle: string;
  signatureVehicle: string;
  totalPoints: number;
  cleanParkRate: string;
  badgeColor: string;
  isPlayer?: boolean;
}

export function computeLevelFromPoints(points: number): number {
  const safe = Math.max(0, points);
  return Math.min(99, Math.max(1, Math.floor(safe / 850) + 1));
}

export function getRankTitleForLevel(level: number): string {
  if (level >= 90) return 'APEX LEGEND';
  if (level >= 75) return 'PARK MASTER';
  if (level >= 55) return 'GRAND TOURER PRO';
  if (level >= 35) return 'APEX SPECIALIST';
  if (level >= 18) return 'PRECISION DRIVER';
  return 'STREET ROOKIE';
}

const DEFAULT_PROFILE: DriverProfile = {
  driverName: 'PLAYER_01',
  totalPoints: 16400,
  level: computeLevelFromPoints(16400),
  rankTitle: getRankTitleForLevel(computeLevelFromPoints(16400)),
  currentStreak: 2,
  bestStreak: 2,
  totalPasses: 6,
  totalCleanParks: 5,
  highestAltitudeMeters: 0,
  bestPointsByChallenge: {
    parallel: 3850,
    'reverse-bay': 4120,
  },
};

export function loadDriverProfile(): DriverProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROFILE;
    }
    const parsed = JSON.parse(raw) as Partial<DriverProfile>;
    const totalPoints =
      typeof parsed.totalPoints === 'number'
        ? parsed.totalPoints
        : DEFAULT_PROFILE.totalPoints;
    const level = computeLevelFromPoints(totalPoints);
    return {
      driverName:
        typeof parsed.driverName === 'string' && parsed.driverName.trim()
          ? parsed.driverName.trim().toUpperCase()
          : DEFAULT_PROFILE.driverName,
      totalPoints,
      level,
      rankTitle: getRankTitleForLevel(level),
      currentStreak:
        typeof parsed.currentStreak === 'number'
          ? parsed.currentStreak
          : DEFAULT_PROFILE.currentStreak,
      bestStreak:
        typeof parsed.bestStreak === 'number'
          ? parsed.bestStreak
          : DEFAULT_PROFILE.bestStreak,
      totalPasses:
        typeof parsed.totalPasses === 'number'
          ? parsed.totalPasses
          : DEFAULT_PROFILE.totalPasses,
      totalCleanParks:
        typeof parsed.totalCleanParks === 'number'
          ? parsed.totalCleanParks
          : DEFAULT_PROFILE.totalCleanParks,
      highestAltitudeMeters:
        typeof parsed.highestAltitudeMeters === 'number'
          ? parsed.highestAltitudeMeters
          : 0,
      bestPointsByChallenge:
        parsed.bestPointsByChallenge &&
        typeof parsed.bestPointsByChallenge === 'object'
          ? parsed.bestPointsByChallenge
          : DEFAULT_PROFILE.bestPointsByChallenge,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveDriverProfile(profile: DriverProfile): DriverProfile {
  const level = computeLevelFromPoints(profile.totalPoints);
  const updated: DriverProfile = {
    ...profile,
    level,
    rankTitle: getRankTitleForLevel(level),
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota errors
    }
  }
  return updated;
}

export function updateDriverCallsign(newCallsign: string): DriverProfile {
  const current = loadDriverProfile();
  const sanitized = newCallsign.trim().toUpperCase().slice(0, 16) || 'PLAYER_01';
  return saveDriverProfile({
    ...current,
    driverName: sanitized,
  });
}

/**
 * Computes gamified points for a parking evaluation attempt and persists them
 * to the driver's profile.
 */
export function recordAttemptAndAwardPoints(
  challengeId: string,
  result: ParkingEvaluationResult,
  vehicle: VehicleDefinition,
  maxAltitudeMeters = 0
): {
  profile: DriverProfile;
  breakdown: AttemptPointsBreakdown;
} {
  const current = loadDriverProfile();
  const previousLevel = current.level;

  const nextStreak = result.passed ? current.currentStreak + 1 : 0;
  const bestStreak = Math.max(current.bestStreak, nextStreak);

  // 1. Base Accuracy Score Points (up to 2,500 PTS)
  const basePoints = Math.round(result.score * (result.passed ? 25 : 8));

  // 2. Time Blitz Bonus (fast completion under 65s when passed)
  const timeBlitzBonus = result.passed
    ? Math.max(0, Math.min(1200, Math.round((68 - result.elapsedSeconds) * 20)))
    : 0;

  // 3. Zero-Scratch Clean Car Bonus
  const cleanCarBonus =
    result.passed && result.collisions === 0 ? 1000 : 0;

  // 4. Laser Precision Alignment Bonus (< 0.25m & < 4.5 deg)
  const precisionBonus =
    result.passed &&
    result.positionErrorMeters <= 0.28 &&
    result.alignmentErrorDegrees <= 4.5
      ? 850
      : result.passed && result.stars === 3
        ? 450
        : 0;

  // 5. SpaceX Roadster Sky-Flight Landing Bonus
  const effectiveAltitude = Math.max(0, maxAltitudeMeters);
  const skyFlightBonus =
    vehicle.isFlyingVehicle && effectiveAltitude >= 1.2
      ? Math.min(
          2000,
          Math.round(effectiveAltitude * (result.passed ? 65 : 22))
        )
      : 0;

  // 6. Hot Streak Multiplier (up to 1.75x)
  const streakMultiplier = result.passed
    ? Number((1 + Math.min(5, nextStreak) * 0.15).toFixed(2))
    : 1.0;

  const rawSum =
    basePoints +
    timeBlitzBonus +
    cleanCarBonus +
    precisionBonus +
    skyFlightBonus;
  const totalEarnedPoints = Math.round(rawSum * streakMultiplier);

  const nextTotalPoints = current.totalPoints + totalEarnedPoints;
  const newLevel = computeLevelFromPoints(nextTotalPoints);
  const newRankTitle = getRankTitleForLevel(newLevel);

  const prevBestForChallenge = current.bestPointsByChallenge[challengeId] ?? 0;

  const updatedProfile = saveDriverProfile({
    ...current,
    totalPoints: nextTotalPoints,
    level: newLevel,
    rankTitle: newRankTitle,
    currentStreak: nextStreak,
    bestStreak,
    totalPasses: current.totalPasses + (result.passed ? 1 : 0),
    totalCleanParks:
      current.totalCleanParks +
      (result.passed && result.collisions === 0 ? 1 : 0),
    highestAltitudeMeters: Math.max(
      current.highestAltitudeMeters,
      Number(effectiveAltitude.toFixed(1))
    ),
    bestPointsByChallenge: {
      ...current.bestPointsByChallenge,
      [challengeId]: Math.max(prevBestForChallenge, totalEarnedPoints),
    },
  });

  return {
    profile: updatedProfile,
    breakdown: {
      basePoints,
      timeBlitzBonus,
      cleanCarBonus,
      precisionBonus,
      skyFlightBonus,
      maxAltitudeMeters: Number(effectiveAltitude.toFixed(1)),
      streakCount: nextStreak,
      streakMultiplier,
      totalEarnedPoints,
      previousLevel,
      newLevel,
      leveledUp: newLevel > previousLevel,
      newRankTitle,
    },
  };
}

const RIVAL_DRIVERS: Omit<LeaderboardEntry, 'rank'>[] = [
  {
    id: 'rival-arthur',
    driverName: 'ARTHUR',
    level: 85,
    rankTitle: 'PARK MASTER',
    signatureVehicle: 'Obsidian V12 Hypercar',
    totalPoints: 72450,
    cleanParkRate: '98.4%',
    badgeColor: '#f59e0b',
  },
  {
    id: 'rival-yusuf',
    driverName: 'YUSUFDEMIR201',
    level: 85,
    rankTitle: 'PARK MASTER',
    signatureVehicle: 'Mercedes-AMG GT R',
    totalPoints: 71890,
    cleanParkRate: '97.9%',
    badgeColor: '#38bdf8',
  },
  {
    id: 'rival-stig',
    driverName: 'VALKYRIE_UK',
    level: 72,
    rankTitle: 'GRAND TOURER PRO',
    signatureVehicle: 'New Tesla Roadster',
    totalPoints: 60800,
    cleanParkRate: '95.2%',
    badgeColor: '#ef4444',
  },
  {
    id: 'rival-taycan',
    driverName: 'KAI_STUTTGART',
    level: 56,
    rankTitle: 'GRAND TOURER PRO',
    signatureVehicle: 'Porsche Taycan 4S',
    totalPoints: 47200,
    cleanParkRate: '93.0%',
    badgeColor: '#a855f7',
  },
  {
    id: 'rival-elena',
    driverName: 'ELENA_RS',
    level: 38,
    rankTitle: 'APEX SPECIALIST',
    signatureVehicle: 'Mercedes-AMG GT R',
    totalPoints: 31900,
    cleanParkRate: '90.5%',
    badgeColor: '#10b981',
  },
  {
    id: 'rival-devon',
    driverName: 'DEVON_LDN',
    level: 22,
    rankTitle: 'PRECISION DRIVER',
    signatureVehicle: 'Executive Sedan',
    totalPoints: 18400,
    cleanParkRate: '87.0%',
    badgeColor: '#64748b',
  },
  {
    id: 'rival-marcus',
    driverName: 'MARCUS_GT',
    level: 14,
    rankTitle: 'STREET ROOKIE',
    signatureVehicle: 'Modern Hatchback',
    totalPoints: 11500,
    cleanParkRate: '82.1%',
    badgeColor: '#475569',
  },
];

export function getLeaderboardStandings(
  profile: DriverProfile = loadDriverProfile(),
  activeVehicleName = 'New Tesla Roadster'
): LeaderboardEntry[] {
  const cleanRate =
    profile.totalPasses > 0
      ? `${Math.min(
          100,
          Math.round((profile.totalCleanParks / profile.totalPasses) * 100)
        )}%`
      : '100%';

  const playerEntry: Omit<LeaderboardEntry, 'rank'> = {
    id: 'player-self',
    driverName: profile.driverName,
    level: profile.level,
    rankTitle: profile.rankTitle,
    signatureVehicle: activeVehicleName,
    totalPoints: profile.totalPoints,
    cleanParkRate: cleanRate,
    badgeColor: '#ef4444',
    isPlayer: true,
  };

  const combined = [...RIVAL_DRIVERS, playerEntry].sort(
    (a, b) => b.totalPoints - a.totalPoints
  );

  return combined.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}
