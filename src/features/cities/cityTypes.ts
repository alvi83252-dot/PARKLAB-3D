/**
 * PARKLAB 3D — Real-Earth Cities & Free Roam World Types
 */

import type { ObstacleDefinition, Vec3 } from '../../types/challenge.types';

export type SimulationMode = 'challenges' | 'freeroam';

export interface CityRoadSpec {
  id: string;
  name: string;
  center: [number, number]; // [x, z] in metres
  width: number;
  length: number;
  rotationY: number;
  lanes?: number;
  hasMedian?: boolean;
}

export interface CityRoundaboutSpec {
  id: string;
  name: string;
  center: [number, number]; // [x, z]
  outerRadius: number;
  islandRadius: number;
}

export interface CityBuildingSpec {
  id: string;
  name: string;
  position: Vec3;
  dimensions: [number, number, number]; // [width, height, depth]
  rotationY?: number;
  primaryColor: string;
  secondaryColor: string;
  glassColor: string;
  accentColor: string;
  roofStyle?: 'flat' | 'pyramid' | 'clocktower' | 'column' | 'spire' | 'dome' | 'wheel' | 'cylinder';
}

export interface CityParkedVehicleSpec {
  id: string;
  label: string;
  kind: 'sedan' | 'suv' | 'hatchback' | 'london-bus' | 'black-cab' | 'nyc-cab' | 'roadster';
  position: Vec3;
  rotationY: number;
  dimensions: { length: number; width: number; height: number };
  color: string;
}

export interface CityParkingBaySpec {
  id: string;
  streetName: string;
  position: Vec3;
  rotationY: number;
  dimensions: { width: number; length: number };
}

export interface CityStreetSignSpec {
  id: string;
  text: string;
  subtext?: string;
  position: Vec3;
  rotationY: number;
}

export interface RealCityLocation {
  id: string;
  name: string;
  region: string;
  country: string;
  postcode?: string;
  /** Real Earth WGS84 Latitude */
  lat: number;
  /** Real Earth WGS84 Longitude */
  lng: number;
  description: string;
  /** Driving side of the road ('left' for UK/Japan, 'right' for US/Europe) */
  trafficSide: 'left' | 'right';
  /** Player spawn position [x, y, z] in local city space */
  spawnPosition: Vec3;
  /** Player spawn heading rotation in radians */
  spawnRotationY: number;
  /** Street network segments */
  roads: CityRoadSpec[];
  /** Roundabout junctions */
  roundabouts: CityRoundaboutSpec[];
  /** Real-world inspired buildings & landmarks */
  buildings: CityBuildingSpec[];
  /** Parked cars, buses, and taxis along the streets */
  parkedVehicles: CityParkedVehicleSpec[];
  /** Optional Free Roam parking bays players can practice parking into */
  parkingBays: CityParkingBaySpec[];
  /** Street name plates and direction signs */
  streetSigns: CityStreetSignSpec[];
  /** Pre-computed physical collision obstacles for all buildings, islands, and parked vehicles */
  obstacles: ObstacleDefinition[];
  /** Whether this city was generated from live OSM / custom coordinates */
  isCustomSearch?: boolean;
  /** Source label ('Preset City' | 'OpenStreetMap Live' | 'Coordinate Synthesis') */
  sourceLabel?: string;
}
