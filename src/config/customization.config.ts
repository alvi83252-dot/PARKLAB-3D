/**
 * PARKLAB 3D — Creative Car & Environment Customization System
 * Supports handcrafted 3D material/geometry skins (Wooden Toycraft, LEGO Brick-Built,
 * Origami Cardboard, Cyberpunk Holo-Grid, Translucent Candy Gummy, 24K Gold Chrome, Factory)
 * and full 3D Environment World Themes (UK Test Centre, Wooden Playset, LEGO Brick City,
 * Cyberpunk 2099, Candy Wonderland, SpaceX Mars Colony).
 */

import { useState, useEffect, useCallback } from 'react';

export type CarSkinId =
  | 'factory'
  | 'wooden'
  | 'lego'
  | 'cyberpunk'
  | 'cardboard'
  | 'gummy'
  | 'gold-chrome';

export type CarAccessoryId =
  | 'auto'
  | 'none'
  | 'windup-key'
  | 'lego-studs'
  | 'instructor-beacon'
  | 'paper-wings'
  | 'holo-halo';

export type EnvironmentThemeId =
  | 'uk-test-centre'
  | 'wooden-playset'
  | 'lego-brick-city'
  | 'cyber-neon-city'
  | 'candy-wonderland'
  | 'mars-colony';

export interface CarCustomization {
  skinId: CarSkinId;
  /** Optional custom hex color override; `'default'` uses the vehicle/skin signature palette */
  customColor: string;
  accessoryId: CarAccessoryId;
  underglowColor: string;
  applyToTraffic: boolean;
}

export interface CarSkinDefinition {
  id: CarSkinId;
  name: string;
  badge: string;
  shortDesc: string;
  primaryColor: string;
  secondaryColor: string;
  trimColor: string;
  glassColor: string;
  wheelRimColor: string;
  wheelTyreColor: string;
  metalness: number;
  roughness: number;
  glassMetalness: number;
  glassRoughness: number;
  opacity: number;
  wireframeOverlay?: boolean;
  wireframeColor?: string;
  defaultAccessory: Exclude<CarAccessoryId, 'auto'>;
}

export interface CarAccessoryDefinition {
  id: CarAccessoryId;
  name: string;
  badge: string;
}

export interface EnvironmentThemeDefinition {
  id: EnvironmentThemeId;
  name: string;
  badge: string;
  shortDesc: string;
  skyColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  sunColor: string;
  sunIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  hemiSkyColor: string;
  hemiGroundColor: string;
  hemiIntensity: number;
  sunDiscColor: string;
  outerGroundColor: string;
  apronColor: string;
  asphaltColor: string;
  roadLaneColor: string;
  laneMarkingColor: string;
  yellowLineColor: string;
  kerbColor: string;
  pavementColor: string;
  foliagePrimary: string;
  foliageSecondary: string;
  trunkColor: string;
  buildingPalette: [string, string, string, string];
  buildingGlassColor: string;
  buildingAccentColor: string;
  surfaceRoughness: number;
  surfaceMetalness: number;
}

export interface CreativeBundlePreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  skinId: CarSkinId;
  environmentId: EnvironmentThemeId;
  customColor: string;
  accessoryId: CarAccessoryId;
}

export const CAR_SKINS: readonly CarSkinDefinition[] = [
  {
    id: 'factory',
    name: 'Factory Carbon & Metallic',
    badge: 'OEM Spec',
    shortDesc: 'High-gloss automotive metallic clearcoat with carbon-fibre aero and smoked glass.',
    primaryColor: '#e11d48',
    secondaryColor: '#0f172a',
    trimColor: '#cbd5e1',
    glassColor: '#070b14',
    wheelRimColor: '#e2e8f0',
    wheelTyreColor: '#14171f',
    metalness: 0.72,
    roughness: 0.2,
    glassMetalness: 0.92,
    glassRoughness: 0.08,
    opacity: 1,
    defaultAccessory: 'none',
  },
  {
    id: 'wooden',
    name: 'Artisan Carved Woodcraft',
    badge: 'Wooden Toy',
    shortDesc: 'Hand-carved honey oak & walnut joinery planks, birch dowel wheels, and a spinning brass clockwork key.',
    primaryColor: '#c88a4b',
    secondaryColor: '#6f4518',
    trimColor: '#e9c496',
    glassColor: '#4a2c11',
    wheelRimColor: '#deb887',
    wheelTyreColor: '#5c3a21',
    metalness: 0.06,
    roughness: 0.68,
    glassMetalness: 0.15,
    glassRoughness: 0.52,
    opacity: 1,
    defaultAccessory: 'windup-key',
  },
  {
    id: 'lego',
    name: 'Brick-Built Block Toy',
    badge: 'LEGO® Style',
    shortDesc: 'Glossy ABS interlocking plastic bricks, 3D cylindrical top studs, stepped plate chassis, and toy-hub wheels.',
    primaryColor: '#ef4444',
    secondaryColor: '#facc15',
    trimColor: '#2563eb',
    glassColor: '#38bdf8',
    wheelRimColor: '#f8fafc',
    wheelTyreColor: '#1e293b',
    metalness: 0.08,
    roughness: 0.15,
    glassMetalness: 0.25,
    glassRoughness: 0.12,
    opacity: 1,
    defaultAccessory: 'lego-studs',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Holo-Grid',
    badge: '2099 Neon',
    shortDesc: 'Stealth obsidian chassis wrapped in an active glowing cyan/magenta wireframe matrix with levitating halo.',
    primaryColor: '#090d1a',
    secondaryColor: '#00f5d4',
    trimColor: '#f43f5e',
    glassColor: '#00bbf9',
    wheelRimColor: '#00f5d4',
    wheelTyreColor: '#050811',
    metalness: 0.88,
    roughness: 0.14,
    glassMetalness: 0.95,
    glassRoughness: 0.06,
    opacity: 1,
    wireframeOverlay: true,
    wireframeColor: '#00f5d4',
    defaultAccessory: 'holo-halo',
  },
  {
    id: 'cardboard',
    name: 'Origami Cardboard DIY',
    badge: 'Papercraft',
    shortDesc: 'Corrugated kraft boxboard panels held together with masking tape strips, marker doodles, and folded paper wings.',
    primaryColor: '#bf8f5a',
    secondaryColor: '#8c6239',
    trimColor: '#f3e5ab',
    glassColor: '#e2e8f0',
    wheelRimColor: '#d9b382',
    wheelTyreColor: '#6b4c35',
    metalness: 0.02,
    roughness: 0.88,
    glassMetalness: 0.05,
    glassRoughness: 0.78,
    opacity: 1,
    defaultAccessory: 'paper-wings',
  },
  {
    id: 'gummy',
    name: 'Translucent Jelly Gummy',
    badge: 'Candy Gel',
    shortDesc: 'Glossy translucent fruit-gummy shell with visible glowing inner candy core and sugar-coated pastel wheels.',
    primaryColor: '#ec4899',
    secondaryColor: '#a855f7',
    trimColor: '#fde047',
    glassColor: '#f9a8d4',
    wheelRimColor: '#fef08a',
    wheelTyreColor: '#db2777',
    metalness: 0.05,
    roughness: 0.08,
    glassMetalness: 0.1,
    glassRoughness: 0.06,
    opacity: 0.78,
    defaultAccessory: 'instructor-beacon',
  },
  {
    id: 'gold-chrome',
    name: '24K Royal Gold Chrome',
    badge: 'Hyper Luxe',
    shortDesc: 'Mirror-polished 24-karat gold bullion bodywork with platinum trim and diamond-tinted cockpit glass.',
    primaryColor: '#fbbf24',
    secondaryColor: '#b45309',
    trimColor: '#fef3c7',
    glassColor: '#1e1b4b',
    wheelRimColor: '#fde68a',
    wheelTyreColor: '#18181b',
    metalness: 0.98,
    roughness: 0.06,
    glassMetalness: 0.98,
    glassRoughness: 0.04,
    opacity: 1,
    defaultAccessory: 'holo-halo',
  },
] as const;

export const CAR_ACCESSORIES: readonly CarAccessoryDefinition[] = [
  { id: 'auto', name: 'Match Skin Signature', badge: 'Auto' },
  { id: 'none', name: 'Clean Roofline', badge: 'Minimal' },
  { id: 'windup-key', name: 'Spinning Clockwork Key', badge: 'Brass Wind-Up' },
  { id: 'lego-studs', name: 'Brick Stud Rack & Pennant', badge: 'Toy Studs' },
  { id: 'paper-wings', name: 'Origami Glider Fin & Tape', badge: 'Papercraft' },
  { id: 'holo-halo', name: 'Cyber Telemetry Halo Ring', badge: 'Sci-Fi' },
  { id: 'instructor-beacon', name: 'UK Test Roof Beacon & Cone', badge: 'DVSA Pro' },
] as const;

export const CUSTOM_PAINT_SWATCHES: readonly {
  id: string;
  label: string;
  hex: string;
}[] = [
  { id: 'default', label: 'Signature Skin Palette', hex: 'default' },
  { id: 'crimson', label: 'SpaceX Crimson', hex: '#e11d48' },
  { id: 'oak', label: 'Honey Oak Timber', hex: '#c88a4b' },
  { id: 'brick-red', label: 'Bright Brick Red', hex: '#ef4444' },
  { id: 'brick-yellow', label: 'Classic Toy Yellow', hex: '#facc15' },
  { id: 'cyber-cyan', label: 'Ion Thruster Cyan', hex: '#06b6d4' },
  { id: 'emerald', label: 'Racing Emerald', hex: '#10b981' },
  { id: 'gummy-pink', label: 'Bubblegum Jelly', hex: '#ec4899' },
  { id: 'amethyst', label: 'Nebula Violet', hex: '#8b5cf6' },
  { id: 'stealth', label: 'Obsidian Stealth', hex: '#111827' },
] as const;

export const ENVIRONMENT_THEMES: readonly EnvironmentThemeDefinition[] = [
  {
    id: 'uk-test-centre',
    name: 'UK DVSA Test Centre',
    badge: 'Realistic UK',
    shortDesc: 'Crisp British daytime sky, grey rolled tarmac, concrete kerbs, and glass test centre architecture.',
    skyColor: '#b8d4f0',
    fogColor: '#b8d4f0',
    fogNear: 95,
    fogFar: 235,
    sunColor: '#fffbeb',
    sunIntensity: 1.68,
    ambientColor: '#f8fafc',
    ambientIntensity: 0.55,
    hemiSkyColor: '#bae6fd',
    hemiGroundColor: '#334155',
    hemiIntensity: 0.58,
    sunDiscColor: '#fef9c3',
    outerGroundColor: '#1e242d',
    apronColor: '#334155',
    asphaltColor: '#262b35',
    roadLaneColor: '#1f242d',
    laneMarkingColor: '#f8fafc',
    yellowLineColor: '#eab308',
    kerbColor: '#94a3b8',
    pavementColor: '#475569',
    foliagePrimary: '#15803d',
    foliageSecondary: '#166534',
    trunkColor: '#5c4033',
    buildingPalette: ['#334155', '#1e293b', '#475569', '#0f172a'],
    buildingGlassColor: '#38bdf8',
    buildingAccentColor: '#0ea5e9',
    surfaceRoughness: 0.88,
    surfaceMetalness: 0.06,
  },
  {
    id: 'wooden-playset',
    name: 'Wooden Tabletop Playset',
    badge: 'Woodcraft World',
    shortDesc: 'Sanded birchwood track lanes, warm oak parquet floor, carved beechwood block buildings & wooden peg trees.',
    skyColor: '#fde68a',
    fogColor: '#fef3c7',
    fogNear: 90,
    fogFar: 230,
    sunColor: '#fff7ed',
    sunIntensity: 1.75,
    ambientColor: '#ffedd5',
    ambientIntensity: 0.68,
    hemiSkyColor: '#fef3c7',
    hemiGroundColor: '#92400e',
    hemiIntensity: 0.65,
    sunDiscColor: '#fbbf24',
    outerGroundColor: '#78350f',
    apronColor: '#b45309',
    asphaltColor: '#d69e5c',
    roadLaneColor: '#c08542',
    laneMarkingColor: '#fffbeb',
    yellowLineColor: '#9a3412',
    kerbColor: '#854d0e',
    pavementColor: '#e6be8a',
    foliagePrimary: '#65a30d',
    foliageSecondary: '#4d7c0f',
    trunkColor: '#78350f',
    buildingPalette: ['#d97706', '#b45309', '#f59e0b', '#92400e'],
    buildingGlassColor: '#fef3c7',
    buildingAccentColor: '#ea580c',
    surfaceRoughness: 0.72,
    surfaceMetalness: 0.04,
  },
  {
    id: 'lego-brick-city',
    name: 'Brick-Built Toyland City',
    badge: 'LEGO® World',
    shortDesc: 'Classic green studded baseplates, modular ABS plastic road tiles, primary brick towers, and 3D stud decorations.',
    skyColor: '#7dd3fc',
    fogColor: '#bae6fd',
    fogNear: 100,
    fogFar: 245,
    sunColor: '#ffffff',
    sunIntensity: 1.85,
    ambientColor: '#f0f9ff',
    ambientIntensity: 0.7,
    hemiSkyColor: '#7dd3fc',
    hemiGroundColor: '#15803d',
    hemiIntensity: 0.68,
    sunDiscColor: '#facc15',
    outerGroundColor: '#15803d',
    apronColor: '#16a34a',
    asphaltColor: '#475569',
    roadLaneColor: '#334155',
    laneMarkingColor: '#f8fafc',
    yellowLineColor: '#facc15',
    kerbColor: '#ef4444',
    pavementColor: '#cbd5e1',
    foliagePrimary: '#22c55e',
    foliageSecondary: '#16a34a',
    trunkColor: '#854d0e',
    buildingPalette: ['#ef4444', '#facc15', '#2563eb', '#16a34a'],
    buildingGlassColor: '#bae6fd',
    buildingAccentColor: '#facc15',
    surfaceRoughness: 0.22,
    surfaceMetalness: 0.08,
  },
  {
    id: 'cyber-neon-city',
    name: '2099 Synthwave Neon Grid',
    badge: 'Cyberpunk Night',
    shortDesc: 'Midnight synthwave sky, wet mirror-black obsidian roads, glowing cyan & magenta laser markings, and holo-towers.',
    skyColor: '#070514',
    fogColor: '#0c0724',
    fogNear: 75,
    fogFar: 210,
    sunColor: '#f43f5e',
    sunIntensity: 1.35,
    ambientColor: '#311042',
    ambientIntensity: 0.62,
    hemiSkyColor: '#ec4899',
    hemiGroundColor: '#090d16',
    hemiIntensity: 0.72,
    sunDiscColor: '#f43f5e',
    outerGroundColor: '#03040a',
    apronColor: '#090d1a',
    asphaltColor: '#0b0f1d',
    roadLaneColor: '#060813',
    laneMarkingColor: '#00f5d4',
    yellowLineColor: '#f43f5e',
    kerbColor: '#7c3aed',
    pavementColor: '#111827',
    foliagePrimary: '#00f5d4',
    foliageSecondary: '#a855f7',
    trunkColor: '#1e1b4b',
    buildingPalette: ['#090d1a', '#0f172a', '#131129', '#0b132b'],
    buildingGlassColor: '#00f5d4',
    buildingAccentColor: '#f43f5e',
    surfaceRoughness: 0.24,
    surfaceMetalness: 0.65,
  },
  {
    id: 'candy-wonderland',
    name: 'Sugar Rush Candy Park',
    badge: 'Sweet Frosting',
    shortDesc: 'Cotton-candy pink skies, chocolate-fudge tarmac, strawberry wafer kerbs, and giant lollipop trees.',
    skyColor: '#fbcfe8',
    fogColor: '#fce7f3',
    fogNear: 90,
    fogFar: 230,
    sunColor: '#fff1f2',
    sunIntensity: 1.72,
    ambientColor: '#fdf2f8',
    ambientIntensity: 0.68,
    hemiSkyColor: '#f9a8d4',
    hemiGroundColor: '#701a75',
    hemiIntensity: 0.62,
    sunDiscColor: '#fef08a',
    outerGroundColor: '#831843',
    apronColor: '#f472b6',
    asphaltColor: '#451a03',
    roadLaneColor: '#3b1502',
    laneMarkingColor: '#fdf2f8',
    yellowLineColor: '#fde047',
    kerbColor: '#f9a8d4',
    pavementColor: '#fbcfe8',
    foliagePrimary: '#ec4899',
    foliageSecondary: '#a855f7',
    trunkColor: '#fde047',
    buildingPalette: ['#f472b6', '#c084fc', '#38bdf8', '#fb923c'],
    buildingGlassColor: '#fef08a',
    buildingAccentColor: '#ec4899',
    surfaceRoughness: 0.35,
    surfaceMetalness: 0.05,
  },
  {
    id: 'mars-colony',
    name: 'SpaceX Mars Base Alpha',
    badge: 'Red Planet',
    shortDesc: 'Butterscotch Martian dust sky, iron-oxide red regolith craters, pressurized habitat domes, and landing pad beacons.',
    skyColor: '#d97742',
    fogColor: '#c25e2e',
    fogNear: 80,
    fogFar: 215,
    sunColor: '#ffedd5',
    sunIntensity: 1.65,
    ambientColor: '#fed7aa',
    ambientIntensity: 0.58,
    hemiSkyColor: '#fdba74',
    hemiGroundColor: '#7c2d12',
    hemiIntensity: 0.64,
    sunDiscColor: '#fff7ed',
    outerGroundColor: '#7c2d12',
    apronColor: '#9a3412',
    asphaltColor: '#27272a',
    roadLaneColor: '#18181b',
    laneMarkingColor: '#fb923c',
    yellowLineColor: '#38bdf8',
    kerbColor: '#b45309',
    pavementColor: '#57534e',
    foliagePrimary: '#38bdf8',
    foliageSecondary: '#0284c7',
    trunkColor: '#44403c',
    buildingPalette: ['#e2e8f0', '#cbd5e1', '#94a3b8', '#475569'],
    buildingGlassColor: '#fbbf24',
    buildingAccentColor: '#38bdf8',
    surfaceRoughness: 0.82,
    surfaceMetalness: 0.25,
  },
] as const;

export const CREATIVE_BUNDLES: readonly CreativeBundlePreset[] = [
  {
    id: 'bundle-default',
    name: 'Factory Spec + UK Test Centre',
    badge: 'Standard Sim',
    description: 'Authentic UK DVSA test centre with OEM metallic & carbon-fibre vehicles.',
    skinId: 'factory',
    environmentId: 'uk-test-centre',
    customColor: 'default',
    accessoryId: 'auto',
  },
  {
    id: 'bundle-woodcraft',
    name: 'Wooden Toy Car + Tabletop Playset',
    badge: 'Woodcraft',
    description: 'Hand-carved oak & walnut car with spinning wind-up key on a birchwood tabletop track.',
    skinId: 'wooden',
    environmentId: 'wooden-playset',
    customColor: 'default',
    accessoryId: 'windup-key',
  },
  {
    id: 'bundle-lego',
    name: 'LEGO® Brick Car + Studded Toyland',
    badge: 'Brick Builder',
    description: 'Interlocking studded plastic brick car on a giant green LEGO baseplate city.',
    skinId: 'lego',
    environmentId: 'lego-brick-city',
    customColor: 'default',
    accessoryId: 'lego-studs',
  },
  {
    id: 'bundle-cyberpunk',
    name: 'Holo-Grid Car + 2099 Neon City',
    badge: 'Synthwave',
    description: 'Obsidian wireframe vehicle with glowing cyber halo in a neon-drenched midnight grid.',
    skinId: 'cyberpunk',
    environmentId: 'cyber-neon-city',
    customColor: 'default',
    accessoryId: 'holo-halo',
  },
  {
    id: 'bundle-cardboard',
    name: 'Origami Cardboard + Tabletop',
    badge: 'Papercraft DIY',
    description: 'Corrugated cardboard box car with masking tape & folded paper wings.',
    skinId: 'cardboard',
    environmentId: 'wooden-playset',
    customColor: 'default',
    accessoryId: 'paper-wings',
  },
  {
    id: 'bundle-gummy',
    name: 'Jelly Gummy Car + Candy Park',
    badge: 'Sugar Rush',
    description: 'Translucent fruit-gummy car parked on chocolate tarmac with lollipop trees.',
    skinId: 'gummy',
    environmentId: 'candy-wonderland',
    customColor: 'default',
    accessoryId: 'instructor-beacon',
  },
  {
    id: 'bundle-mars',
    name: '24K Gold / Starman + Mars Colony',
    badge: 'SpaceX Mars',
    description: 'Park on SpaceX Mars Base Alpha surrounded by habitat domes and red regolith.',
    skinId: 'gold-chrome',
    environmentId: 'mars-colony',
    customColor: 'default',
    accessoryId: 'holo-halo',
  },
] as const;

export interface ParklabCustomizationState {
  car: CarCustomization;
  environmentId: EnvironmentThemeId;
}

export const DEFAULT_CUSTOMIZATION_STATE: ParklabCustomizationState = {
  car: {
    skinId: 'factory',
    customColor: 'default',
    accessoryId: 'auto',
    underglowColor: '#38bdf8',
    applyToTraffic: true,
  },
  environmentId: 'uk-test-centre',
};

const STORAGE_KEY = 'parklab3d_customization_v1';
const CUSTOMIZATION_EVENT = 'parklab3d:customization-change';

export function getCarSkinById(
  skinId?: CarSkinId | string | null
): CarSkinDefinition {
  return (
    CAR_SKINS.find((s) => s.id === skinId) ?? CAR_SKINS[0]
  );
}

export function getEnvironmentThemeById(
  themeId?: EnvironmentThemeId | string | null
): EnvironmentThemeDefinition {
  return (
    ENVIRONMENT_THEMES.find((t) => t.id === themeId) ?? ENVIRONMENT_THEMES[0]
  );
}

export function resolveEffectiveAccessory(
  car: CarCustomization
): Exclude<CarAccessoryId, 'auto'> {
  if (car.accessoryId !== 'auto') {
    return car.accessoryId;
  }
  return getCarSkinById(car.skinId).defaultAccessory;
}

export function loadCustomizationState(): ParklabCustomizationState {
  if (typeof window === 'undefined') {
    return DEFAULT_CUSTOMIZATION_STATE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CUSTOMIZATION_STATE;
    const parsed = JSON.parse(raw) as Partial<ParklabCustomizationState>;
    return {
      car: {
        ...DEFAULT_CUSTOMIZATION_STATE.car,
        ...(parsed.car ?? {}),
      },
      environmentId:
        parsed.environmentId &&
        ENVIRONMENT_THEMES.some((t) => t.id === parsed.environmentId)
          ? parsed.environmentId
          : DEFAULT_CUSTOMIZATION_STATE.environmentId,
    };
  } catch {
    return DEFAULT_CUSTOMIZATION_STATE;
  }
}

export function saveCustomizationState(state: ParklabCustomizationState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(
      new CustomEvent(CUSTOMIZATION_EVENT, { detail: state })
    );
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

/**
 * React hook that reads and updates the active Car & Environment customization
 * and keeps all mounted components synchronized in real time.
 */
export function useCustomization() {
  const [state, setState] = useState<ParklabCustomizationState>(() =>
    loadCustomizationState()
  );

  useEffect(() => {
    const handleStorageUpdate = (event: Event) => {
      const customEvt = event as CustomEvent<ParklabCustomizationState>;
      if (customEvt.detail) {
        setState(customEvt.detail);
      } else {
        setState(loadCustomizationState());
      }
    };
    window.addEventListener(CUSTOMIZATION_EVENT, handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener(CUSTOMIZATION_EVENT, handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const updateCustomization = useCallback(
    (
      updater:
        | Partial<ParklabCustomizationState>
        | ((prev: ParklabCustomizationState) => ParklabCustomizationState)
    ) => {
      setState((prev) => {
        const next =
          typeof updater === 'function'
            ? updater(prev)
            : {
                ...prev,
                ...updater,
                car: {
                  ...prev.car,
                  ...(updater.car ?? {}),
                },
              };
        saveCustomizationState(next);
        return next;
      });
    },
    []
  );

  const setCarSkin = useCallback(
    (skinId: CarSkinId) => {
      updateCustomization((prev) => ({
        ...prev,
        car: {
          ...prev.car,
          skinId,
        },
      }));
    },
    [updateCustomization]
  );

  const setCustomColor = useCallback(
    (customColor: string) => {
      updateCustomization((prev) => ({
        ...prev,
        car: {
          ...prev.car,
          customColor,
        },
      }));
    },
    [updateCustomization]
  );

  const setAccessory = useCallback(
    (accessoryId: CarAccessoryId) => {
      updateCustomization((prev) => ({
        ...prev,
        car: {
          ...prev.car,
          accessoryId,
        },
      }));
    },
    [updateCustomization]
  );

  const setApplyToTraffic = useCallback(
    (applyToTraffic: boolean) => {
      updateCustomization((prev) => ({
        ...prev,
        car: {
          ...prev.car,
          applyToTraffic,
        },
      }));
    },
    [updateCustomization]
  );

  const setEnvironmentTheme = useCallback(
    (environmentId: EnvironmentThemeId) => {
      updateCustomization((prev) => ({
        ...prev,
        environmentId,
      }));
    },
    [updateCustomization]
  );

  const applyBundle = useCallback(
    (bundle: CreativeBundlePreset) => {
      updateCustomization({
        car: {
          skinId: bundle.skinId,
          customColor: bundle.customColor,
          accessoryId: bundle.accessoryId,
          underglowColor: '#38bdf8',
          applyToTraffic: true,
        },
        environmentId: bundle.environmentId,
      });
    },
    [updateCustomization]
  );

  return {
    customization: state,
    skinSpec: getCarSkinById(state.car.skinId),
    themeSpec: getEnvironmentThemeById(state.environmentId),
    setCarSkin,
    setCustomColor,
    setAccessory,
    setApplyToTraffic,
    setEnvironmentTheme,
    applyBundle,
    updateCustomization,
  };
}
