/**
 * PARKLAB 3D — Free Roam Real-Earth Location Search, Coordinate Teleport & Street Minimap
 * Allows searching by any address, street, postcode, or WGS84 coordinates (Lat, Lng),
 * quick-switching between Central London, Harrow UK, and global cities, and viewing
 * real-time GPS telemetry and a 2D street radar minimap.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Vec3 } from '../../types/challenge.types';
import type { VisibleFacialCueState } from '../evaluation/crashRagTypes';
import {
  useWebcamFacialObserver,
  type WebcamFacialObserverControls,
} from '../evaluation/useWebcamFacialObserver';
import type { RealCityLocation } from './cityTypes';
import {
  parseCoordinatesInput,
  resolveLocationToCityWorld,
  searchRealWorldLocations,
  type GeocoderSearchResult,
} from './geocoder';
import {
  buildMapboxStaticImageUrl,
  MAPBOX_STYLE_OPTIONS,
  useMapboxGroundStyle,
} from './mapboxConfig';
import { getRealCityById, REAL_CITIES_PRESETS } from './realCitiesData';

export interface EmotionCityRecommendation {
  city: RealCityLocation;
  moodLabel: string;
  moodEmoji: string;
  reason: string;
}

/**
 * Maps live webcam facial expression cues from `useWebcamFacialObserver`
 * to a matching real-world driving city.
 */
export function recommendCityFromFacialCue(
  cueState: VisibleFacialCueState
): EmotionCityRecommendation {
  if (cueState.cueKind === 'smiling-cue' || cueState.smileIndicator >= 0.42) {
    if (cueState.smileIndicator >= 0.62) {
      const tokyo = getRealCityById('tokyo-shibuya-jp');
      return {
        city: tokyo,
        moodLabel: 'Excited & Joyful',
        moodEmoji: '😄',
        reason:
          'Big smile detected — matching your high energy with neon Tokyo Shibuya Crossing!',
      };
    }
    const nyc = getRealCityById('new-york-usa');
    return {
      city: nyc,
      moodLabel: 'Happy & Confident',
      moodEmoji: '😊',
      reason:
        'Positive smile cue detected — cruising vibrant Midtown Manhattan, New York!',
    };
  }

  if (
    cueState.cueKind === 'active-facial-movement' ||
    cueState.movementIndicator >= 0.32
  ) {
    if (cueState.movementIndicator >= 0.55) {
      const harrow = getRealCityById('harrow-uk');
      return {
        city: harrow,
        moodLabel: 'Tense / High-Movement',
        moodEmoji: '😮',
        reason:
          'Expressive or tense movement detected — picking calm Harrow UK suburban streets!',
      };
    }
    const edinburgh = getRealCityById('edinburgh-uk');
    return {
      city: edinburgh,
      moodLabel: 'Animated & Curious',
      moodEmoji: '🤨',
      reason:
        'Active facial expression detected — exploring scenic Edinburgh Royal Mile!',
    };
  }

  if (cueState.eyeOpennessIndicator >= 0.33) {
    const centralLondon = getRealCityById('central-london-uk');
    return {
      city: centralLondon,
      moodLabel: 'Focused & Alert',
      moodEmoji: '🎯',
      reason:
        'Steady focused posture & alert gaze — ready for Central London Westminster traffic!',
    };
  }

  const canaryWharf = getRealCityById('canary-wharf-uk');
  return {
    city: canaryWharf,
    moodLabel: 'Calm & Composed',
    moodEmoji: '😌',
    reason:
      'Calm, relaxed expression — smooth dockland boulevards at Canary Wharf!',
  };
}

export interface CitySearchPanelProps {
  activeCity: RealCityLocation;
  playerPosition: Vec3;
  playerRotationY: number;
  onSelectCity: (city: RealCityLocation) => void;
  webcamObserver?: WebcamFacialObserverControls;
}

export const CitySearchPanel: React.FC<CitySearchPanelProps> = ({
  activeCity,
  playerPosition,
  playerRotationY,
  onSelectCity,
  webcamObserver,
}) => {
  const internalObserver = useWebcamFacialObserver();
  const observer = webcamObserver ?? internalObserver;
  const usesOwnVideoElement = !webcamObserver;

  const [autoEmotionCity, setAutoEmotionCity] = useState(false);
  const lastAutoEmotionSwitchRef = useRef<number>(0);

  const emotionRecommendation = useMemo(
    () => recommendCityFromFacialCue(observer.facialCueState),
    [observer.facialCueState]
  );

  // When Auto-Pick City by Emotion is toggled ON and a face is detected,
  // automatically transition to the recommended city (throttled to every 3.5s)
  useEffect(() => {
    if (
      !autoEmotionCity ||
      !observer.cameraActive ||
      !observer.facialCueState.faceDetected
    ) {
      return;
    }
    const now = Date.now();
    if (now - lastAutoEmotionSwitchRef.current < 3500) {
      return;
    }
    if (emotionRecommendation.city.id !== activeCity.id) {
      lastAutoEmotionSwitchRef.current = now;
      onSelectCity(emotionRecommendation.city);
    }
  }, [
    autoEmotionCity,
    observer.cameraActive,
    observer.facialCueState.faceDetected,
    emotionRecommendation.city,
    activeCity.id,
    onSelectCity,
  ]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [latInput, setLatInput] = useState(() => activeCity.lat.toFixed(4));
  const [lngInput, setLngInput] = useState(() => activeCity.lng.toFixed(4));
  const [results, setResults] = useState<GeocoderSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isTeleporting, setIsTeleporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync lat/lng inputs when activeCity changes
  useEffect(() => {
    setLatInput(activeCity.lat.toFixed(4));
    setLngInput(activeCity.lng.toFixed(4));
  }, [activeCity.id, activeCity.lat, activeCity.lng]);

  // Compute live GPS coordinates as the car drives around the city origin
  const liveGps = useMemo(() => {
    const metresPerDegLat = 111320;
    const metresPerDegLng =
      111320 * Math.max(0.2, Math.cos((activeCity.lat * Math.PI) / 180));
    const currentLat = activeCity.lat - playerPosition[2] / metresPerDegLat;
    const currentLng = activeCity.lng + playerPosition[0] / metresPerDegLng;
    return {
      lat: currentLat,
      lng: currentLng,
    };
  }, [activeCity.lat, activeCity.lng, playerPosition]);

  // Run initial preset list or debounced search when modal is open
  useEffect(() => {
    if (!isSearchOpen) return;
    let cancelled = false;
    setIsSearching(true);

    const timer = window.setTimeout(async () => {
      const found = await searchRealWorldLocations(searchQuery);
      if (!cancelled) {
        setResults(found);
        setIsSearching(false);
      }
    }, searchQuery.trim() ? 220 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, isSearchOpen]);

  const handleSelectResult = async (result: GeocoderSearchResult) => {
    setIsTeleporting(true);
    setStatusMessage(`Loading 3D streets for ${result.title}...`);
    try {
      const cityWorld = await resolveLocationToCityWorld({
        lat: result.lat,
        lng: result.lng,
        title: result.title,
        subtitle: result.subtitle,
        country: result.country,
        postcode: result.postcode,
        presetCityId: result.presetCityId,
      });
      onSelectCity(cityWorld);
      setIsSearchOpen(false);
      setStatusMessage(null);
    } finally {
      setIsTeleporting(false);
    }
  };

  const handleDirectCoordinateTeleport = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setStatusMessage(
        'Enter valid WGS84 coordinates: Latitude (-90 to 90), Longitude (-180 to 180).'
      );
      return;
    }

    setIsTeleporting(true);
    setStatusMessage(
      `Synthesizing 3D street sector at ${lat.toFixed(4)}°, ${lng.toFixed(4)}°...`
    );
    try {
      const cityWorld = await resolveLocationToCityWorld({
        lat,
        lng,
        title: `GPS (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
      });
      onSelectCity(cityWorld);
      setIsSearchOpen(false);
      setStatusMessage(null);
    } finally {
      setIsTeleporting(false);
    }
  };

  const handleSearchFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const directCoords = parseCoordinatesInput(searchQuery);
    if (directCoords) {
      setIsTeleporting(true);
      try {
        const cityWorld = await resolveLocationToCityWorld({
          lat: directCoords.lat,
          lng: directCoords.lng,
          title: `GPS (${directCoords.lat.toFixed(4)}°, ${directCoords.lng.toFixed(4)}°)`,
        });
        onSelectCity(cityWorld);
        setIsSearchOpen(false);
      } finally {
        setIsTeleporting(false);
      }
      return;
    }

    if (results.length > 0) {
      await handleSelectResult(results[0]);
    }
  };

  // Minimap coordinate helper (maps world [-115, 115] to SVG [0, 120])
  const toMapCoord = (val: number) => 60 + (val / 115) * 54;
  const headingDeg = (-playerRotationY * 180) / Math.PI;
  const [mapboxStyle, setMapboxStyle] = useMapboxGroundStyle();

  const minimapTileUrl = useMemo(() => {
    const styleForMinimap =
      mapboxStyle === 'procedural' ? 'navigation-night-v1' : mapboxStyle;
    return buildMapboxStaticImageUrl({
      lat: activeCity.lat,
      lng: activeCity.lng,
      zoom: 16.2,
      style: styleForMinimap,
      width: 240,
      height: 240,
      retina: true,
    });
  }, [activeCity.lat, activeCity.lng, mapboxStyle]);

  return (
    <div className="freeroam-city-panel-root">
      {/* Compact Live GPS & Quick-City Bar + Minimap */}
      <div className="freeroam-hud-card">
        <div className="freeroam-hud-header">
          <div className="freeroam-gps-meta">
            <span className="freeroam-earth-badge">
              MAPBOX LIVE GPS · {activeCity.trafficSide === 'left' ? 'KEEP LEFT' : 'KEEP RIGHT'}
            </span>
            <h3 className="freeroam-city-title">
              {activeCity.name}
              {activeCity.postcode ? (
                <span className="freeroam-postcode-pill">{activeCity.postcode}</span>
              ) : null}
            </h3>
            <p className="freeroam-city-subtitle">{activeCity.region}</p>
            <div className="freeroam-coords-readout">
              <span>
                LAT <strong>{liveGps.lat.toFixed(5)}°</strong>
              </span>
              <span className="freeroam-coords-sep">·</span>
              <span>
                LNG <strong>{liveGps.lng.toFixed(5)}°</strong>
              </span>
            </div>
          </div>

          {/* 2D Mapbox Satellite / Street Radar Minimap */}
          <div className="freeroam-minimap-box" title="Live Mapbox 2D Street Radar">
            <svg viewBox="0 0 120 120" className="freeroam-minimap-svg">
              <rect width="120" height="120" rx="10" fill="#090d16" />
              <image
                href={minimapTileUrl}
                x="0"
                y="0"
                width="120"
                height="120"
                preserveAspectRatio="xMidYMid slice"
                opacity="0.72"
              />
              {/* Roads */}
              {activeCity.roads.map((r) => {
                const cx = toMapCoord(r.center[0]);
                const cz = toMapCoord(r.center[1]);
                const rw = Math.max(4, (r.width / 115) * 54);
                const rl = (r.length / 115) * 54;
                const deg = (-r.rotationY * 180) / Math.PI;
                return (
                  <g
                    key={r.id}
                    transform={`translate(${cx}, ${cz}) rotate(${deg})`}
                  >
                    <rect
                      x={-rw / 2}
                      y={-rl / 2}
                      width={rw}
                      height={rl}
                      fill="#334155"
                      rx="1"
                    />
                  </g>
                );
              })}
              {/* Roundabouts */}
              {activeCity.roundabouts.map((rb) => (
                <circle
                  key={rb.id}
                  cx={toMapCoord(rb.center[0])}
                  cy={toMapCoord(rb.center[1])}
                  r={Math.max(4, (rb.outerRadius / 115) * 54)}
                  fill="#334155"
                  stroke="#94a3b8"
                  strokeWidth="0.8"
                />
              ))}
              {/* Buildings */}
              {activeCity.buildings.map((b) => {
                const bx = toMapCoord(b.position[0]);
                const bz = toMapCoord(b.position[2]);
                const bw = Math.max(3, (b.dimensions[0] / 115) * 54);
                const bd = Math.max(3, (b.dimensions[2] / 115) * 54);
                return (
                  <rect
                    key={b.id}
                    x={bx - bw / 2}
                    y={bz - bd / 2}
                    width={bw}
                    height={bd}
                    fill="#1e293b"
                    stroke="#38bdf8"
                    strokeWidth="0.6"
                    rx="1"
                  />
                );
              })}
              {/* Player Vehicle Arrow */}
              <g
                transform={`translate(${toMapCoord(playerPosition[0])}, ${toMapCoord(
                  playerPosition[2]
                )}) rotate(${headingDeg})`}
              >
                <polygon
                  points="0,-5.5 4.2,4.5 0,2.5 -4.2,4.5"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="0.9"
                />
              </g>
            </svg>
          </div>
        </div>

        {/* Quick Preset City Pills (Manual Selection: Central London, Harrow UK, etc.) */}
        <div className="freeroam-quick-cities">
          {REAL_CITIES_PRESETS.slice(0, 5).map((preset) => {
            const active = activeCity.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`freeroam-city-chip ${active ? 'is-active' : ''}`}
                onClick={() => {
                  setAutoEmotionCity(false);
                  onSelectCity(preset);
                }}
              >
                {preset.name}
              </button>
            );
          })}
          <button
            type="button"
            className="freeroam-open-search-btn"
            onClick={() => setIsSearchOpen((prev) => !prev)}
          >
            {isSearchOpen ? 'Close Search' : 'Search Address / GPS'}
          </button>
        </div>

        {/* Optional Emotion Camera City Selector (Webcam Facial Cue -> City or Manual) */}
        {observer.cameraSupported && (
          <div
            className="freeroam-emotion-bar"
            style={{
              marginTop: '6px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(148, 163, 184, 0.14)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {/* Hidden video element only if CitySearchPanel owns its own observer instance */}
            {usesOwnVideoElement && (
              <video
                ref={observer.videoRef}
                muted
                playsInline
                autoPlay
                style={{
                  width: observer.cameraActive ? '54px' : '1px',
                  height: observer.cameraActive ? '40px' : '1px',
                  opacity: observer.cameraActive ? 0.92 : 0,
                  position: observer.cameraActive ? 'static' : 'absolute',
                  pointerEvents: 'none',
                  borderRadius: '6px',
                  objectFit: 'cover',
                  border: '1px solid rgba(56, 189, 248, 0.45)',
                }}
              />
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#7dd3fc',
                }}
              >
                📷 Emotion City Picker (Optional)
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                {!observer.cameraActive ? (
                  <button
                    type="button"
                    className="freeroam-city-chip"
                    onClick={async () => {
                      await observer.enableCamera();
                      setAutoEmotionCity(true);
                    }}
                    disabled={observer.cameraLoading}
                    title="Optionally use your webcam facial expression to pick a matching driving city, or keep choosing manually"
                  >
                    {observer.cameraLoading
                      ? 'Starting Camera...'
                      : 'Use Camera to Pick City by Mood'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`freeroam-city-chip ${autoEmotionCity ? 'is-active' : ''}`}
                      onClick={() => {
                        const next = !autoEmotionCity;
                        setAutoEmotionCity(next);
                        if (next && observer.facialCueState.faceDetected) {
                          onSelectCity(emotionRecommendation.city);
                        }
                      }}
                      title="Automatically switch driving city based on your live facial expression"
                    >
                      {autoEmotionCity ? 'Auto Mood City: ON' : 'Auto Mood City: OFF (Manual)'}
                    </button>

                    <button
                      type="button"
                      className="freeroam-city-chip"
                      onClick={() => onSelectCity(emotionRecommendation.city)}
                      title={emotionRecommendation.reason}
                    >
                      {emotionRecommendation.moodEmoji} Match Mood: {emotionRecommendation.city.name}
                    </button>

                    <button
                      type="button"
                      className="freeroam-city-chip"
                      onClick={() => {
                        setAutoEmotionCity(false);
                        observer.disableCamera();
                      }}
                      title="Turn off camera and choose city manually"
                    >
                      Camera Off
                    </button>
                  </>
                )}
              </div>
            </div>

            {observer.cameraActive && (
              <div
                style={{
                  fontSize: '0.7rem',
                  color: '#cbd5e1',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(56, 189, 248, 0.22)',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span>
                  {observer.facialCueState.faceDetected ? (
                    <>
                      <strong>
                        {emotionRecommendation.moodEmoji} {emotionRecommendation.moodLabel}:
                      </strong>{' '}
                      {emotionRecommendation.reason}
                    </>
                  ) : (
                    'Camera active — center your face in frame to detect mood, or pick any city manually above.'
                  )}
                </span>
              </div>
            )}

            {observer.cameraError && (
              <div style={{ fontSize: '0.68rem', color: '#fda4af' }}>
                {observer.cameraError} — manual city selection is active.
              </div>
            )}
          </div>
        )}

        {/* Mapbox 3D Ground Imagery Layer Switcher */}
        <div
          className="freeroam-quick-cities"
          style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(148, 163, 184, 0.14)' }}
          aria-label="Mapbox 3D Ground Layer Style"
        >
          {MAPBOX_STYLE_OPTIONS.map((opt) => {
            const active = mapboxStyle === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`freeroam-city-chip ${active ? 'is-active' : ''}`}
                onClick={() => setMapboxStyle(opt.id)}
                title={opt.label}
              >
                {opt.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable Address & Coordinate Search Modal */}
      {isSearchOpen && (
        <div
          className="freeroam-search-drawer"
          role="dialog"
          aria-label="Search Real-Earth Address or Coordinates"
        >
          <div className="freeroam-search-drawer-header">
            <div>
              <span className="freeroam-search-kicker">
                WORLDWIDE ADDRESS & GPS TELEPORT
              </span>
              <h4 className="freeroam-search-heading">
                Search Any Real-Earth Address, Postcode, or Coordinates
              </h4>
            </div>
            <button
              type="button"
              className="freeroam-drawer-close"
              onClick={() => setIsSearchOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Search by Address, Postcode, or "lat, lng" */}
          <form
            className="freeroam-address-form"
            onSubmit={handleSearchFormSubmit}
          >
            <input
              type="text"
              className="freeroam-search-input"
              placeholder="Search e.g. Central London, Harrow HA1, Station Rd, Oxford St, or 51.5806, -0.3420..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="freeroam-search-submit"
              disabled={isTeleporting}
            >
              {isTeleporting ? 'Loading...' : 'Go Here'}
            </button>
          </form>

          {/* Direct Latitude & Longitude Coordinate Inputs */}
          <form
            className="freeroam-coord-form"
            onSubmit={handleDirectCoordinateTeleport}
          >
            <div className="freeroam-coord-field">
              <label>Latitude (°N/S)</label>
              <input
                type="number"
                step="any"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                placeholder="51.5806"
              />
            </div>
            <div className="freeroam-coord-field">
              <label>Longitude (°E/W)</label>
              <input
                type="number"
                step="any"
                value={lngInput}
                onChange={(e) => setLngInput(e.target.value)}
                placeholder="-0.3420"
              />
            </div>
            <button
              type="submit"
              className="freeroam-coord-btn"
              disabled={isTeleporting}
            >
              Teleport to Coordinates
            </button>
          </form>

          {statusMessage && (
            <div className="freeroam-search-status">{statusMessage}</div>
          )}

          {/* Results List */}
          <div className="freeroam-results-list">
            {isSearching && (
              <div className="freeroam-results-loading">
                Searching Mapbox Geocoding API &amp; Real-Earth Gazetteer...
              </div>
            )}
            {!isSearching &&
              results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="freeroam-result-item"
                  onClick={() => handleSelectResult(item)}
                  disabled={isTeleporting}
                >
                  <div className="freeroam-result-main">
                    <span className="freeroam-result-title">{item.title}</span>
                    <span className="freeroam-result-sub">{item.subtitle}</span>
                  </div>
                  <div className="freeroam-result-coords">
                    <span>
                      {item.lat.toFixed(4)}°, {item.lng.toFixed(4)}°
                    </span>
                    <span className="freeroam-result-badge">
                      {item.source === 'preset'
                        ? '3D City Preset'
                        : item.source === 'mapbox'
                          ? 'Mapbox Live'
                          : item.source === 'osm-nominatim'
                            ? 'OpenStreetMap'
                            : item.source === 'coordinates'
                              ? 'GPS Coords'
                              : 'UK Gazetteer'}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
