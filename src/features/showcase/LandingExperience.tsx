/**
 * PARKLAB 3D — Continuous Cinematic Automotive Landing Experience
 * Combines Lenis smooth scrolling, a full-viewport real-time 3D vehicle stage,
 * scroll-driven vehicle chapters + Car Craft studio selector, compact previews
 * of the 5 UK parking manoeuvres, Real-Earth Free Roam city selector (Central London,
 * Harrow UK, Global GPS Search), and a direct transition into gameplay.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { CHALLENGES } from '../challenges/challengesData';
import type { ParkingChallengeDefinition } from '../challenges/types';
import {
  getChassisSpec,
  getVehicleById,
} from '../vehicles/vehicles';
import {
  getLeaderboardStandings,
  loadDriverProfile,
} from '../leaderboard/leaderboardStore';
import { REAL_CITIES_PRESETS } from '../cities/realCitiesData';
import { recommendCityFromFacialCue } from '../cities/CitySearchPanel';
import { useWebcamFacialObserver } from '../evaluation/useWebcamFacialObserver';
import { CustomizationStudioPanel } from '../../components/ui/CustomizationStudioPanel';
import { useLenisScroll } from '../../hooks/useLenisScroll';
import { ShowcaseCanvas } from './ShowcaseCanvas';
import './showcase.css';

export interface LandingExperienceProps {
  selectedVehicleId: string;
  onSelectVehicle: (vehicleId: string) => void;
  selectedChallengeId: string;
  onSelectChallenge: (challengeId: string) => void;
  onStartDriving: () => void;
  onStartFreeRoam?: (cityId?: string) => void;
  isTransitioningOut?: boolean;
}

/**
 * Showcase order places the flagship New Tesla Roadster (with SpaceX 3D Flight) first,
 * followed by the Obsidian V12 Hypercar, Porsche Taycan 4S, Mercedes-AMG GT R,
 * Executive Sedan, Large SUV, and Modern Hatchback.
 */
const SHOWCASE_VEHICLE_ORDER = [
  'tesla-roadster',
  'apex-hypercar',
  'porsche-taycan',
  'amg-gt',
  'sedan',
  'suv',
  'hatchback',
] as const;

interface VehicleEditorialCopy {
  chapterNumber: string;
  badge: string;
  eyebrow: string;
  headline: string;
  description: string;
  msrpLabel: string;
  highlightSpecs: { label: string; value: string }[];
}

const STUDIO_PAINT_FINISHES = [
  { id: 'rdstr-silver', label: 'RDSTR Studio Silver', color: '#dde2e9' },
  { id: 'ultra-red', label: 'Ultra Red Multi-Coat', color: '#dc2626' },
  { id: 'quicksilver', label: 'Quicksilver Metallic', color: '#94a3b8' },
  { id: 'obsidian', label: 'Obsidian Carbon', color: '#12151e' },
] as const;

const VEHICLE_EDITORIAL: Record<string, VehicleEditorialCopy> = {
  'tesla-roadster': {
    chapterNumber: '01',
    badge: 'RDSTR STUDIO CONCEPT · SPACEX 3D FLIGHT',
    eyebrow: 'BRONZE GLASSHOUSE · 5-SPOKE AERO TURBINES · QUAD COLD-GAS THRUSTERS',
    headline: 'New Tesla Roadster',
    description:
      'Authentic Tesla Design Studio RDSTR concept featuring a monolithic wedge-fastback silhouette, warm bronze electrochromic flush glasshouse, 5-spoke brushed-silver concave aero-dish & gloss-black star wheels, recessed Kammback single-line red laser lightbar, RDSTR plate, and 4-strake carbon Venturi diffuser with SpaceX 3D flight thrusters.',
    msrpLabel: '$250,000',
    highlightSpecs: [
      { label: '0–60 MPH', value: '1.9 s' },
      { label: '3D FLIGHT', value: '38m Ceiling' },
      { label: 'WHEELS', value: '5-Spoke Aero' },
      { label: 'REAR SPEC', value: 'RDSTR Laser' },
    ],
  },
  'apex-hypercar': {
    chapterNumber: '02',
    badge: 'TRACK V12 HYPERCAR',
    eyebrow: 'MID-ENGINE CARBON MONOCOQUE',
    headline: 'Obsidian V12 Hypercar',
    description:
      'Low-slung obsidian aerodynamic wedge featuring front wheel-arch downforce cutaways, a silver-anodized roofline arc, slatted V12 engine louvers, and cross-drilled carbon-ceramic rotors with crimson 6-piston calipers.',
    msrpLabel: '$485,000',
    highlightSpecs: [
      { label: 'POWERTRAIN', value: '6.5L V12' },
      { label: 'LENGTH', value: '4.68 m' },
      { label: 'STEERING LOCK', value: '2.9 rad/s' },
      { label: 'BODY WIDTH', value: '2.02 m' },
    ],
  },
  'porsche-taycan': {
    chapterNumber: '03',
    badge: 'ELECTRIC FASTBACK',
    eyebrow: 'STANDARD RANGE 79.2 KWH AWD · CAR CRAFT EDITION',
    headline: 'Porsche Taycan 4S',
    description:
      'Jet Black Metallic four-door electric sports saloon with 4-point Matrix LED headlights, satin silver window daylight opening trim, flush door handles, and 20" Taycan Turbo Aero forged bi-tone wheels.',
    msrpLabel: '$92,760',
    highlightSpecs: [
      { label: 'BATTERY', value: '79.2 kWh AWD' },
      { label: 'WHEELS', value: '20" Turbo Aero' },
      { label: 'LENGTH', value: '4.96 m' },
      { label: 'BODY WIDTH', value: '1.96 m' },
    ],
  },
  'amg-gt': {
    chapterNumber: '04',
    badge: 'TWIN-TURBO V8 COUPÉ',
    eyebrow: 'TRANS-AXLE GRAND TOURER · SPEKTRA EDITION',
    headline: 'Mercedes-AMG GT R',
    description:
      'Satin Gunmetal Grey long-bonnet fastback coupé with a vertical-slat Panamericana grille, wide sculpted rear haunches, slim horizontal crimson-amber LED tail lamps, and quad-exhaust rear diffuser.',
    msrpLabel: '$162,900',
    highlightSpecs: [
      { label: 'ENGINE', value: '4.0L V8 Biturbo' },
      { label: 'WHEELBASE', value: '2.63 m' },
      { label: 'LENGTH', value: '4.55 m' },
      { label: 'BODY WIDTH', value: '1.94 m' },
    ],
  },
  sedan: {
    chapterNumber: '05',
    badge: 'EXECUTIVE SALOON',
    eyebrow: 'LONG-WHEELBASE GRAND TOURER',
    headline: 'Executive Sedan',
    description:
      'A sleek 4.85-metre three-box silhouette with balanced weight distribution and a 2.94m wheelbase. Demands smooth mirror-guided reference points and composed steering inputs through tight reverse arcs.',
    msrpLabel: '$68,400',
    highlightSpecs: [
      { label: 'WHEELBASE', value: '2.94 m' },
      { label: 'LENGTH', value: '4.85 m' },
      { label: 'STEERING LOCK', value: '1.95 rad/s' },
      { label: 'BODY WIDTH', value: '1.86 m' },
    ],
  },
  suv: {
    chapterNumber: '06',
    badge: 'LUXURY 4X4 UTILITY',
    eyebrow: 'COMMANDING WIDE-BODY PRESENCE',
    headline: 'Large SUV',
    description:
      'Our largest chassis at 4.95 metres long and 1.98 metres wide. Elevated ground clearance and substantial kerb momentum leave minimal lateral margin inside standard UK parking bays.',
    msrpLabel: '$84,200',
    highlightSpecs: [
      { label: 'CLEARANCE', value: '250 mm' },
      { label: 'LENGTH', value: '4.95 m' },
      { label: 'STEERING LOCK', value: '1.65 rad/s' },
      { label: 'BODY WIDTH', value: '1.98 m' },
    ],
  },
  hatchback: {
    chapterNumber: '07',
    badge: 'URBAN BENCHMARK',
    eyebrow: 'COMPACT AGILE HATCH',
    headline: 'Modern Hatchback',
    description:
      'The classic UK driving test benchmark. Short front and rear overhangs paired with a rapid 2.4 rad/s steering rack make it exceptionally responsive when pivoting into parallel and 90-degree bays.',
    msrpLabel: '$38,900',
    highlightSpecs: [
      { label: 'WHEELBASE', value: '2.56 m' },
      { label: 'LENGTH', value: '4.10 m' },
      { label: 'STEERING LOCK', value: '2.40 rad/s' },
      { label: 'BODY WIDTH', value: '1.78 m' },
    ],
  },
};

function ManoeuvreSchematic({
  challenge,
}: {
  challenge: ParkingChallengeDefinition;
}) {
  const id = challenge.id;

  if (id === 'parallel') {
    return (
      <svg viewBox="0 0 180 96" className="manoeuvre-schematic-svg" aria-hidden="true">
        <line x1="140" y1="6" x2="140" y2="90" stroke="rgba(148,163,184,0.35)" strokeWidth="3" />
        <rect x="108" y="8" width="24" height="22" rx="4" fill="rgba(71,85,105,0.45)" stroke="rgba(148,163,184,0.4)" />
        <rect x="104" y="34" width="30" height="28" rx="4" fill="rgba(239,68,68,0.14)" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
        <rect x="108" y="66" width="24" height="22" rx="4" fill="rgba(71,85,105,0.45)" stroke="rgba(148,163,184,0.4)" />
        <path d="M 68 20 C 68 42, 118 32, 118 48" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
        <rect x="56" y="10" width="22" height="14" rx="3" fill="#dc2626" />
      </svg>
    );
  }

  if (id === 'reverse-bay') {
    return (
      <svg viewBox="0 0 180 96" className="manoeuvre-schematic-svg" aria-hidden="true">
        <rect x="72" y="10" width="36" height="32" rx="4" fill="rgba(239,68,68,0.14)" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
        <rect x="34" y="10" width="32" height="32" rx="4" fill="rgba(71,85,105,0.35)" stroke="rgba(148,163,184,0.3)" />
        <rect x="114" y="10" width="32" height="32" rx="4" fill="rgba(71,85,105,0.35)" stroke="rgba(148,163,184,0.3)" />
        <path d="M 42 72 Q 90 70 90 26" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
        <rect x="26" y="64" width="26" height="15" rx="3" fill="#dc2626" />
      </svg>
    );
  }

  if (id === 'forward-bay') {
    return (
      <svg viewBox="0 0 180 96" className="manoeuvre-schematic-svg" aria-hidden="true">
        <rect x="72" y="10" width="36" height="32" rx="4" fill="rgba(239,68,68,0.14)" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
        <rect x="34" y="10" width="32" height="32" rx="4" fill="rgba(71,85,105,0.35)" stroke="rgba(148,163,184,0.3)" />
        <rect x="114" y="10" width="32" height="32" rx="4" fill="rgba(71,85,105,0.35)" stroke="rgba(148,163,184,0.3)" />
        <path d="M 136 76 Q 90 66 90 26" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
        <rect x="122" y="68" width="26" height="15" rx="3" fill="#dc2626" />
      </svg>
    );
  }

  if (id === 'angled-bay') {
    return (
      <svg viewBox="0 0 180 96" className="manoeuvre-schematic-svg" aria-hidden="true">
        <g transform="translate(92,28) rotate(-35)">
          <rect x="-18" y="-16" width="36" height="32" rx="4" fill="rgba(239,68,68,0.14)" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
        </g>
        <path d="M 48 80 Q 68 52 92 28" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
        <rect x="36" y="70" width="24" height="14" rx="3" fill="#dc2626" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 180 96" className="manoeuvre-schematic-svg" aria-hidden="true">
      <line x1="142" y1="6" x2="142" y2="90" stroke="rgba(148,163,184,0.35)" strokeWidth="3" />
      <rect x="106" y="48" width="30" height="34" rx="4" fill="rgba(239,68,68,0.14)" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M 64 78 C 68 42, 121 36, 121 18 L 121 65" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
      <rect x="110" y="12" width="22" height="14" rx="3" fill="#dc2626" />
    </svg>
  );
}

export function LandingExperience({
  selectedVehicleId,
  onSelectVehicle,
  onSelectChallenge,
  onStartDriving,
  onStartFreeRoam,
  isTransitioningOut = false,
}: LandingExperienceProps) {
  const { scrollStateRef, progressBarRef, scrollTo } = useLenisScroll(true);

  // Allow user to drag on the 3D stage to inspect the car from any angle
  const [interactiveOrbitYaw, setInteractiveOrbitYaw] = useState(0);
  const [customPaintByVehicle, setCustomPaintByVehicle] = useState<
    Record<string, string>
  >({});
  const isDraggingStageRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartYawRef = useRef(0);

  // Track if the user explicitly clicked a vehicle card to lock their choice
  const userLockedVehicleRef = useRef(false);
  const chapterRefs = useRef<Record<string, HTMLElement | null>>({});

  const baseSelectedVehicle = getVehicleById(selectedVehicleId);
  const selectedVehicle = {
    ...baseSelectedVehicle,
    bodyColor:
      customPaintByVehicle[baseSelectedVehicle.id] ??
      baseSelectedVehicle.bodyColor,
  };
  const selectedChassis = getChassisSpec(selectedVehicle);
  const activeEditorial =
    VEHICLE_EDITORIAL[selectedVehicle.id] ?? VEHICLE_EDITORIAL['tesla-roadster'];

  const driverProfile = loadDriverProfile();
  const leaderboardTop = getLeaderboardStandings(
    driverProfile,
    selectedVehicle.name
  ).slice(0, 5);

  // Optional Webcam Emotion Observer for choosing a Real-Earth Free Roam city by mood
  const webcamObserver = useWebcamFacialObserver();
  const emotionRecommendation = useMemo(
    () => recommendCityFromFacialCue(webcamObserver.facialCueState),
    [webcamObserver.facialCueState]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (userLockedVehicleRef.current) {
          return;
        }
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            const vehicleId = entry.target.getAttribute('data-vehicle-id');
            if (vehicleId) {
              onSelectVehicle(vehicleId);
            }
          }
        }
      },
      {
        threshold: [0.45, 0.65],
        rootMargin: '-15% 0px -25% 0px',
      }
    );

    SHOWCASE_VEHICLE_ORDER.forEach((id) => {
      const el = chapterRefs.current[id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [onSelectVehicle]);

  const handleManualVehicleSelect = useCallback(
    (vehicleId: string) => {
      userLockedVehicleRef.current = true;
      onSelectVehicle(vehicleId);
    },
    [onSelectVehicle]
  );

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingStageRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartYawRef.current = interactiveOrbitYaw;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingStageRef.current) return;
    const deltaX = e.clientX - dragStartXRef.current;
    setInteractiveOrbitYaw(dragStartYawRef.current + deltaX * 0.0085);
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingStageRef.current) return;
    isDraggingStageRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const topSpeedMph = Math.round(
    selectedVehicle.handling.maxForwardSpeedMps * 2.23694
  );

  return (
    <div
      className={`landing-experience ${
        isTransitioningOut ? 'landing-experience--exiting' : ''
      }`}
    >
      {/* Top Scroll Progress Bar synchronized with Lenis */}
      <div className="landing-scroll-progress-track" aria-hidden="true">
        <div ref={progressBarRef} className="landing-scroll-progress-bar" />
      </div>

      {/* Fixed Real-Time 3D Automotive Studio Stage */}
      <div className="landing-3d-stage" aria-hidden="true">
        <ShowcaseCanvas
          vehicle={selectedVehicle}
          scrollStateRef={scrollStateRef}
          interactiveOrbitYaw={interactiveOrbitYaw}
        />
        <div className="landing-3d-vignette" />
      </div>

      {/* Floating Minimal Automotive Header */}
      <header className="landing-header">
        <div className="landing-header__brand">
          <button
            type="button"
            className="landing-brand-btn"
            onClick={() => scrollTo('#hero')}
          >
            <span className="landing-brand-btn__dot" />
            <span className="landing-brand-btn__title">PARKLAB 3D</span>
            <span className="landing-brand-btn__tag">STUDIO // SIMULATOR</span>
          </button>
        </div>

        <nav className="landing-header__nav" aria-label="Experience sections">
          <button
            type="button"
            className="landing-nav-link"
            onClick={() => scrollTo('#hero')}
          >
            <span>01</span> Hero
          </button>
          <button
            type="button"
            className="landing-nav-link"
            onClick={() => scrollTo('#showcase')}
          >
            <span>02</span> Fleet Showcase
          </button>
          <button
            type="button"
            className="landing-nav-link"
            onClick={() => scrollTo('#manoeuvres')}
          >
            <span>03</span> 5 Manoeuvres
          </button>
          <button
            type="button"
            className="landing-nav-link"
            onClick={() => scrollTo('#launch')}
          >
            <span>04</span> Free Roam &amp; Drive
          </button>
        </nav>

        <div className="landing-header__actions">
          <div
            className="landing-active-vehicle-pill"
            title={`Driver Rank: ${driverProfile.rankTitle} (${driverProfile.totalPoints.toLocaleString()} PTS)`}
          >
            <span
              className="landing-active-vehicle-pill__swatch"
              style={{ backgroundColor: '#f59e0b' }}
            />
            <span className="landing-active-vehicle-pill__label">
              LV {driverProfile.level} · {driverProfile.totalPoints.toLocaleString()} PTS
            </span>
          </div>
          <div className="landing-active-vehicle-pill">
            <span
              className="landing-active-vehicle-pill__swatch"
              style={{ backgroundColor: selectedVehicle.bodyColor }}
            />
            <span className="landing-active-vehicle-pill__label">
              {selectedVehicle.name}
            </span>
          </div>
          {onStartFreeRoam && (
            <button
              type="button"
              className="landing-header__drive-btn"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              }}
              onClick={() => onStartFreeRoam('central-london-uk')}
            >
              FREE ROAM (EARTH)
              <span aria-hidden="true">→</span>
            </button>
          )}
          <button
            type="button"
            className="landing-header__drive-btn"
            onClick={onStartDriving}
          >
            START DRIVING
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </header>

      {/* Scrollable Narrative Content Layer */}
      <main className="landing-content">
        {/* ================================================================
            01. FULL-SCREEN AUTOMOTIVE HERO
           ================================================================ */}
        <section id="hero" className="landing-hero">
          <div className="landing-hero__container">
            <div className="landing-hero__copy">
              <div className="landing-hero__eyebrow">
                <span className="landing-hero__eyebrow-pulse" />
                <span>01 // REAL-LIFE CRASH PHYSICS &amp; REAL-EARTH CITIES</span>
              </div>

              <h1 className="landing-hero__headline">
                MASTER
                <br />
                EVERY MOVE.
              </h1>

              <p className="landing-hero__description">
                Experience real-life crash physics with structural car health,
                dents, and detachable 3D body parts. Roam real Earth cities
                including Central London and Harrow UK (or search any address &amp;
                coordinates), or master the 5 UK DVSA parking challenges.
              </p>

              <div className="landing-hero__cta-row">
                <button
                  type="button"
                  className="landing-btn landing-btn--primary"
                  onClick={onStartDriving}
                >
                  <span>LAUNCH CHALLENGES MODE</span>
                  <span className="landing-btn__arrow" aria-hidden="true">
                    →
                  </span>
                </button>

                {onStartFreeRoam && (
                  <button
                    type="button"
                    className="landing-btn landing-btn--ghost"
                    onClick={() => onStartFreeRoam('central-london-uk')}
                  >
                    <span>FREE ROAM: CENTRAL LONDON &amp; HARROW UK</span>
                    <span className="landing-btn__arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                )}
              </div>

              <div className="landing-hero__featured-meta">
                <div className="landing-hero__meta-item">
                  <span className="landing-hero__meta-label">FEATURED MACHINE</span>
                  <strong className="landing-hero__meta-value">
                    {selectedVehicle.name}
                  </strong>
                </div>
                <div className="landing-hero__meta-divider" />
                <div className="landing-hero__meta-item">
                  <span className="landing-hero__meta-label">CRASH PHYSICS</span>
                  <strong className="landing-hero__meta-value">
                    Dents · Loose Parts · 0–100% Health
                  </strong>
                </div>
                <div className="landing-hero__meta-divider" />
                <div className="landing-hero__meta-item">
                  <span className="landing-hero__meta-label">FREE ROAM EARTH</span>
                  <strong className="landing-hero__meta-value">
                    London · Harrow UK · Global GPS
                  </strong>
                </div>
              </div>
            </div>

            {/* Interactive 3D Stage Drag Zone on the right side of Hero */}
            <div
              className="landing-hero__stage-interact"
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={handleStagePointerUp}
              onPointerCancel={handleStagePointerUp}
              title="Drag horizontally to rotate the 3D vehicle"
            >
              <div className="landing-stage-orbit-badge">
                <span>↔ DRAG TO ORBIT 3D STUDIO</span>
                <button
                  type="button"
                  className="landing-stage-orbit-reset"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInteractiveOrbitYaw(
                      Math.abs(interactiveOrbitYaw - 1.95) < 0.15 ? 0 : 1.95
                    );
                  }}
                >
                  {Math.abs(interactiveOrbitYaw - 1.95) < 0.15
                    ? 'Front 3/4 View'
                    : 'RDSTR Rear 3/4 View'}
                </button>
                {Math.abs(interactiveOrbitYaw) > 0.05 &&
                  Math.abs(interactiveOrbitYaw - 1.95) >= 0.15 && (
                    <button
                      type="button"
                      className="landing-stage-orbit-reset"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInteractiveOrbitYaw(0);
                      }}
                    >
                      Reset Angle
                    </button>
                  )}
              </div>
            </div>
          </div>

          {/* Subtle Scroll Indicator */}
          <button
            type="button"
            className="landing-scroll-indicator"
            onClick={() => scrollTo('#showcase')}
            aria-label="Scroll down to explore the vehicles"
          >
            <span className="landing-scroll-indicator__text">
              SCROLL THROUGH THE CARS
            </span>
            <span className="landing-scroll-indicator__circle">↓</span>
          </button>
        </section>

        {/* ================================================================
            02. INTERACTIVE 3D VEHICLE SHOWCASE (SCROLL + STUDIO CONFIGURATOR)
           ================================================================ */}
        <section id="showcase" className="landing-showcase">
          <div className="showcase-sticky-hud">
            <div className="showcase-studio-frame">
              {/* Top Studio Telemetry Header */}
              <div className="showcase-studio-top">
                <div className="showcase-studio-top__left">
                  <div className="showcase-tag-row">
                    <span className="showcase-tag showcase-tag--accent">
                      {activeEditorial.badge}
                    </span>
                    <span className="showcase-tag">
                      {selectedVehicle.dimensions.length.toFixed(2)}M LENGTH
                    </span>
                    <span className="showcase-tag">
                      {selectedChassis.wheelbase.toFixed(2)}M WHEELBASE
                    </span>
                  </div>
                  <h2 className="showcase-active-title">
                    {selectedVehicle.name}
                  </h2>
                  <p className="showcase-active-subtitle">
                    {selectedChassis.tagline}
                  </p>
                </div>

                <div className="showcase-studio-top__right">
                  <div className="showcase-camera-angles" role="group" aria-label="Studio camera angle presets">
                    <button
                      type="button"
                      className={`showcase-angle-btn ${
                        Math.abs(interactiveOrbitYaw) < 0.1 ? 'is-active' : ''
                      }`}
                      onClick={() => setInteractiveOrbitYaw(0)}
                    >
                      Scroll Sync
                    </button>
                    <button
                      type="button"
                      className={`showcase-angle-btn ${
                        Math.abs(interactiveOrbitYaw - 0.85) < 0.15 ? 'is-active' : ''
                      }`}
                      onClick={() => setInteractiveOrbitYaw(0.85)}
                    >
                      Side Profile
                    </button>
                    <button
                      type="button"
                      className={`showcase-angle-btn ${
                        Math.abs(interactiveOrbitYaw - 1.95) < 0.18 ? 'is-active' : ''
                      }`}
                      onClick={() => setInteractiveOrbitYaw(1.95)}
                    >
                      RDSTR Rear 3/4
                    </button>
                  </div>

                  {/* Studio Exterior Paint Finish Selector (RDSTR Silver / Ultra Red / Quicksilver / Obsidian) */}
                  <div
                    className="showcase-camera-angles"
                    role="group"
                    aria-label="Exterior paint finish"
                  >
                    {STUDIO_PAINT_FINISHES.map((finish) => {
                      const isCurrentColor =
                        selectedVehicle.bodyColor.toLowerCase() ===
                        finish.color.toLowerCase();
                      return (
                        <button
                          key={finish.id}
                          type="button"
                          className={`showcase-angle-btn ${
                            isCurrentColor ? 'is-active' : ''
                          }`}
                          onClick={() =>
                            setCustomPaintByVehicle((prev) => ({
                              ...prev,
                              [selectedVehicle.id]: finish.color,
                            }))
                          }
                          title={finish.label}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: finish.color,
                              border: '1px solid rgba(255,255,255,0.45)',
                              display: 'inline-block',
                            }}
                          />
                          <span>{finish.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="showcase-readout-box">
                    <span className="showcase-readout-box__label">
                      TOTAL CONFIG // SPEC
                    </span>
                    <strong className="showcase-readout-box__value">
                      {activeEditorial.msrpLabel} ·{' '}
                      {selectedVehicle.isFlyingVehicle
                        ? '3D FLIGHT ENABLED'
                        : selectedVehicle.name.toUpperCase()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Interactive Drag Surface in the Middle of the Sticky Frame */}
              <div
                className="showcase-studio-drag-zone"
                onPointerDown={handleStagePointerDown}
                onPointerMove={handleStagePointerMove}
                onPointerUp={handleStagePointerUp}
                onPointerCancel={handleStagePointerUp}
              >
                <span className="showcase-frame-corner showcase-frame-corner--tl" />
                <span className="showcase-frame-corner showcase-frame-corner--tr" />
                <span className="showcase-frame-corner showcase-frame-corner--bl" />
                <span className="showcase-frame-corner showcase-frame-corner--br" />
              </div>

              {/* Bottom Car Craft Vehicle Selection Dock */}
              <div className="showcase-selector-dock">
                <div className="showcase-selector-cards" role="radiogroup" aria-label="Select your vehicle">
                  {SHOWCASE_VEHICLE_ORDER.map((vehId) => {
                    const veh = getVehicleById(vehId);
                    const spec = getChassisSpec(veh);
                    const editorial = VEHICLE_EDITORIAL[veh.id];
                    const isSelected = veh.id === selectedVehicle.id;

                    return (
                      <button
                        key={veh.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`showcase-vehicle-card ${
                          isSelected ? 'showcase-vehicle-card--selected' : ''
                        } ${
                          veh.id === 'tesla-roadster'
                            ? 'showcase-vehicle-card--roadster'
                            : ''
                        }`}
                        onClick={() => handleManualVehicleSelect(veh.id)}
                      >
                        <div className="showcase-vehicle-card__icon">
                          <span
                            className="showcase-vehicle-card__swatch"
                            style={{ backgroundColor: veh.bodyColor }}
                          />
                          <span className="showcase-vehicle-card__rim" />
                        </div>
                        <div className="showcase-vehicle-card__info">
                          <div className="showcase-vehicle-card__top">
                            <span className="showcase-vehicle-card__name">
                              {veh.name}
                            </span>
                            {veh.id === 'tesla-roadster' && (
                              <span className="showcase-vehicle-card__star">
                                FLAGSHIP
                              </span>
                            )}
                          </div>
                          <span className="showcase-vehicle-card__meta">
                            {veh.dimensions.length.toFixed(2)}m ×{' '}
                            {veh.dimensions.width.toFixed(2)}m ·{' '}
                            {editorial?.badge ?? spec.tagline}
                          </span>
                        </div>
                        <span className="showcase-vehicle-card__status">
                          {isSelected ? 'SELECTED' : 'SELECT'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="showcase-dock-footer">
                  <div className="showcase-dock-specs">
                    <span>
                      <strong>LENGTH:</strong>{' '}
                      {selectedVehicle.dimensions.length.toFixed(2)}m
                    </span>
                    <span>
                      <strong>WIDTH:</strong>{' '}
                      {selectedVehicle.dimensions.width.toFixed(2)}m
                    </span>
                    <span>
                      <strong>TOP SPEED:</strong> {topSpeedMph} mph
                    </span>
                    <span>
                      <strong>ACCEL:</strong>{' '}
                      {selectedVehicle.handling.accelerationMps2.toFixed(1)} m/s²
                    </span>
                  </div>

                  <button
                    type="button"
                    className="showcase-dock-drive-btn"
                    onClick={onStartDriving}
                  >
                    DRIVE {selectedVehicle.name.toUpperCase()}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll-Driven Narrative Vehicle Chapters */}
          <div className="showcase-chapters">
            {SHOWCASE_VEHICLE_ORDER.map((vehId, index) => {
              const veh = getVehicleById(vehId);
              const editorial = VEHICLE_EDITORIAL[veh.id];
              const isSelected = veh.id === selectedVehicle.id;
              const alignRight = index % 2 === 1;

              return (
                <article
                  key={veh.id}
                  ref={(el) => {
                    chapterRefs.current[veh.id] = el;
                  }}
                  data-vehicle-id={veh.id}
                  className={`showcase-chapter ${
                    alignRight
                      ? 'showcase-chapter--right'
                      : 'showcase-chapter--left'
                  }`}
                >
                  <div
                    className={`showcase-chapter__card ${
                      isSelected ? 'showcase-chapter__card--active' : ''
                    }`}
                  >
                    <div className="showcase-chapter__header">
                      <span className="showcase-chapter__num">
                        02.{editorial.chapterNumber}
                      </span>
                      <span className="showcase-chapter__eyebrow">
                        {editorial.eyebrow}
                      </span>
                    </div>

                    <h3 className="showcase-chapter__title">
                      {editorial.headline}
                    </h3>

                    <p className="showcase-chapter__desc">
                      {editorial.description}
                    </p>

                    <div className="showcase-chapter__specs-grid">
                      {editorial.highlightSpecs.map((item) => (
                        <div
                          key={item.label}
                          className="showcase-chapter__spec-cell"
                        >
                          <span className="showcase-chapter__spec-label">
                            {item.label}
                          </span>
                          <strong className="showcase-chapter__spec-value">
                            {item.value}
                          </strong>
                        </div>
                      ))}
                    </div>

                    <div className="showcase-chapter__actions">
                      <button
                        type="button"
                        className={`showcase-chapter__select-btn ${
                          isSelected ? 'is-selected' : ''
                        }`}
                        onClick={() => handleManualVehicleSelect(veh.id)}
                      >
                        {isSelected
                          ? '✓ SELECTED FOR SIMULATION'
                          : `SELECT ${veh.name.toUpperCase()}`}
                      </button>

                      <button
                        type="button"
                        className="showcase-chapter__launch-link"
                        onClick={() => {
                          handleManualVehicleSelect(veh.id);
                          onStartDriving();
                        }}
                      >
                        Drive Immediately →
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ================================================================
            03. FIVE PARKING MANOEUVRES & REAL-EARTH FREE ROAM PREVIEW
           ================================================================ */}
        <section id="manoeuvres" className="landing-manoeuvres">
          <div className="landing-manoeuvres__inner">
            <div className="landing-section-header">
              <span className="landing-section-header__eyebrow">
                03 // CHALLENGES OR REAL-EARTH FREE ROAM
              </span>
              <h2 className="landing-section-header__title">
                5 UK DVSA BAYS &amp; REAL-WORLD CITIES.
              </h2>
              <p className="landing-section-header__subtitle">
                Every collision features real-life momentum transfer, 3D sheet-metal
                dents, detachable bumpers/mirrors/bonnets, and a 0–100% car health
                bar with automatic restart when depleted. Choose a manoeuvre below
                or jump straight into Central London, Harrow UK, or any global address.
              </p>
            </div>

            <div className="manoeuvres-preview-grid">
              {CHALLENGES.map((challenge, idx) => (
                <div
                  key={challenge.id}
                  className="manoeuvre-preview-card"
                  onClick={() => {
                    onSelectChallenge(challenge.id);
                    onStartDriving();
                  }}
                >
                  <div className="manoeuvre-preview-card__top">
                    <span className="manoeuvre-preview-card__index">
                      0{idx + 1}
                    </span>
                    <span
                      className={`manoeuvre-preview-card__difficulty manoeuvre-preview-card__difficulty--${challenge.difficulty.toLowerCase()}`}
                    >
                      {challenge.difficulty}
                    </span>
                  </div>

                  <div className="manoeuvre-preview-card__visual">
                    <ManoeuvreSchematic challenge={challenge} />
                  </div>

                  <h3 className="manoeuvre-preview-card__title">
                    {challenge.title}
                  </h3>

                  <p className="manoeuvre-preview-card__desc">
                    {challenge.description}
                  </p>

                  <div className="manoeuvre-preview-card__footer">
                    <span>
                      Bay: {challenge.parkingTarget.width.toFixed(1)}m ×{' '}
                      {challenge.parkingTarget.length.toFixed(1)}m
                    </span>
                    <span>
                      {challenge.obstacles.length} obstacles
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Global Park Master Leaderboard Preview */}
            <div className="showcase-leaderboard-preview">
              <div className="showcase-leaderboard-preview__header">
                <div>
                  <span className="landing-section-header__eyebrow">
                    GLOBAL STANDINGS // XP &amp; RANK SYSTEM
                  </span>
                  <h3 className="showcase-leaderboard-preview__title">
                    PARK MASTER LEADERBOARD
                  </h3>
                </div>
                <div className="showcase-leaderboard-preview__self">
                  <span>YOUR DRIVER RANK:</span>
                  <strong>
                    LV {driverProfile.level} · {driverProfile.rankTitle} (
                    {driverProfile.totalPoints.toLocaleString()} PTS)
                  </strong>
                </div>
              </div>

              <div className="showcase-leaderboard-preview__rows">
                {leaderboardTop.map((entry) => (
                  <div
                    key={entry.id}
                    className={`showcase-leaderboard-row ${
                      entry.isPlayer ? 'showcase-leaderboard-row--player' : ''
                    }`}
                  >
                    <span className="showcase-leaderboard-row__rank">
                      #{entry.rank}
                    </span>
                    <span
                      className="showcase-leaderboard-row__lv"
                      style={{ borderColor: entry.badgeColor }}
                    >
                      LV {entry.level}
                    </span>
                    <div className="showcase-leaderboard-row__driver">
                      <strong>
                        {entry.driverName}
                        {entry.isPlayer ? ' (YOU)' : ''}
                      </strong>
                      <span>{entry.rankTitle}</span>
                    </div>
                    <span className="showcase-leaderboard-row__car">
                      {entry.signatureVehicle}
                    </span>
                    <strong className="showcase-leaderboard-row__pts">
                      {entry.totalPoints.toLocaleString()} PTS
                    </strong>
                  </div>
                ))}
              </div>
            </div>
            {/* 3D Car Skin & World Theme Customization Studio */}
            <div style={{ marginTop: '2.5rem' }}>
              <CustomizationStudioPanel />
            </div>
          </div>
        </section>

        {/* ================================================================
            04. FINAL CALL TO ACTION — CHALLENGES OR REAL-EARTH FREE ROAM
           ================================================================ */}
        <section id="launch" className="landing-launch">
          <div className="landing-launch__card">
            <span className="landing-launch__eyebrow">
              04 // READY FOR IGNITION
            </span>

            <h2 className="landing-launch__headline">
              CHOOSE YOUR MODE:
              <br />
              CHALLENGES OR FREE ROAM.
            </h2>

            <p className="landing-launch__subtitle">
              Step into the 3D driving ground with your{' '}
              <strong>{selectedVehicle.name}</strong>. Switch freely between the
              5 UK DVSA parking challenges and Real-Earth Free Roam (choose a
              city manually below, or optionally let the Emotion Camera pick a
              city matching your live facial expression).
            </p>

            {/* Optional Webcam Emotion-Based City Selector */}
            {onStartFreeRoam && webcamObserver.cameraSupported && (
              <div
                style={{
                  margin: '0 auto 1.25rem',
                  maxWidth: '680px',
                  padding: '0.85rem 1.1rem',
                  borderRadius: '14px',
                  background: 'rgba(15, 23, 42, 0.78)',
                  border: '1px solid rgba(56, 189, 248, 0.32)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.65rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <video
                      ref={webcamObserver.videoRef}
                      muted
                      playsInline
                      autoPlay
                      style={{
                        width: webcamObserver.cameraActive ? '64px' : '1px',
                        height: webcamObserver.cameraActive ? '48px' : '1px',
                        opacity: webcamObserver.cameraActive ? 0.95 : 0,
                        position: webcamObserver.cameraActive ? 'static' : 'absolute',
                        pointerEvents: 'none',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        border: '1px solid rgba(56, 189, 248, 0.5)',
                      }}
                    />
                    <div style={{ textAlign: 'left' }}>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#38bdf8',
                        }}
                      >
                        📷 OPTIONAL EMOTION CAMERA CITY PICKER
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>
                        {webcamObserver.cameraActive ? (
                          webcamObserver.facialCueState.faceDetected ? (
                            <>
                              Detected{' '}
                              <strong>
                                {emotionRecommendation.moodEmoji}{' '}
                                {emotionRecommendation.moodLabel}
                              </strong>{' '}
                              → Recommended:{' '}
                              <strong>{emotionRecommendation.city.name}</strong>
                            </>
                          ) : (
                            'Camera active — look at the camera to match your mood to a city, or choose manually below.'
                          )
                        ) : (
                          'Enable your webcam to pick a driving city from your facial expression, or choose any city manually.'
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {!webcamObserver.cameraActive ? (
                      <button
                        type="button"
                        className="landing-launch__pill landing-launch__pill--active"
                        onClick={() => webcamObserver.enableCamera()}
                        disabled={webcamObserver.cameraLoading}
                      >
                        <span>
                          {webcamObserver.cameraLoading
                            ? 'Starting Camera...'
                            : 'Enable Camera to Pick City by Emotion'}
                        </span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="landing-launch__pill landing-launch__pill--active"
                          onClick={() => {
                            const pickedCityId = emotionRecommendation.city.id;
                            webcamObserver.disableCamera();
                            onStartFreeRoam(pickedCityId);
                          }}
                        >
                          <span>
                            {emotionRecommendation.moodEmoji} Launch Mood City:{' '}
                            {emotionRecommendation.city.name}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="landing-launch__pill"
                          onClick={() => webcamObserver.disableCamera()}
                        >
                          <span>Use Manual Choice Instead</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {webcamObserver.cameraActive &&
                  webcamObserver.facialCueState.faceDetected && (
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: '#94a3b8',
                        textAlign: 'left',
                      }}
                    >
                      {emotionRecommendation.reason}
                    </div>
                  )}
              </div>
            )}

            {/* Quick Free Roam Real-Earth City Launch Pills (Manual Choice) */}
            {onStartFreeRoam && (
              <div
                className="landing-launch__vehicle-pills"
                role="group"
                aria-label="Launch directly into a Real-Earth Free Roam city"
              >
                {REAL_CITIES_PRESETS.slice(0, 6).map((city) => (
                  <button
                    key={city.id}
                    type="button"
                    className="landing-launch__pill"
                    onClick={() => onStartFreeRoam(city.id)}
                  >
                    <span
                      className="landing-launch__pill-dot"
                      style={{ backgroundColor: '#38bdf8' }}
                    />
                    <span>
                      Free Roam: {city.name} ({city.postcode ?? city.country})
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Vehicle Confirmation Selector Pills */}
            <div
              className="landing-launch__vehicle-pills"
              role="group"
              aria-label="Confirm your selected vehicle"
            >
              {SHOWCASE_VEHICLE_ORDER.map((vehId) => {
                const veh = getVehicleById(vehId);
                const active = veh.id === selectedVehicle.id;
                return (
                  <button
                    key={veh.id}
                    type="button"
                    className={`landing-launch__pill ${
                      active ? 'landing-launch__pill--active' : ''
                    }`}
                    onClick={() => handleManualVehicleSelect(veh.id)}
                  >
                    <span
                      className="landing-launch__pill-dot"
                      style={{ backgroundColor: veh.bodyColor }}
                    />
                    <span>{veh.name}</span>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.85rem',
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                className="landing-launch__cta-btn"
                onClick={onStartDriving}
              >
                <span>START CHALLENGES MODE</span>
                <span className="landing-launch__cta-arrow" aria-hidden="true">
                  →
                </span>
              </button>

              {onStartFreeRoam && (
                <button
                  type="button"
                  className="landing-launch__cta-btn"
                  style={{
                    background:
                      'linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%)',
                  }}
                  onClick={() => onStartFreeRoam('central-london-uk')}
                >
                  <span>START FREE ROAM (CENTRAL LONDON / HARROW UK)</span>
                  <span className="landing-launch__cta-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
