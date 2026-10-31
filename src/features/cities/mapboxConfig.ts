/**
 * PARKLAB 3D — Mapbox Real-Earth Configuration, Tile URL Builder & Ground Style Store
 *
 * Uses the configured Mapbox public token to power:
 * 1. Mapbox Forward & Reverse Geocoding API (worldwide street addresses, UK postcodes, POIs, coordinates)
 * 2. Mapbox Tilequery API (mapbox.mapbox-streets-v8 real road names & building footprints)
 * 3. Mapbox High-Resolution Static Tiles (@2x Retina) projected onto the 3D city ground plane
 *    and the live 2D GPS minimap radar.
 */

import { useEffect, useState } from 'react';

export const MAPBOX_ACCESS_TOKEN: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_MAPBOX_ACCESS_TOKEN || '';

export type MapboxGroundStyle =
  | 'satellite-streets-v12'
  | 'navigation-night-v1'
  | 'streets-v12'
  | 'satellite-v9'
  | 'procedural';

export interface MapboxStyleOption {
  id: MapboxGroundStyle;
  label: string;
  shortLabel: string;
}

export const MAPBOX_STYLE_OPTIONS: MapboxStyleOption[] = [
  {
    id: 'satellite-streets-v12',
    label: 'Mapbox Satellite + Streets',
    shortLabel: 'Satellite Hybrid',
  },
  {
    id: 'navigation-night-v1',
    label: 'Mapbox Night Navigation',
    shortLabel: 'Night Nav',
  },
  {
    id: 'streets-v12',
    label: 'Mapbox Daytime Streets',
    shortLabel: 'Streets HD',
  },
  {
    id: 'satellite-v9',
    label: 'Mapbox Pure Aerial',
    shortLabel: 'Pure Satellite',
  },
  {
    id: 'procedural',
    label: 'Procedural Studio Asphalt',
    shortLabel: 'Studio 3D',
  },
];

let currentGroundStyle: MapboxGroundStyle = 'satellite-streets-v12';
const styleListeners = new Set<(style: MapboxGroundStyle) => void>();

export function getMapboxGroundStyle(): MapboxGroundStyle {
  return currentGroundStyle;
}

export function setMapboxGroundStyle(style: MapboxGroundStyle): void {
  if (currentGroundStyle === style) return;
  currentGroundStyle = style;
  styleListeners.forEach((listener) => listener(style));
}

export function useMapboxGroundStyle(): [
  MapboxGroundStyle,
  (style: MapboxGroundStyle) => void,
] {
  const [style, setStyle] = useState<MapboxGroundStyle>(currentGroundStyle);

  useEffect(() => {
    const handler = (next: MapboxGroundStyle) => setStyle(next);
    styleListeners.add(handler);
    return () => {
      styleListeners.delete(handler);
    };
  }, []);

  return [style, setMapboxGroundStyle];
}

/**
 * Computes the Web Mercator ground size in metres for a Mapbox static image
 * at a given latitude, zoom level, and logical pixel width/height (before @2x).
 */
export function computeMapboxGroundSizeMeters(
  lat: number,
  zoom = 16.5,
  logicalPixels = 1280
): number {
  const latRad = (lat * Math.PI) / 180;
  // Mapbox Static API uses 512px tile size scaling: 78271.51696 m/px at zoom 0 equator
  const metersPerLogicalPixel =
    (78271.51696 * Math.max(0.15, Math.cos(latRad))) / Math.pow(2, zoom);
  return metersPerLogicalPixel * logicalPixels;
}

/**
 * Builds a high-resolution Mapbox Static Images API URL centered at (lat, lng).
 */
export function buildMapboxStaticImageUrl(params: {
  lat: number;
  lng: number;
  zoom?: number;
  style?: Exclude<MapboxGroundStyle, 'procedural'>;
  width?: number;
  height?: number;
  retina?: boolean;
}): string {
  const {
    lat,
    lng,
    zoom = 16.5,
    style = 'satellite-streets-v12',
    width = 1280,
    height = 1280,
    retina = true,
  } = params;

  const safeLng = Number(lng.toFixed(6));
  const safeLat = Number(lat.toFixed(6));
  const safeZoom = Number(zoom.toFixed(2));
  const retinaSuffix = retina ? '@2x' : '';

  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${safeLng},${safeLat},${safeZoom},0,0/${width}x${height}${retinaSuffix}?access_token=${encodeURIComponent(
    MAPBOX_ACCESS_TOKEN
  )}&attribution=false&logo=false`;
}
