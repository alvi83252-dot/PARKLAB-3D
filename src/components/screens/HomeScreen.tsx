import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Compass,
  Crosshair,
  Film,
  Gauge,
  Layers,
  Play,
  Sparkles,
} from 'lucide-react';
import { APP_ROUTES } from '../../constants/routes';
import {
  GAMEPLAY_SHOWCASE_SECTIONS,
  HERO_GAMEPLAY_CONFIG,
  type GameplayReelSection,
} from '../../config/showcase.config';
import { useLenisEffect, useLenisScroll } from '../../hooks/useLenisScroll';
import { GameplayVideoStage } from '../ui/GameplayVideoStage';

export function HomeScreen() {
  const { scrollTo } = useLenisScroll();
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [heroInView, setHeroInView] = useState(true);

  const heroSectionRef = useRef<HTMLElement | null>(null);
  const heroParallaxRef = useRef<HTMLDivElement | null>(null);
  const velocityReadoutRef = useRef<HTMLSpanElement | null>(null);
  const progressReadoutRef = useRef<HTMLSpanElement | null>(null);
  const reelCardRefs = useRef<(HTMLElement | null)[]>([]);

  // Update telemetry readouts & hero parallax on 60/120fps Lenis tick without React re-renders
  useLenisEffect(({ scroll, velocity, progress }) => {
    if (velocityReadoutRef.current) {
      velocityReadoutRef.current.textContent = `${Math.abs(velocity).toFixed(2)} VEL`;
    }
    if (progressReadoutRef.current) {
      progressReadoutRef.current.textContent = `${Math.round(progress * 100)
        .toString()
        .padStart(3, '0')}%`;
    }
    if (heroParallaxRef.current && scroll < window.innerHeight * 1.4) {
      const translateY = scroll * 0.22;
      const scale = 1 + Math.min(scroll * 0.00018, 0.08);
      heroParallaxRef.current.style.transform = `translate3d(0, ${translateY.toFixed(
        1
      )}px, 0) scale(${scale.toFixed(4)})`;
    }
  });

  // Observe Hero visibility & which Manoeuvre Reel section is active during scroll
  useEffect(() => {
    const heroEl = heroSectionRef.current;
    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setHeroInView(entry.isIntersecting);
        }
      },
      { threshold: 0.1 }
    );
    if (heroEl) heroObserver.observe(heroEl);

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idxAttr = entry.target.getAttribute('data-reel-index');
            if (idxAttr !== null) {
              const parsed = Number.parseInt(idxAttr, 10);
              if (!Number.isNaN(parsed)) {
                setActiveReelIndex(parsed);
              }
            }
          }
        });
      },
      {
        rootMargin: '-32% 0px -38% 0px',
        threshold: 0.05,
      }
    );

    reelCardRefs.current.forEach((card) => {
      if (card) sectionObserver.observe(card);
    });

    return () => {
      heroObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  const activeSection: GameplayReelSection =
    GAMEPLAY_SHOWCASE_SECTIONS[activeReelIndex] ?? GAMEPLAY_SHOWCASE_SECTIONS[0];

  const handleJumpToSection = (sectionId: string, index?: number) => {
    if (typeof index === 'number') {
      setActiveReelIndex(index);
    }
    scrollTo(`#${sectionId}`, { offset: -88, duration: 1.15 });
  };

  return (
    <div className="lenis-showcase">
      {/* Top Scroll Progress Line */}
      <div className="lenis-progress-bar" aria-hidden="true">
        <div className="lenis-progress-bar__fill" />
      </div>

      {/* Floating Tactical Chapter & Lenis Telemetry Bar */}
      <aside className="lenis-hud-rail" aria-label="Gameplay reel navigation">
        <div className="lenis-hud-rail__telemetry">
          <Activity size={13} className="lenis-hud-rail__pulse" />
          <span ref={progressReadoutRef}>000%</span>
          <span className="lenis-hud-rail__divider">/</span>
          <span ref={velocityReadoutRef}>0.00 VEL</span>
        </div>

        <div className="lenis-hud-rail__chapters">
          <button
            type="button"
            className={`lenis-hud-rail__btn ${
              heroInView ? 'lenis-hud-rail__btn--active' : ''
            }`}
            onClick={() => handleJumpToSection('hero-showcase')}
          >
            00 · HERO
          </button>

          {GAMEPLAY_SHOWCASE_SECTIONS.map((sec, idx) => (
            <button
              key={sec.id}
              type="button"
              className={`lenis-hud-rail__btn ${
                !heroInView && activeReelIndex === idx
                  ? 'lenis-hud-rail__btn--active'
                  : ''
              }`}
              onClick={() => handleJumpToSection(`reel-${sec.id}`, idx)}
            >
              {sec.indexLabel} · {sec.title.split(' ')[0].toUpperCase()}
            </button>
          ))}
        </div>
      </aside>

      {/* =====================================================================
          SECTION 00: FULL-BLEED ANANTA-STYLE HERO GAMEPLAY STAGE
         ===================================================================== */}
      <section
        id="hero-showcase"
        ref={heroSectionRef}
        className="hero-stage"
        aria-labelledby="home-title"
      >
        <div className="hero-stage__viewport">
          <div ref={heroParallaxRef} className="hero-stage__parallax-media">
            <GameplayVideoStage
              videoSrc={HERO_GAMEPLAY_CONFIG.videoSrc}
              webmSrc={HERO_GAMEPLAY_CONFIG.webmSrc}
              preset="hero"
              accentColor="#3b82f6"
              isActive={heroInView}
              cameraLabel="CAM_00 // HERO_CINEMATIC_LOOP"
              reelCode="HERO // 1080P_60FPS"
              showControls={true}
              className="hero-stage__video-component"
            />
          </div>

          {/* Gradient vignette so hero typography pops cleanly over footage */}
          <div className="hero-stage__scrim" aria-hidden="true" />

          {/* Hero Foreground Overlay Content */}
          <div className="hero-stage__content">
            <div className="hero-stage__eyebrow">
              <Sparkles size={14} aria-hidden="true" />
              <span>{HERO_GAMEPLAY_CONFIG.eyebrow}</span>
            </div>

            <h1 id="home-title" className="hero-stage__title">
              {HERO_GAMEPLAY_CONFIG.title}
            </h1>

            <p className="hero-stage__subtitle">
              {HERO_GAMEPLAY_CONFIG.subtitle}
            </p>

            <div className="hero-stage__cta-row">
              <Link to={APP_ROUTES.SIMULATION} className="btn-primary-glow">
                <Play size={16} fill="currentColor" aria-hidden="true" />
                <span>Launch 3D Simulator</span>
              </Link>

              <button
                type="button"
                className="btn-glass"
                onClick={() =>
                  handleJumpToSection(
                    `reel-${GAMEPLAY_SHOWCASE_SECTIONS[0].id}`,
                    0
                  )
                }
              >
                <Film size={16} aria-hidden="true" />
                <span>Explore Gameplay Reels</span>
                <ArrowDown size={15} aria-hidden="true" />
              </button>

              <Link to={APP_ROUTES.VEHICLES} className="btn-glass">
                <span>Select Vehicle</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>

            {/* Bottom Telemetry Strip */}
            <div
              className="hero-stage__specs-grid"
              aria-label="Simulation technical highlights"
            >
              {HERO_GAMEPLAY_CONFIG.specs.map((spec) => (
                <div key={spec.label} className="hero-spec-cell">
                  <span className="hero-spec-cell__label">{spec.label}</span>
                  <span className="hero-spec-cell__value">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTIONS 01–05: PINNED CROSSFADING GAMEPLAY REELS + SCROLL CARDS
         ===================================================================== */}
      <section
        className="showcase-matrix"
        aria-label="UK Driving Test Manoeuvre Gameplay Reels"
      >
        <div className="showcase-matrix__header">
          <div className="placeholder-card__eyebrow">
            <Film size={14} aria-hidden="true" />
            <span>SCROLL-SYNCHRONISED GAMEPLAY FOOTAGE · 05 MANOEUVRES</span>
          </div>
          <h2 className="showcase-matrix__heading">
            Tactical Manoeuvre Breakdown
          </h2>
          <p className="showcase-matrix__subheading">
            Scroll smoothly through each UK driving test manoeuvre. The pinned
            telemetry viewport crossfades automatically between captured gameplay
            reels—or drop your own <code>.mp4</code> / <code>.webm</code> capture
            directly onto the stage to preview.
          </p>
        </div>

        <div className="showcase-matrix__split">
          {/* Left Column: Scrollable Manoeuvre Narrative & Telemetry Cards */}
          <div className="showcase-matrix__narrative">
            {GAMEPLAY_SHOWCASE_SECTIONS.map((section, idx) => {
              const isCardActive = activeReelIndex === idx;
              return (
                <article
                  key={section.id}
                  id={`reel-${section.id}`}
                  data-reel-index={idx}
                  ref={(el) => {
                    reelCardRefs.current[idx] = el;
                  }}
                  className={`reel-card ${
                    isCardActive ? 'reel-card--active' : ''
                  }`}
                  style={
                    {
                      '--reel-accent': section.accentColor,
                    } as React.CSSProperties
                  }
                >
                  <div className="reel-card__top-bar">
                    <span className="reel-card__index">
                      {section.indexLabel}
                    </span>
                    <span className="reel-card__codename">
                      {section.codeName}
                    </span>
                    <span className="reel-card__difficulty">
                      {section.difficulty.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="reel-card__title">{section.title}</h3>
                  <p className="reel-card__subtitle">{section.subtitle}</p>
                  <p className="reel-card__description">
                    {section.description}
                  </p>

                  {/* Telemetry Spec Mini-Grid */}
                  <div className="reel-card__telemetry-grid">
                    <div className="reel-telemetry-item">
                      <span className="reel-telemetry-item__label">
                        <Crosshair size={12} /> TARGET ENVELOPE
                      </span>
                      <span className="reel-telemetry-item__val">
                        {section.telemetry.targetBayDimensions}
                      </span>
                    </div>

                    <div className="reel-telemetry-item">
                      <span className="reel-telemetry-item__label">
                        <Compass size={12} /> MAX TOLERANCE
                      </span>
                      <span className="reel-telemetry-item__val">
                        {section.telemetry.maxOffsetTolerance} ·{' '}
                        {section.telemetry.maxAngleTolerance}
                      </span>
                    </div>

                    <div className="reel-telemetry-item">
                      <span className="reel-telemetry-item__label">
                        <Gauge size={12} /> STEERING GEOMETRY
                      </span>
                      <span className="reel-telemetry-item__val">
                        {section.telemetry.steeringLockAngle}
                      </span>
                    </div>

                    <div className="reel-telemetry-item">
                      <span className="reel-telemetry-item__label">
                        <Layers size={12} /> FEATURED CHASSIS
                      </span>
                      <span className="reel-telemetry-item__val">
                        {section.telemetry.featuredVehicle}
                      </span>
                    </div>
                  </div>

                  {/* Key Gameplay Highlights */}
                  <ul className="reel-card__highlights">
                    {section.highlights.map((item) => (
                      <li key={item} className="reel-card__highlight-row">
                        <CheckCircle2
                          size={15}
                          style={{ color: section.accentColor, flexShrink: 0 }}
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Mobile / Tablet Inline Video Stage (Visible when stacked) */}
                  <div className="reel-card__mobile-stage">
                    <GameplayVideoStage
                      videoSrc={section.videoSrc}
                      webmSrc={section.webmSrc}
                      preset={section.simulationPreset}
                      accentColor={section.accentColor}
                      isActive={isCardActive}
                      cameraLabel={`CAM_${section.indexLabel} // ${section.telemetry.cameraRig.toUpperCase()}`}
                      reelCode={`SLOT // ${section.videoSrc}`}
                    />
                  </div>

                  <div className="reel-card__footer">
                    <Link
                      to={APP_ROUTES.CHALLENGES}
                      className="reel-card__action-link"
                    >
                      <span>Configure Manoeuvre</span>
                      <ArrowRight size={15} />
                    </Link>

                    <span className="reel-card__asset-path">
                      Asset Slot: <code>public{section.videoSrc}</code>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Right Column: Sticky Crossfading Gameplay Video Stage (Desktop) */}
          <div className="showcase-matrix__sticky-col">
            <div className="sticky-video-deck">
              {/* Top Reel Switcher Tabs */}
              <div
                className="sticky-video-deck__tabs"
                role="tablist"
                aria-label="Select gameplay reel"
              >
                {GAMEPLAY_SHOWCASE_SECTIONS.map((sec, idx) => {
                  const selected = activeReelIndex === idx;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      className={`sticky-video-deck__tab ${
                        selected ? 'sticky-video-deck__tab--active' : ''
                      }`}
                      style={
                        selected
                          ? ({
                              '--tab-accent': sec.accentColor,
                            } as React.CSSProperties)
                          : undefined
                      }
                      onClick={() => handleJumpToSection(`reel-${sec.id}`, idx)}
                    >
                      <span className="sticky-video-deck__tab-num">
                        {sec.indexLabel}
                      </span>
                      <span className="sticky-video-deck__tab-label">
                        {sec.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Crossfading Stack of Video Stages */}
              <div className="sticky-video-deck__frame">
                {GAMEPLAY_SHOWCASE_SECTIONS.map((sec, idx) => {
                  const isCurrent = activeReelIndex === idx;
                  return (
                    <div
                      key={sec.id}
                      className={`sticky-video-deck__layer ${
                        isCurrent ? 'sticky-video-deck__layer--active' : ''
                      }`}
                      aria-hidden={!isCurrent}
                    >
                      <GameplayVideoStage
                        videoSrc={sec.videoSrc}
                        webmSrc={sec.webmSrc}
                        preset={sec.simulationPreset}
                        accentColor={sec.accentColor}
                        isActive={isCurrent && !heroInView}
                        cameraLabel={`CAM_${sec.indexLabel} // ${sec.telemetry.cameraRig.toUpperCase()}`}
                        reelCode={`SLOT // ${sec.videoSrc}`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Sticky Footer Readout showing Active Reel Metadata */}
              <div className="sticky-video-deck__meta-bar">
                <div className="sticky-video-deck__meta-left">
                  <span
                    className="sticky-video-deck__dot"
                    style={{ backgroundColor: activeSection.accentColor }}
                  />
                  <div>
                    <div className="sticky-video-deck__active-title">
                      {activeSection.indexLabel} — {activeSection.title}
                    </div>
                    <div className="sticky-video-deck__active-sub">
                      {activeSection.telemetry.featuredVehicle} ·{' '}
                      {activeSection.telemetry.targetBayDimensions}
                    </div>
                  </div>
                </div>

                <Link
                  to={APP_ROUTES.SIMULATION}
                  className="sticky-video-deck__sim-btn"
                >
                  <span>Test in 3D</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 06: SIMULATOR ROUTE MATRIX & VIDEO ASSET SLOTS
         ===================================================================== */}
      <section
        className="placeholder-card showcase-command-deck"
        aria-labelledby="deck-title"
      >
        <div className="placeholder-card__eyebrow">
          <Layers size={14} aria-hidden="true" />
          <span>SIMULATOR COMMAND DECK &amp; FOOTAGE SLOTS</span>
        </div>

        <h2 id="deck-title" className="placeholder-card__title">
          Ready for Capture &amp; Simulation
        </h2>

        <p className="placeholder-card__description">
          Drop your recorded <code>.mp4</code> or <code>.webm</code> gameplay
          clips into <code>public/assets/videos/</code> (or drag a file onto any
          video stage above) to replace the procedural telemetry canvas with live
          footage.
        </p>

        <div className="route-grid" aria-label="Application screens">
          <Link to={APP_ROUTES.VEHICLES} className="route-tile">
            <div className="route-tile__header">
              <span>Vehicle Selection</span>
              <ArrowRight size={16} aria-hidden="true" />
            </div>
            <span className="route-tile__meta">
              Route: {APP_ROUTES.VEHICLES} · Tesla Roadster &amp; UK Fleet
            </span>
          </Link>

          <Link to={APP_ROUTES.CHALLENGES} className="route-tile">
            <div className="route-tile__header">
              <span>Challenge Selection</span>
              <ArrowRight size={16} aria-hidden="true" />
            </div>
            <span className="route-tile__meta">
              Route: {APP_ROUTES.CHALLENGES} · 5 UK DVSA Manoeuvres
            </span>
          </Link>

          <Link to={APP_ROUTES.SIMULATION} className="route-tile">
            <div className="route-tile__header">
              <span>Simulation Screen</span>
              <ArrowRight size={16} aria-hidden="true" />
            </div>
            <span className="route-tile__meta">
              Route: {APP_ROUTES.SIMULATION} · WebGL 3D Driving Loop
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
