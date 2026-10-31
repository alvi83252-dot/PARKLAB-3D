/**
 * PARKLAB 3D — Real-Earth Address & Coordinate Geocoder + Live 3D City Synthesizer
 *
 * Allows players in Free Roam to:
 * 1. Search by any address, street name, UK postcode, or city (e.g., "Central London",
 *    "Harrow UK", "Station Road HA1", "Oxford Street W1", "Wembley", "Eiffel Tower", etc.)
 * 2. Enter any Latitude / Longitude coordinates on Earth (e.g., "51.5806, -0.3420")
 * 3. Teleport there with a 3D road network, street signs, buildings, parked vehicles,
 *    and full physical collision obstacles.
 */

import type {
  CityBuildingSpec,
  CityParkedVehicleSpec,
  CityParkingBaySpec,
  CityRoadSpec,
  CityRoundaboutSpec,
  CityStreetSignSpec,
  RealCityLocation,
} from './cityTypes';
import {
  buildCityCollisionObstacles,
  REAL_CITIES_PRESETS,
} from './realCitiesData';
import { MAPBOX_ACCESS_TOKEN } from './mapboxConfig';

export interface GeocoderSearchResult {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  country: string;
  postcode?: string;
  presetCityId?: string;
  source: 'preset' | 'mapbox' | 'gazetteer' | 'osm-nominatim' | 'coordinates';
}

interface GazetteerEntry {
  keywords: string[];
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  country: string;
  postcode?: string;
  presetCityId?: string;
  streetNames?: [string, string, string];
}

const LOCAL_GAZETTEER: GazetteerEntry[] = [
  {
    keywords: [
      'central london',
      'london',
      'westminster',
      'trafalgar square',
      'whitehall',
      'big ben',
      'the mall',
      'strand',
      'sw1a',
      'wc2n',
      'charing cross',
    ],
    title: 'Central London — Westminster & Trafalgar Square',
    subtitle: 'Whitehall, The Mall, Strand & Big Ben · SW1A 2DX, UK',
    lat: 51.5074,
    lng: -0.1278,
    country: 'United Kingdom',
    postcode: 'SW1A 2DX',
    presetCityId: 'central-london-uk',
  },
  {
    keywords: [
      'harrow',
      'harrow uk',
      'harrow on the hill',
      'harrow-on-the-hill',
      'station road harrow',
      'college road harrow',
      'st anns road',
      'greenhill',
      'ha1',
      'ha2',
      'ha3',
    ],
    title: 'Harrow, London, UK',
    subtitle: "Station Rd, College Rd, St Ann's & Harrow-on-the-Hill · HA1 2TU, UK",
    lat: 51.5806,
    lng: -0.342,
    country: 'United Kingdom',
    postcode: 'HA1 2TU',
    presetCityId: 'harrow-uk',
  },
  {
    keywords: [
      'canary wharf',
      'docklands',
      'one canada square',
      'cabot square',
      'isle of dogs',
      'e14',
    ],
    title: 'Canary Wharf — London Docklands',
    subtitle: 'One Canada Square & Cabot Square · E14 5AB, UK',
    lat: 51.5054,
    lng: -0.0235,
    country: 'United Kingdom',
    postcode: 'E14 5AB',
    presetCityId: 'canary-wharf-uk',
  },
  {
    keywords: ['oxford street', 'regent street', 'piccadilly circus', 'soho', 'mayfair', 'w1', 'w1b'],
    title: 'Oxford Circus & Regent Street, Central London',
    subtitle: 'West End Shopping Boulevard · W1B 3AG, London, UK',
    lat: 51.5152,
    lng: -0.1419,
    country: 'United Kingdom',
    postcode: 'W1B 3AG',
    streetNames: ['Oxford Street (A40)', 'Regent Street (A4201)', 'Great Portland St'],
  },
  {
    keywords: ['baker street', 'marylebone', 'regents park', 'nw1', '221b baker street'],
    title: 'Baker Street & Marylebone, London',
    subtitle: '221B Baker Street & Marylebone Rd · NW1 6XE, London, UK',
    lat: 51.5237,
    lng: -0.1585,
    country: 'United Kingdom',
    postcode: 'NW1 6XE',
    streetNames: ['Baker Street (A41)', 'Marylebone Road (A501)', 'York Place'],
  },
  {
    keywords: ['wembley', 'wembley stadium', 'olympic way', 'ha9', 'brent'],
    title: 'Wembley Park & Stadium Boulevard, London',
    subtitle: 'Wembley Way & Engineers Way · HA9 0WS, North West London, UK',
    lat: 51.556,
    lng: -0.2795,
    country: 'United Kingdom',
    postcode: 'HA9 0WS',
    streetNames: ['Engineers Way (HA9)', 'Empire Way', 'Wembley High Road'],
  },
  {
    keywords: ['wealdstone', 'harrow weald', 'high street wealdstone', 'ha3 5dl'],
    title: 'Wealdstone & Harrow Weald, London',
    subtitle: 'High Street Wealdstone & George Gange Way · HA3 7AA, Harrow, UK',
    lat: 51.5945,
    lng: -0.3352,
    country: 'United Kingdom',
    postcode: 'HA3 7AA',
    streetNames: ['High Street Wealdstone (A409)', 'George Gange Way', 'Ellen Webb Drive'],
  },
  {
    keywords: ['pinner', 'pinner high street', 'bridge street pinner', 'ha5'],
    title: 'Pinner Village & Bridge Street, Harrow',
    subtitle: 'Bridge Street & Pinner High Street · HA5 3JP, Harrow, UK',
    lat: 51.5932,
    lng: -0.3812,
    country: 'United Kingdom',
    postcode: 'HA5 3JP',
    streetNames: ['Bridge Street (A404)', 'Pinner High Street', 'Marsh Road'],
  },
  {
    keywords: ['stanmore', 'stanmore broadway', 'ha7'],
    title: 'Stanmore Broadway, Harrow',
    subtitle: 'The Broadway & London Road · HA7 4DA, Harrow, UK',
    lat: 51.6168,
    lng: -0.3125,
    country: 'United Kingdom',
    postcode: 'HA7 4DA',
    streetNames: ['The Broadway (A410)', 'Church Road Stanmore', 'Stanmore Hill'],
  },
  {
    keywords: ['birmingham', 'bullring', 'victoria square', 'colmore row', 'b1'],
    title: 'Birmingham City Centre, UK',
    subtitle: 'Victoria Square, Colmore Row & Bullring · B1 1BB, UK',
    lat: 52.4796,
    lng: -1.9026,
    country: 'United Kingdom',
    postcode: 'B1 1BB',
    presetCityId: 'birmingham-uk',
  },
  {
    keywords: ['manchester', 'deansgate', 'st peters square', 'spinningfields', 'm2', 'm3'],
    title: 'Manchester City Centre, UK',
    subtitle: "Deansgate & St Peter's Square · M2 5PD, UK",
    lat: 53.4794,
    lng: -2.2453,
    country: 'United Kingdom',
    postcode: 'M2 5PD',
    presetCityId: 'manchester-uk',
  },
  {
    keywords: ['edinburgh', 'princes street', 'royal mile', 'scotland', 'eh1', 'eh2'],
    title: 'Edinburgh Old & New Town, UK',
    subtitle: 'Princes Street, Scott Monument & Castlehill · EH2 2AN, UK',
    lat: 55.9533,
    lng: -3.1883,
    country: 'United Kingdom',
    postcode: 'EH2 2AN',
    presetCityId: 'edinburgh-uk',
  },
  {
    keywords: ['new york', 'nyc', 'times square', 'manhattan', 'broadway', '10036'],
    title: 'New York City — Times Square, USA',
    subtitle: 'Broadway, 7th Avenue & West 42nd St · NY 10036, USA',
    lat: 40.758,
    lng: -73.9855,
    country: 'United States',
    postcode: 'NY 10036',
    presetCityId: 'new-york-usa',
  },
  {
    keywords: ['tokyo', 'shibuya', 'shibuya crossing', 'dogenzaka', 'japan'],
    title: 'Tokyo — Shibuya Crossing, Japan',
    subtitle: 'Meiji-dori & Dogenzaka · 150-0043 Tokyo, Japan',
    lat: 35.6595,
    lng: 139.7004,
    country: 'Japan',
    postcode: '150-0043',
    presetCityId: 'tokyo-shibuya-jp',
  },
  {
    keywords: ['paris', 'champs elysees', 'arc de triomphe', 'eiffel tower', 'france'],
    title: 'Paris — Champs-Élysées & Étoile, France',
    subtitle: 'Avenue des Champs-Élysées · 75008 Paris, France',
    lat: 48.8738,
    lng: 2.295,
    country: 'France',
    postcode: '75008',
    streetNames: ['Avenue des Champs-Élysées', 'Avenue de la Grande Armée', 'Avenue Kléber'],
  },
  {
    keywords: ['dubai', 'burj khalifa', 'sheikh zayed road', 'downtown dubai', 'uae'],
    title: 'Downtown Dubai & Sheikh Mohammed bin Rashid Blvd',
    subtitle: 'Burj Khalifa District · Dubai, UAE',
    lat: 25.1972,
    lng: 55.2744,
    country: 'United Arab Emirates',
    streetNames: ['Sheikh Mohammed bin Rashid Blvd', 'Financial Center Road', 'Sheikh Zayed Service Rd'],
  },
];

/**
 * Parses a latitude/longitude coordinate string if the user typed coordinates.
 * Supports formats like:
 * - "51.5806, -0.3420"
 * - "51.5074 N, 0.1278 W"
 * - "40.7580 -73.9855"
 */
export function parseCoordinatesInput(
  raw: string
): { lat: number; lng: number } | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  // Match optional N/S/E/W suffixes or signed decimals
  const regex =
    /^([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSns])?\s*(?:,|\/|\s+)\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([EWew])?$/;
  const match = cleaned.match(regex);
  if (!match) return null;

  let lat = parseFloat(match[1]);
  const ns = match[2]?.toUpperCase();
  let lng = parseFloat(match[3]);
  const ew = match[4]?.toUpperCase();

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (ns === 'S' && lat > 0) lat = -lat;
  if (ew === 'W' && lng > 0) lng = -lng;

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Computes approximate Haversine distance in kilometres between two WGS84 coordinates.
 */
export function distanceKmBetweenCoords(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Searches for real-world addresses, postcodes, cities, or coordinates.
 * Combines instant local gazetteer matching with live OpenStreetMap Nominatim geocoding.
 */
export async function searchRealWorldLocations(
  query: string
): Promise<GeocoderSearchResult[]> {
  const q = query.trim();
  if (!q) {
    return REAL_CITIES_PRESETS.map((c) => ({
      id: c.id,
      title: `${c.name} (${c.postcode ?? c.country})`,
      subtitle: `${c.region} · ${c.lat.toFixed(4)}°, ${c.lng.toFixed(4)}°`,
      lat: c.lat,
      lng: c.lng,
      country: c.country,
      postcode: c.postcode,
      presetCityId: c.id,
      source: 'preset',
    }));
  }

  const results: GeocoderSearchResult[] = [];

  // 1. Check if the query is direct Lat/Lng coordinates
  const parsedCoords = parseCoordinatesInput(q);
  if (parsedCoords) {
    // Check if near a preset city
    const nearestPreset = REAL_CITIES_PRESETS.find(
      (c) =>
        distanceKmBetweenCoords(
          parsedCoords.lat,
          parsedCoords.lng,
          c.lat,
          c.lng
        ) < 1.2
    );

    results.push({
      id: `coords-${parsedCoords.lat.toFixed(4)}-${parsedCoords.lng.toFixed(4)}`,
      title: nearestPreset
        ? `${nearestPreset.name} (${parsedCoords.lat.toFixed(4)}, ${parsedCoords.lng.toFixed(4)})`
        : `Earth Coordinates (${parsedCoords.lat.toFixed(4)}°, ${parsedCoords.lng.toFixed(4)}°)`,
      subtitle: nearestPreset
        ? `Matches ${nearestPreset.region}, ${nearestPreset.country}`
        : 'Direct WGS84 GPS Coordinate Teleport',
      lat: parsedCoords.lat,
      lng: parsedCoords.lng,
      country: nearestPreset?.country ?? 'Earth GPS',
      postcode: nearestPreset?.postcode,
      presetCityId: nearestPreset?.id,
      source: 'coordinates',
    });
  }

  // 2. Match against local gazetteer (instant UK & world streets/postcodes)
  const qLower = q.toLowerCase();
  for (let i = 0; i < LOCAL_GAZETTEER.length; i++) {
    const entry = LOCAL_GAZETTEER[i];
    const matched =
      entry.title.toLowerCase().includes(qLower) ||
      entry.subtitle.toLowerCase().includes(qLower) ||
      entry.keywords.some((k) => k.includes(qLower) || qLower.includes(k));
    if (matched) {
      results.push({
        id: entry.presetCityId ?? `gaz-${i}`,
        title: entry.title,
        subtitle: entry.subtitle,
        lat: entry.lat,
        lng: entry.lng,
        country: entry.country,
        postcode: entry.postcode,
        presetCityId: entry.presetCityId,
        source: entry.presetCityId ? 'preset' : 'gazetteer',
      });
    }
  }

  // 3. Query live Mapbox Geocoding API v5 for any street address, UK postcode, POI, or city worldwide
  if (MAPBOX_ACCESS_TOKEN) {
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 3000);
      const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        q
      )}.json?access_token=${encodeURIComponent(
        MAPBOX_ACCESS_TOKEN
      )}&autocomplete=true&limit=6&types=address,poi,postcode,neighborhood,locality,place`;

      const response = await fetch(mapboxUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      window.clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as {
          features?: Array<{
            id: string;
            text?: string;
            place_name?: string;
            center?: [number, number];
            context?: Array<{ id?: string; text?: string }>;
          }>;
        };

        if (Array.isArray(data.features)) {
          for (const feature of data.features) {
            if (!feature.center || feature.center.length < 2) continue;
            const lng = Number(feature.center[0]);
            const lat = Number(feature.center[1]);
            if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

            const duplicate = results.some(
              (r) => distanceKmBetweenCoords(r.lat, r.lng, lat, lng) < 0.35
            );
            if (duplicate) continue;

            const nearestPreset = REAL_CITIES_PRESETS.find(
              (c) => distanceKmBetweenCoords(lat, lng, c.lat, c.lng) < 0.85
            );

            const postcodeCtx = feature.context?.find((c) =>
              c.id?.startsWith('postcode.')
            )?.text;
            const countryCtx =
              feature.context?.find((c) => c.id?.startsWith('country.'))
                ?.text ?? 'Mapbox Earth';

            const placeParts = (feature.place_name ?? feature.text ?? q)
              .split(',')
              .map((s) => s.trim());
            const shortTitle =
              placeParts.slice(0, 2).join(', ') || feature.text || q;
            const subtitle =
              placeParts.slice(1, 4).join(', ') ||
              `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;

            results.push({
              id: `mapbox-${feature.id}`,
              title: shortTitle,
              subtitle: `${subtitle} · (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
              lat,
              lng,
              country: countryCtx,
              postcode: postcodeCtx,
              presetCityId: nearestPreset?.id,
              source: 'mapbox',
            });
          }
        }
      }
    } catch {
      // Fallback to Nominatim if Mapbox request fails
    }
  }

  // 4. Query live OpenStreetMap Nominatim Geocoding API as supplementary fallback
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2800);
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(
      q
    )}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    window.clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as Array<{
        place_id: number;
        display_name: string;
        lat: string;
        lon: string;
        address?: {
          road?: string;
          suburb?: string;
          city?: string;
          town?: string;
          borough?: string;
          postcode?: string;
          country?: string;
        };
      }>;

      for (const item of data) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

        // Avoid duplicate if already within 400m of an existing result
        const duplicate = results.some(
          (r) => distanceKmBetweenCoords(r.lat, r.lng, lat, lng) < 0.4
        );
        if (duplicate) continue;

        const nearestPreset = REAL_CITIES_PRESETS.find(
          (c) => distanceKmBetweenCoords(lat, lng, c.lat, c.lng) < 0.9
        );

        const parts = item.display_name.split(',').map((s) => s.trim());
        const shortTitle = parts.slice(0, 2).join(', ') || item.display_name;
        const subtitle =
          parts.slice(2, 5).join(', ') ||
          `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;

        results.push({
          id: `osm-${item.place_id}`,
          title: shortTitle,
          subtitle: `${subtitle} · (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
          lat,
          lng,
          country: item.address?.country ?? 'OpenStreetMap',
          postcode: item.address?.postcode,
          presetCityId: nearestPreset?.id,
          source: 'osm-nominatim',
        });
      }
    }
  } catch {
    // Gracefully fallback if offline or rate-limited
  }

  // 4. If still empty (e.g. offline arbitrary address string), synthesize deterministic coordinates from query hash
  if (results.length === 0) {
    let hash = 2166136261;
    for (let i = 0; i < q.length; i++) {
      hash ^= q.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    // Bias toward Greater London / UK if UK-like query, else general coordinates
    const latOffset = ((hash & 0xffff) / 0xffff - 0.5) * 0.14;
    const lngOffset = (((hash >>> 16) & 0xffff) / 0xffff - 0.5) * 0.22;
    const synthLat = Number((51.53 + latOffset).toFixed(4));
    const synthLng = Number((-0.18 + lngOffset).toFixed(4));

    results.push({
      id: `synth-${Math.abs(hash)}`,
      title: `${q} (Mapped Street Sector)`,
      subtitle: `Synthesized Urban Sector · ${synthLat.toFixed(4)}°, ${synthLng.toFixed(4)}°`,
      lat: synthLat,
      lng: synthLng,
      country: 'United Kingdom',
      source: 'gazetteer',
    });
  }

  return results;
}

/**
 * Deterministic pseudo-random generator seeded by latitude & longitude.
 */
function createCoordRng(lat: number, lng: number): () => number {
  let seed =
    Math.floor(Math.abs(lat * 100000)) ^
    (Math.floor(Math.abs(lng * 100000)) << 7) ^
    0x9e3779b9;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Attempts to fetch live OpenStreetMap building footprints & road names within ~130m of (lat, lng)
 * via the Overpass API so any searched address can render real OSM building blocks & street names.
 */
async function fetchLiveOsmFeaturesNear(
  lat: number,
  lng: number
): Promise<{
  roadNames: string[];
  buildings: CityBuildingSpec[];
} | null> {
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2400);
    const query = `[out:json][timeout:2];(way["highway"~"^(primary|secondary|tertiary|residential|trunk|unclassified)$"](around:140,${lat},${lng});way["building"](around:120,${lat},${lng}););out body geom 35;`;
    const response = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      { signal: controller.signal }
    );
    window.clearTimeout(timeoutId);

    if (!response.ok) return null;
    const json = (await response.json()) as {
      elements?: Array<{
        id: number;
        type: string;
        tags?: Record<string, string>;
        geometry?: Array<{ lat: number; lon: number }>;
      }>;
    };

    if (!json.elements || json.elements.length === 0) return null;

    const roadNames: string[] = [];
    const buildings: CityBuildingSpec[] = [];
    const metresPerDegLat = 111320;
    const metresPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);

    const palette = [
      { primary: '#1e293b', secondary: '#334155', glass: '#38bdf8', accent: '#0ea5e9' },
      { primary: '#334155', secondary: '#475569', glass: '#7dd3fc', accent: '#f59e0b' },
      { primary: '#7c2d12', secondary: '#9a3412', glass: '#bae6fd', accent: '#eab308' },
      { primary: '#cbd5e1', secondary: '#94a3b8', glass: '#0284c7', accent: '#3b82f6' },
    ];

    for (const el of json.elements) {
      if (el.tags?.highway && el.tags?.name) {
        if (!roadNames.includes(el.tags.name)) {
          roadNames.push(el.tags.name);
        }
      } else if (el.tags?.building && el.geometry && el.geometry.length >= 3) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;

        for (const pt of el.geometry) {
          const x = (pt.lon - lng) * metresPerDegLng;
          const z = -(pt.lat - lat) * metresPerDegLat;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (z < minZ) minZ = z;
          if (z > maxZ) maxZ = z;
        }

        const cx = (minX + maxX) / 2;
        const cz = (minZ + maxZ) / 2;
        const w = Math.max(10, Math.min(38, maxX - minX));
        const d = Math.max(10, Math.min(38, maxZ - minZ));

        // Keep the central main arterial roadways (|x| < 16 or |z| < 16) clear so the player can drive freely
        if (Math.abs(cx) < w / 2 + 12 || Math.abs(cz) < d / 2 + 12) {
          continue;
        }
        if (Math.abs(cx) > 125 || Math.abs(cz) > 125) {
          continue;
        }

        const levels = parseInt(el.tags['building:levels'] ?? '4', 10);
        const h = Math.max(11, Math.min(54, (Number.isNaN(levels) ? 4 : levels) * 3.8));
        const pal = palette[buildings.length % palette.length];

        buildings.push({
          id: `osm-bldg-${el.id}`,
          name: el.tags.name || `${el.tags['addr:street'] || 'Urban'} Building #${buildings.length + 1}`,
          position: [cx, 0, cz],
          dimensions: [w, h, d],
          primaryColor: pal.primary,
          secondaryColor: pal.secondary,
          glassColor: pal.glass,
          accentColor: pal.accent,
          roofStyle: h > 36 ? 'pyramid' : 'flat',
        });

        if (buildings.length >= 16) break;
      }
    }

    return { roadNames, buildings };
  } catch {
    return null;
  }
}

/**
 * Reverse geocodes (lat, lng) via Mapbox Geocoding v5 API to retrieve the real street address,
 * place name, postcode, and country for any coordinate on Earth.
 */
async function reverseGeocodeMapbox(
  lat: number,
  lng: number
): Promise<{
  title?: string;
  subtitle?: string;
  postcode?: string;
  country?: string;
} | null> {
  if (!MAPBOX_ACCESS_TOKEN) return null;
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2400);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng.toFixed(
      6
    )},${lat.toFixed(6)}.json?access_token=${encodeURIComponent(
      MAPBOX_ACCESS_TOKEN
    )}&limit=1`;
    const response = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timeoutId);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      features?: Array<{
        text?: string;
        place_name?: string;
        context?: Array<{ id?: string; text?: string }>;
      }>;
    };
    const top = data.features?.[0];
    if (!top) return null;

    const postcodeCtx = top.context?.find((c) =>
      c.id?.startsWith('postcode.')
    )?.text;
    const countryCtx = top.context?.find((c) =>
      c.id?.startsWith('country.')
    )?.text;
    const parts = (top.place_name ?? top.text ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      title: parts.slice(0, 2).join(', ') || top.text,
      subtitle: parts.slice(1, 4).join(', '),
      postcode: postcodeCtx,
      country: countryCtx,
    };
  } catch {
    return null;
  }
}

/**
 * Queries Mapbox Tilequery API (`mapbox.mapbox-streets-v8`) around (lat, lng)
 * to extract real road names, POI labels, and building footprints/heights.
 */
async function fetchMapboxTilequeryFeaturesNear(
  lat: number,
  lng: number
): Promise<{
  roadNames: string[];
  poiNames: string[];
  buildings: CityBuildingSpec[];
} | null> {
  if (!MAPBOX_ACCESS_TOKEN) return null;
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2400);
    const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng.toFixed(
      6
    )},${lat.toFixed(
      6
    )}.json?radius=165&limit=45&layers=road,building,poi_label&access_token=${encodeURIComponent(
      MAPBOX_ACCESS_TOKEN
    )}`;
    const response = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timeoutId);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      features?: Array<{
        id?: string | number;
        geometry?: {
          type?: string;
          coordinates?: [number, number];
        };
        properties?: {
          tilequery?: {
            layer?: string;
            distance?: number;
          };
          name?: string;
          height?: number;
          type?: string;
        };
      }>;
    };

    if (!Array.isArray(data.features) || data.features.length === 0) {
      return null;
    }

    const roadNames: string[] = [];
    const poiNames: string[] = [];
    const buildings: CityBuildingSpec[] = [];
    const metresPerDegLat = 111320;
    const metresPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);

    const palette = [
      { primary: '#1e293b', secondary: '#334155', glass: '#38bdf8', accent: '#0ea5e9' },
      { primary: '#334155', secondary: '#475569', glass: '#7dd3fc', accent: '#f59e0b' },
      { primary: '#7c2d12', secondary: '#9a3412', glass: '#bae6fd', accent: '#eab308' },
      { primary: '#cbd5e1', secondary: '#94a3b8', glass: '#0284c7', accent: '#3b82f6' },
    ];

    for (const feat of data.features) {
      const layer = feat.properties?.tilequery?.layer;
      const name = feat.properties?.name?.trim();

      if (layer === 'road' && name && !roadNames.includes(name)) {
        roadNames.push(name);
      } else if (layer === 'poi_label' && name && !poiNames.includes(name)) {
        poiNames.push(name);
      } else if (
        layer === 'building' &&
        feat.geometry?.coordinates &&
        feat.geometry.coordinates.length >= 2
      ) {
        const [fLng, fLat] = feat.geometry.coordinates;
        const cx = (fLng - lng) * metresPerDegLng;
        const cz = -(fLat - lat) * metresPerDegLat;

        const w = 18;
        const d = 16;
        // Keep central carriageways clear
        if (Math.abs(cx) < w / 2 + 12 || Math.abs(cz) < d / 2 + 12) {
          continue;
        }
        if (Math.abs(cx) > 120 || Math.abs(cz) > 120) {
          continue;
        }
        // Avoid overlapping buildings
        const overlaps = buildings.some(
          (b) => Math.hypot(b.position[0] - cx, b.position[2] - cz) < 20
        );
        if (overlaps) continue;

        const rawHeight = Number(feat.properties?.height ?? 18);
        const h = Math.max(12, Math.min(56, Number.isNaN(rawHeight) ? 18 : rawHeight));
        const pal = palette[buildings.length % palette.length];

        buildings.push({
          id: `mbx-bldg-${feat.id ?? buildings.length}`,
          name:
            name ||
            poiNames[buildings.length % Math.max(1, poiNames.length)] ||
            `Mapbox Urban Block #${buildings.length + 1}`,
          position: [cx, 0, cz],
          dimensions: [w, h, d],
          primaryColor: pal.primary,
          secondaryColor: pal.secondary,
          glassColor: pal.glass,
          accentColor: pal.accent,
          roofStyle: h > 34 ? 'pyramid' : 'flat',
        });

        if (buildings.length >= 14) break;
      }
    }

    return { roadNames, poiNames, buildings };
  } catch {
    return null;
  }
}

/**
 * Builds or retrieves a complete drivable 3D `RealCityLocation` for any search result or (lat, lng) coordinate.
 */
export async function resolveLocationToCityWorld(params: {
  lat: number;
  lng: number;
  title?: string;
  subtitle?: string;
  country?: string;
  postcode?: string;
  presetCityId?: string;
}): Promise<RealCityLocation> {
  const { lat, lng, title, country, postcode, presetCityId } = params;

  // 1. Check if it explicitly references or is very close (< 0.85 km) to one of our curated preset cities
  if (presetCityId) {
    const preset = REAL_CITIES_PRESETS.find((c) => c.id === presetCityId);
    if (preset) return preset;
  }

  const nearbyPreset = REAL_CITIES_PRESETS.find(
    (c) => distanceKmBetweenCoords(lat, lng, c.lat, c.lng) < 0.85
  );
  if (nearbyPreset) {
    return nearbyPreset;
  }

  // 2. Check if matching a local gazetteer entry with known street names
  const gazMatch = LOCAL_GAZETTEER.find(
    (g) => distanceKmBetweenCoords(lat, lng, g.lat, g.lng) < 0.65
  );

  // 3. Query Mapbox Tilequery + Mapbox Reverse Geocoding + OpenStreetMap Overpass in parallel
  const needsReverseGeocode = !title || title.startsWith('GPS (') || title.startsWith('Earth Coordinates');
  const [mapboxLive, osmLive, reverseMeta] = await Promise.all([
    fetchMapboxTilequeryFeaturesNear(lat, lng),
    fetchLiveOsmFeaturesNear(lat, lng),
    needsReverseGeocode ? reverseGeocodeMapbox(lat, lng) : Promise.resolve(null),
  ]);

  const resolvedTitle = reverseMeta?.title || title;
  const resolvedCountry = country || reverseMeta?.country;
  const resolvedPostcode = postcode || reverseMeta?.postcode;

  const rng = createCoordRng(lat, lng);
  const isUKOrLeftHand =
    (resolvedCountry && /united kingdom|uk|england|scotland|wales|japan|australia|india/i.test(resolvedCountry)) ||
    (lat >= 49.8 && lat <= 60.9 && lng >= -8.2 && lng <= 1.8);

  const mergedRoadNames = [
    ...(mapboxLive?.roadNames ?? []),
    ...(osmLive?.roadNames ?? []),
  ].filter((v, idx, arr) => Boolean(v) && arr.indexOf(v) === idx);

  const primaryStreet =
    mergedRoadNames[0] ||
    gazMatch?.streetNames?.[0] ||
    (resolvedTitle ? `${resolvedTitle.split(',')[0]} High Street` : 'Main Arterial Avenue');
  const crossStreet =
    mergedRoadNames[1] ||
    gazMatch?.streetNames?.[1] ||
    (isUKOrLeftHand ? 'Station Approach Road' : 'Central Cross Boulevard');
  const ringStreet =
    mergedRoadNames[2] ||
    gazMatch?.streetNames?.[2] ||
    (isUKOrLeftHand ? 'Queensway Circus' : 'Metropolitan Parkway');

  const cityId = `custom-${lat.toFixed(4)}-${lng.toFixed(4)}`;

  const roads: CityRoadSpec[] = [
    {
      id: `${cityId}-road-ns`,
      name: primaryStreet,
      center: [0, 0],
      width: 16,
      length: 190,
      rotationY: 0,
      lanes: 4,
    },
    {
      id: `${cityId}-road-ew`,
      name: crossStreet,
      center: [0, 0],
      width: 15,
      length: 190,
      rotationY: Math.PI / 2,
      lanes: 4,
    },
    {
      id: `${cityId}-road-north`,
      name: ringStreet,
      center: [0, -56],
      width: 14,
      length: 160,
      rotationY: Math.PI / 2,
      lanes: 2,
    },
    {
      id: `${cityId}-road-south`,
      name: `${primaryStreet} South`,
      center: [0, 56],
      width: 14,
      length: 160,
      rotationY: Math.PI / 2,
      lanes: 2,
    },
  ];

  const roundabouts: CityRoundaboutSpec[] = [
    {
      id: `${cityId}-roundabout-center`,
      name: `${primaryStreet} / ${crossStreet} Circus`,
      center: [0, 0],
      outerRadius: 15,
      islandRadius: 4.2,
    },
  ];

  // Combine live Mapbox Tilequery buildings + live OSM buildings, supplemented by coordinate-seeded blocks
  const buildings: CityBuildingSpec[] = [];
  for (const b of [
    ...(mapboxLive?.buildings ?? []),
    ...(osmLive?.buildings ?? []),
  ]) {
    const overlaps = buildings.some(
      (existing) =>
        Math.hypot(
          existing.position[0] - b.position[0],
          existing.position[2] - b.position[2]
        ) < 18
    );
    if (!overlaps && buildings.length < 16) {
      buildings.push(b);
    }
  }

  const blockquads: Array<[number, number, string]> = [
    [-32, -28, `${primaryStreet} Plaza`],
    [32, -28, `${crossStreet} Chambers`],
    [-32, 28, `${primaryStreet} Central Tower`],
    [32, 28, `${crossStreet} Commercial Wing`],
    [-68, -28, `${ringStreet} West Block`],
    [68, -28, `${ringStreet} East Block`],
    [-34, -82, `North ${primaryStreet} House`],
    [34, -82, `North ${crossStreet} Spire`],
    [-34, 82, `South ${primaryStreet} Court`],
    [34, 82, `South ${crossStreet} Exchange`],
  ];

  const styles: Array<CityBuildingSpec['roofStyle']> = [
    'flat',
    'pyramid',
    'clocktower',
    'spire',
    'dome',
    'cylinder',
  ];
  const palettes = [
    { primary: '#1e293b', secondary: '#334155', glass: '#38bdf8', accent: '#0ea5e9' },
    { primary: '#cbd5e1', secondary: '#64748b', glass: '#0284c7', accent: '#f59e0b' },
    { primary: '#7c2d12', secondary: '#9a3412', glass: '#bae6fd', accent: '#eab308' },
    { primary: '#27303f', secondary: '#475569', glass: '#7dd3fc', accent: '#10b981' },
  ];

  for (let i = 0; i < blockquads.length; i++) {
    if (buildings.length >= 14) break;
    const [bx, bz, bName] = blockquads[i];
    const w = 22 + Math.floor(rng() * 14);
    const d = 18 + Math.floor(rng() * 12);
    const h = 14 + Math.floor(rng() * 38);
    const pal = palettes[Math.floor(rng() * palettes.length)];
    const roof = styles[Math.floor(rng() * styles.length)];

    buildings.push({
      id: `${cityId}-synth-bldg-${i}`,
      name: bName,
      position: [bx, 0, bz],
      dimensions: [w, h, d],
      primaryColor: pal.primary,
      secondaryColor: pal.secondary,
      glassColor: pal.glass,
      accentColor: pal.accent,
      roofStyle: roof,
    });
  }

  const parkedVehicles: CityParkedVehicleSpec[] = [
    {
      id: `${cityId}-veh-1`,
      label: isUKOrLeftHand ? 'Red Double-Decker Transit Bus' : 'City Transit Coach',
      kind: isUKOrLeftHand ? 'london-bus' : 'suv',
      position: [-6.8, 0, -24],
      rotationY: 0,
      dimensions: isUKOrLeftHand
        ? { length: 9.6, width: 2.45, height: 3.95 }
        : { length: 4.92, width: 1.98, height: 1.76 },
      color: isUKOrLeftHand ? '#dc2626' : '#1e293b',
    },
    {
      id: `${cityId}-veh-2`,
      label: isUKOrLeftHand ? 'Hackney Carriage Taxi' : 'City Yellow Taxi',
      kind: isUKOrLeftHand ? 'black-cab' : 'nyc-cab',
      position: [24, 0, -4.8],
      rotationY: -Math.PI / 2,
      dimensions: { length: 4.65, width: 1.85, height: 1.56 },
      color: isUKOrLeftHand ? '#090d16' : '#eab308',
    },
    {
      id: `${cityId}-veh-3`,
      label: 'Parked Executive Saloon',
      kind: 'sedan',
      position: [6.8, 0, 32],
      rotationY: Math.PI,
      dimensions: { length: 4.82, width: 1.86, height: 1.44 },
      color: '#334155',
    },
    {
      id: `${cityId}-veh-4`,
      label: 'Parked Urban Hatchback',
      kind: 'hatchback',
      position: [-26, 0, 4.8],
      rotationY: Math.PI / 2,
      dimensions: { length: 4.08, width: 1.78, height: 1.46 },
      color: '#2563eb',
    },
  ];

  const parkingBays: CityParkingBaySpec[] = [
    {
      id: `${cityId}-bay-1`,
      streetName: `${primaryStreet} Roadside Bay`,
      position: [5.6, 0, -20],
      rotationY: 0,
      dimensions: { width: 2.7, length: 5.5 },
    },
    {
      id: `${cityId}-bay-2`,
      streetName: `${crossStreet} Roadside Bay`,
      position: [-20, 0, -5.2],
      rotationY: Math.PI / 2,
      dimensions: { width: 2.7, length: 5.5 },
    },
  ];

  const streetSigns: CityStreetSignSpec[] = [
    {
      id: `${cityId}-sign-1`,
      text: primaryStreet.toUpperCase().slice(0, 22),
      subtext: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
      position: [-10, 0, 14],
      rotationY: Math.PI / 2,
    },
    {
      id: `${cityId}-sign-2`,
      text: crossStreet.toUpperCase().slice(0, 22),
      subtext: (resolvedPostcode || resolvedCountry || 'MAPBOX GPS')
        .toUpperCase()
        .slice(0, 24),
      position: [14, 0, -10],
      rotationY: 0,
    },
  ];

  const displayName = resolvedTitle
    ? resolvedTitle.split(',')[0].trim()
    : `Earth Sector (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;

  return {
    id: cityId,
    name: displayName,
    region:
      params.subtitle ||
      reverseMeta?.subtitle ||
      `${primaryStreet} & ${crossStreet} (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
    country:
      resolvedCountry || (isUKOrLeftHand ? 'United Kingdom' : 'Earth GPS'),
    postcode: resolvedPostcode,
    lat,
    lng,
    description: `Real-world Mapbox sector at ${lat.toFixed(5)}°, ${lng.toFixed(
      5
    )}° featuring ${primaryStreet} and ${crossStreet}.`,
    trafficSide: isUKOrLeftHand ? 'left' : 'right',
    spawnPosition: [isUKOrLeftHand ? -3.6 : 3.6, 0, 20],
    spawnRotationY: 0,
    roads,
    roundabouts,
    buildings,
    parkedVehicles,
    parkingBays,
    streetSigns,
    obstacles: buildCityCollisionObstacles(
      cityId,
      buildings,
      roundabouts,
      parkedVehicles
    ),
    isCustomSearch: true,
    sourceLabel:
      mapboxLive && (mapboxLive.roadNames.length > 0 || mapboxLive.buildings.length > 0)
        ? 'Mapbox Live Vector + Satellite'
        : osmLive && osmLive.buildings.length > 0
          ? 'Mapbox + OpenStreetMap Live 3D'
          : 'Mapbox Real-Earth Sector',
  };
}
