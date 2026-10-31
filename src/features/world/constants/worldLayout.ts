import type {
  BuildingSpec,
  DecorativeVehicleSpec,
  ParkingBayZoneSpec,
  StreetlightSpec,
  TrafficSignSpec,
  TreePlanterSpec,
} from '../world.types';

/**
 * Overall world dimensions and active manoeuvring boundaries (in metres).
 * Central region [-30, 30] x [-30, 30] is kept clear of physical static 3D props
 * so all five UK driving test challenge layouts operate without obstruction.
 */
export const WORLD_BOUNDS = {
  asphaltWidth: 110,
  asphaltDepth: 110,
  outerGroundSize: 280,
  kerbHeight: 0.14,
  activeArenaHalfExtent: 30,
} as const;

/**
 * Stationary decorative parked vehicles positioned in perimeter bays (outside [-30, 30]).
 * Includes a showcase New Tesla Roadster as required by Specification 1.3 & 4.3.
 */
export const DECORATIVE_PARKED_VEHICLES: DecorativeVehicleSpec[] = [
  {
    id: 'env-tesla-roadster-hero',
    name: 'New Tesla Roadster (Showcase)',
    kind: 'tesla-roadster',
    position: [-36.5, 0, -14.0],
    rotationY: Math.PI / 2,
    dimensions: { length: 4.52, width: 1.96, height: 1.23 },
    bodyColor: '#c8102e',
    accentColor: '#38bdf8',
    plateText: 'PRK R0AD',
    isShowcase: true,
  },
  {
    id: 'env-tesla-roadster-midnight',
    name: 'New Tesla Roadster (Founders Series)',
    kind: 'tesla-roadster',
    position: [36.5, 0, -16.5],
    rotationY: -Math.PI / 2,
    dimensions: { length: 4.52, width: 1.96, height: 1.23 },
    bodyColor: '#1e293b',
    accentColor: '#60a5fa',
    plateText: 'EV 2026',
  },
  {
    id: 'env-sedan-executive-1',
    name: 'Executive Saloon',
    kind: 'sedan',
    position: [-36.5, 0, -6.5],
    rotationY: Math.PI / 2,
    dimensions: { length: 4.82, width: 1.86, height: 1.44 },
    bodyColor: '#334155',
    plateText: 'UK74 EXS',
  },
  {
    id: 'env-suv-large-1',
    name: 'Large Luxury SUV',
    kind: 'suv',
    position: [-36.5, 0, 3.5],
    rotationY: Math.PI / 2,
    dimensions: { length: 4.92, width: 1.98, height: 1.76 },
    bodyColor: '#0f172a',
    plateText: 'PK25 SUV',
  },
  {
    id: 'env-hatchback-1',
    name: 'Modern UK Hatchback',
    kind: 'hatchback',
    position: [-36.5, 0, 11.0],
    rotationY: Math.PI / 2,
    dimensions: { length: 4.08, width: 1.78, height: 1.46 },
    bodyColor: '#2563eb',
    plateText: 'DV24 LRN',
  },
  {
    id: 'env-suv-large-2',
    name: 'All-Terrain SUV',
    kind: 'suv',
    position: [36.5, 0, -6.5],
    rotationY: -Math.PI / 2,
    dimensions: { length: 4.92, width: 1.98, height: 1.76 },
    bodyColor: '#475569',
    plateText: 'LB73 AWD',
  },
  {
    id: 'env-sedan-executive-2',
    name: 'Touring Sedan',
    kind: 'sedan',
    position: [36.5, 0, 6.0],
    rotationY: -Math.PI / 2,
    dimensions: { length: 4.82, width: 1.86, height: 1.44 },
    bodyColor: '#e2e8f0',
    plateText: 'GL26 TRD',
  },
  {
    id: 'env-hatchback-2',
    name: 'City Hatchback',
    kind: 'hatchback',
    position: [36.5, 0, 13.5],
    rotationY: -Math.PI / 2,
    dimensions: { length: 4.08, width: 1.78, height: 1.46 },
    bodyColor: '#0d9488',
    plateText: 'CT25 HCH',
  },
  {
    id: 'env-sedan-north-1',
    name: 'Executive Saloon',
    kind: 'sedan',
    position: [-14.5, 0, -37.5],
    rotationY: 0,
    dimensions: { length: 4.82, width: 1.86, height: 1.44 },
    bodyColor: '#64748b',
    plateText: 'NR24 SAL',
  },
  {
    id: 'env-hatchback-north-2',
    name: 'Compact Hatchback',
    kind: 'hatchback',
    position: [14.5, 0, -37.5],
    rotationY: 0,
    dimensions: { length: 4.08, width: 1.78, height: 1.46 },
    bodyColor: '#f59e0b',
    plateText: 'YL25 CMP',
  },
];

/**
 * Painted bay zones in the facility (both central reference zones and perimeter parking rows).
 */
export const PERIMETER_BAY_ZONES: ParkingBayZoneSpec[] = [
  {
    id: 'west-perpendicular-bays',
    label: 'West Perpendicular Bays',
    kind: 'perpendicular',
    origin: [-36.5, 0, -19.0],
    rotationY: Math.PI / 2,
    bayCount: 14,
    bayWidth: 2.75,
    bayLength: 5.2,
  },
  {
    id: 'east-perpendicular-bays',
    label: 'East Perpendicular Bays',
    kind: 'perpendicular',
    origin: [36.5, 0, -19.0],
    rotationY: -Math.PI / 2,
    bayCount: 14,
    bayWidth: 2.75,
    bayLength: 5.2,
  },
  {
    id: 'north-perpendicular-bays',
    label: 'North Test Centre Bays',
    kind: 'perpendicular',
    origin: [-19.25, 0, -37.5],
    rotationY: 0,
    bayCount: 15,
    bayWidth: 2.75,
    bayLength: 5.2,
  },
  {
    id: 'south-angled-bays',
    label: 'South Angled Bays',
    kind: 'angled',
    origin: [-16.5, 0, 36.5],
    rotationY: Math.PI,
    bayCount: 11,
    bayWidth: 2.8,
    bayLength: 5.2,
    angleRad: Math.PI / 4,
  },
];

/**
 * UK Road & Traffic Signs placed along pavements and islands.
 */
export const TRAFFIC_SIGNS: TrafficSignSpec[] = [
  {
    id: 'sign-ev-showcase',
    kind: 'ev-charging',
    position: [-40.2, 0, -14.0],
    rotationY: Math.PI / 2,
    label: 'TESLA EV BAY',
  },
  {
    id: 'sign-parking-west',
    kind: 'parking-zone',
    position: [-40.2, 0, -2.0],
    rotationY: Math.PI / 2,
    label: 'P',
  },
  {
    id: 'sign-parking-east',
    kind: 'parking-zone',
    position: [40.2, 0, -2.0],
    rotationY: -Math.PI / 2,
    label: 'P',
  },
  {
    id: 'sign-speed-north-west',
    kind: 'speed-limit-10',
    position: [-26.5, 0, -32.5],
    rotationY: 0,
    label: '10',
  },
  {
    id: 'sign-speed-south-east',
    kind: 'speed-limit-10',
    position: [26.5, 0, 32.5],
    rotationY: Math.PI,
    label: '10',
  },
  {
    id: 'sign-give-way-north',
    kind: 'give-way',
    position: [9.5, 0, -32.5],
    rotationY: 0,
  },
  {
    id: 'sign-give-way-south',
    kind: 'give-way',
    position: [-9.5, 0, 32.5],
    rotationY: Math.PI,
  },
  {
    id: 'sign-one-way-west',
    kind: 'one-way-arrow',
    position: [-32.5, 0, 24.0],
    rotationY: Math.PI / 2,
  },
  {
    id: 'sign-one-way-east',
    kind: 'one-way-arrow',
    position: [32.5, 0, -24.0],
    rotationY: -Math.PI / 2,
  },
];

/**
 * Architectural LED Streetlights positioned around the facility perimeter.
 */
export const STREETLIGHTS: StreetlightSpec[] = [
  { id: 'lamp-nw', position: [-41.5, 0, -26.0], rotationY: Math.PI / 2 },
  { id: 'lamp-w1', position: [-41.5, 0, -8.0], rotationY: Math.PI / 2 },
  { id: 'lamp-w2', position: [-41.5, 0, 10.0], rotationY: Math.PI / 2 },
  { id: 'lamp-sw', position: [-41.5, 0, 26.0], rotationY: Math.PI / 2 },
  { id: 'lamp-ne', position: [41.5, 0, -26.0], rotationY: -Math.PI / 2 },
  { id: 'lamp-e1', position: [41.5, 0, -8.0], rotationY: -Math.PI / 2 },
  { id: 'lamp-e2', position: [41.5, 0, 10.0], rotationY: -Math.PI / 2 },
  { id: 'lamp-se', position: [41.5, 0, 26.0], rotationY: -Math.PI / 2 },
  { id: 'lamp-n1', position: [-22.0, 0, -42.5], rotationY: 0, twinArm: true },
  { id: 'lamp-n2', position: [0.0, 0, -42.5], rotationY: 0, twinArm: true },
  { id: 'lamp-n3', position: [22.0, 0, -42.5], rotationY: 0, twinArm: true },
  { id: 'lamp-s1', position: [-22.0, 0, 42.5], rotationY: Math.PI, twinArm: true },
  { id: 'lamp-s2', position: [22.0, 0, 42.5], rotationY: Math.PI, twinArm: true },
];

/**
 * Surrounding architectural buildings framing the parking test facility.
 */
export const SURROUNDING_BUILDINGS: BuildingSpec[] = [
  {
    id: 'bldg-dvsa-test-centre',
    name: 'PARKLAB 3D — UK Driving Test & Assessment Centre',
    position: [0, 0, -56],
    dimensions: [42, 11.5, 16],
    primaryColor: '#1e293b',
    secondaryColor: '#334155',
    glassColor: '#38bdf8',
    accentColor: '#3b82f6',
    style: 'test-centre',
  },
  {
    id: 'bldg-north-west-deck',
    name: 'North-West Multi-Storey Car Park',
    position: [-42, 0, -56],
    dimensions: [28, 15, 18],
    primaryColor: '#27303f',
    secondaryColor: '#475569',
    glassColor: '#64748b',
    accentColor: '#f59e0b',
    style: 'parking-deck',
  },
  {
    id: 'bldg-north-east-tower',
    name: 'Mobility Innovation Hub',
    position: [42, 0, -56],
    dimensions: [28, 22, 18],
    primaryColor: '#172033',
    secondaryColor: '#334155',
    glassColor: '#0284c7',
    accentColor: '#38bdf8',
    style: 'office-tower',
  },
  {
    id: 'bldg-west-north',
    name: 'West Automotive Telemetry Wing',
    position: [-60, 0, -18],
    dimensions: [18, 14, 34],
    primaryColor: '#1f2937',
    secondaryColor: '#374151',
    glassColor: '#0ea5e9',
    accentColor: '#3b82f6',
    style: 'commercial-block',
  },
  {
    id: 'bldg-west-south',
    name: 'West Vehicle Dynamics Concourse',
    position: [-60, 0, 22],
    dimensions: [18, 17, 32],
    primaryColor: '#1e2530',
    secondaryColor: '#4b5563',
    glassColor: '#38bdf8',
    accentColor: '#10b981',
    style: 'office-tower',
  },
  {
    id: 'bldg-east-north',
    name: 'East Urban Mobility Deck',
    position: [60, 0, -18],
    dimensions: [18, 16, 34],
    primaryColor: '#262f3d',
    secondaryColor: '#475569',
    glassColor: '#64748b',
    accentColor: '#3b82f6',
    style: 'parking-deck',
  },
  {
    id: 'bldg-east-south',
    name: 'East Engineering Pavilions',
    position: [60, 0, 22],
    dimensions: [18, 13, 32],
    primaryColor: '#1e293b',
    secondaryColor: '#334155',
    glassColor: '#0284c7',
    accentColor: '#60a5fa',
    style: 'commercial-block',
  },
  {
    id: 'bldg-south-west',
    name: 'South-West Metropolitan Plaza',
    position: [-36, 0, 58],
    dimensions: [34, 15, 16],
    primaryColor: '#1e242d',
    secondaryColor: '#374151',
    glassColor: '#38bdf8',
    accentColor: '#3b82f6',
    style: 'commercial-block',
  },
  {
    id: 'bldg-south-east',
    name: 'South-East Commercial Centre',
    position: [36, 0, 58],
    dimensions: [34, 18, 16],
    primaryColor: '#172130',
    secondaryColor: '#334155',
    glassColor: '#0ea5e9',
    accentColor: '#38bdf8',
    style: 'office-tower',
  },
];

/**
 * Landscaped perimeter trees and planters.
 */
export const TREE_PLANTERS: TreePlanterSpec[] = [
  { id: 'tree-nw-1', position: [-44.5, 0, -34.0], scale: 1.1, treeType: 'round' },
  { id: 'tree-nw-2', position: [-44.5, 0, -18.0], scale: 0.95, treeType: 'conical' },
  { id: 'tree-sw-1', position: [-44.5, 0, 18.0], scale: 1.05, treeType: 'round' },
  { id: 'tree-sw-2', position: [-44.5, 0, 34.0], scale: 1.15, treeType: 'conical' },
  { id: 'tree-ne-1', position: [44.5, 0, -34.0], scale: 1.1, treeType: 'round' },
  { id: 'tree-ne-2', position: [44.5, 0, -18.0], scale: 1.0, treeType: 'conical' },
  { id: 'tree-se-1', position: [44.5, 0, 18.0], scale: 1.05, treeType: 'round' },
  { id: 'tree-se-2', position: [44.5, 0, 34.0], scale: 1.12, treeType: 'conical' },
  { id: 'tree-n-1', position: [-28.0, 0, -45.0], scale: 1.0, treeType: 'round' },
  { id: 'tree-n-2', position: [28.0, 0, -45.0], scale: 1.0, treeType: 'round' },
  { id: 'tree-s-1', position: [-28.0, 0, 45.0], scale: 1.1, treeType: 'conical' },
  { id: 'tree-s-2', position: [28.0, 0, 45.0], scale: 1.1, treeType: 'conical' },
];

import type { ObstacleDefinition } from '../../../types/challenge.types';

/**
 * Physical collision obstacles for the perimeter parked vehicles, buildings, and lamp posts
 * in the UK Driving Test Facility so crashing into any facility object triggers real crash physics.
 */
export const FACILITY_STATIC_OBSTACLES: ObstacleDefinition[] = [
  ...DECORATIVE_PARKED_VEHICLES.map((v) => ({
    id: `facility-car-${v.id}`,
    kind: 'parked-car' as const,
    label: v.name,
    position: v.position,
    rotationY: v.rotationY,
    dimensions: v.dimensions,
    color: v.bodyColor,
  })),
  ...SURROUNDING_BUILDINGS.map((b) => ({
    id: `facility-bldg-${b.id}`,
    kind: 'building' as const,
    label: b.name,
    position: b.position,
    rotationY: b.rotationY ?? 0,
    dimensions: {
      width: b.dimensions[0],
      height: b.dimensions[1],
      length: b.dimensions[2],
    },
    color: b.primaryColor,
  })),
  ...STREETLIGHTS.map((l) => ({
    id: `facility-lamp-${l.id}`,
    kind: 'lamppost' as const,
    label: 'Streetlight Column',
    position: l.position,
    rotationY: l.rotationY,
    dimensions: { width: 0.45, height: 6.5, length: 0.45 },
  })),
];
