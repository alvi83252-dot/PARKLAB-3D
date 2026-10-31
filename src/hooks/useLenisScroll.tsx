import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import Lenis from 'lenis';

export interface LenisScrollMetrics {
  scroll: number;
  limit: number;
  velocity: number;
  direction: number;
  progress: number;
}

export interface ScrollTelemetry {
  /** Current vertical scroll offset in pixels */
  scrollY: number;
  /** Maximum scrollable height in pixels */
  limit: number;
  /** Normalized overall page scroll progress [0..1] */
  progress: number;
  /** Current scroll velocity */
  velocity: number;
  /** Normalized progress within the #showcase section [0..1] */
  showcaseProgress: number;
  /** Normalized progress within the #hero section [0..1] */
  heroProgress: number;
}

export type LenisScrollState = ScrollTelemetry;

export type LenisScrollSubscriber = (metrics: LenisScrollMetrics) => void;

export interface LenisContextValue {
  /** Subscribe to 60/120fps Lenis scroll ticks without triggering React state re-renders */
  subscribe: (callback: LenisScrollSubscriber) => () => void;
  /** Smoothly scroll to a DOM selector, HTMLElement, or numeric offset */
  scrollTo: (
    target: string | number | HTMLElement,
    options?: { offset?: number; duration?: number; immediate?: boolean }
  ) => void;
  /** Get latest snapshot of scroll metrics */
  getMetrics: () => LenisScrollMetrics;
  /** Whether Lenis smooth scrolling is currently active */
  isReady: boolean;
}

export interface UseLenisScrollResult extends LenisContextValue {
  /** High-frequency ref read directly inside Three.js useFrame without React re-renders */
  scrollStateRef: MutableRefObject<ScrollTelemetry>;
  /** Ref for the top scroll progress indicator bar DOM element */
  progressBarRef: MutableRefObject<HTMLDivElement | null>;
  /** Whether reduced motion is active */
  prefersReducedMotion: boolean;
}

const DEFAULT_METRICS: LenisScrollMetrics = {
  scroll: 0,
  limit: 1,
  velocity: 0,
  direction: 1,
  progress: 0,
};

const LenisContext = createContext<LenisContextValue & { hasProvider?: boolean }>({
  subscribe: () => () => {},
  scrollTo: () => {},
  getMetrics: () => DEFAULT_METRICS,
  isReady: false,
  hasProvider: false,
});

export interface LenisProviderProps {
  children: ReactNode;
  /** Linear interpolation intensity (0.05 = ultra-floaty, 0.1 = snappy). Default: 0.085 */
  lerp?: number;
}

export function LenisProvider({ children, lerp = 0.085 }: LenisProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const metricsRef = useRef<LenisScrollMetrics>(DEFAULT_METRICS);
  const subscribersRef = useRef<Set<LenisScrollSubscriber>>(new Set());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lenis = new Lenis({
      lerp: prefersReducedMotion ? 1 : lerp,
      smoothWheel: !prefersReducedMotion,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      autoRaf: false,
    });

    lenisRef.current = lenis;
    setIsReady(true);

    const handleScroll = (instance: Lenis) => {
      const nextMetrics: LenisScrollMetrics = {
        scroll: instance.scroll,
        limit: instance.limit,
        velocity: instance.velocity,
        direction: instance.direction,
        progress: instance.progress,
      };
      metricsRef.current = nextMetrics;

      // Update root CSS variables for zero-rerender parallax effects
      const root = document.documentElement;
      root.style.setProperty('--lenis-scroll', `${instance.scroll.toFixed(1)}px`);
      root.style.setProperty('--lenis-progress', instance.progress.toFixed(4));
      root.style.setProperty('--lenis-velocity', instance.velocity.toFixed(3));

      subscribersRef.current.forEach((callback) => {
        callback(nextMetrics);
      });
    };

    lenis.on('scroll', handleScroll);

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };
    rafId = window.requestAnimationFrame(raf);

    // =========================================================================
    // CLICK-AND-DRAG WEBPAGE GRAB-SCROLL (Pull Upwards -> Scroll Down Webpage)
    // =========================================================================
    const DRAG_ACTIVATION_THRESHOLD_PX = 5;
    const DRAG_MULTIPLIER = 1.2;
    const INERTIA_THROW_MS = 240;

    let isPointerDown = false;
    let isGrabDragging = false;
    let suppressNextClick = false;
    let startClientY = 0;
    let lastClientY = 0;
    let lastMoveTimestamp = 0;
    let startScrollY = 0;
    let velocityPxPerMs = 0;

    const getMaxScroll = () => {
      if (lenis.limit > 0) return lenis.limit;
      return Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
      );
    };

    const clampScroll = (val: number) =>
      Math.max(0, Math.min(getMaxScroll(), val));

    const shouldIgnoreDragStart = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      // Do not hijack form controls, explicit no-drag elements, or 3D WebGL canvases
      if (
        target.closest(
          '.sim-fullscreen, input, textarea, select, [contenteditable="true"], [data-no-drag-scroll], canvas:not(.gameplay-stage__canvas)'
        )
      ) {
        return true;
      }
      return false;
    };

    const onMouseDown = (event: MouseEvent) => {
      // Only primary (left) mouse button
      if (event.button !== 0) return;
      if (shouldIgnoreDragStart(event.target)) return;

      isPointerDown = true;
      isGrabDragging = false;
      startClientY = event.clientY;
      lastClientY = event.clientY;
      lastMoveTimestamp = performance.now();
      startScrollY = lenis.scroll ?? window.scrollY;
      velocityPxPerMs = 0;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isPointerDown) return;

      // If left button was released outside the window, end drag cleanly
      if ((event.buttons & 1) === 0) {
        onMouseUp();
        return;
      }

      const now = performance.now();
      const dt = Math.max(1, now - lastMoveTimestamp);
      // Pulling upwards (event.clientY < startClientY) yields positive delta -> scrolls down
      const totalDeltaY = startClientY - event.clientY;
      const stepDeltaY = lastClientY - event.clientY;

      lastClientY = event.clientY;
      lastMoveTimestamp = now;

      if (!isGrabDragging) {
        if (Math.abs(totalDeltaY) < DRAG_ACTIVATION_THRESHOLD_PX) {
          return;
        }
        isGrabDragging = true;
        suppressNextClick = true;
        document.documentElement.classList.add('is-grab-scrolling');
      }

      event.preventDefault();

      const instVelocity = (stepDeltaY * DRAG_MULTIPLIER) / dt;
      velocityPxPerMs = velocityPxPerMs * 0.65 + instVelocity * 0.35;

      const nextTargetScroll = clampScroll(
        startScrollY + totalDeltaY * DRAG_MULTIPLIER
      );

      if (prefersReducedMotion) {
        window.scrollTo({ top: nextTargetScroll, behavior: 'auto' });
      } else {
        lenis.scrollTo(nextTargetScroll, {
          immediate: false,
          lerp: 0.24,
        });
      }
    };

    const onMouseUp = () => {
      if (!isPointerDown) return;
      const wasDragging = isGrabDragging;
      isPointerDown = false;
      isGrabDragging = false;
      document.documentElement.classList.remove('is-grab-scrolling');

      if (wasDragging && !prefersReducedMotion) {
        const now = performance.now();
        // Apply kinetic throw inertia if pointer was still moving on release
        if (now - lastMoveTimestamp < 65 && Math.abs(velocityPxPerMs) > 0.08) {
          const currentTarget =
            startScrollY + (startClientY - lastClientY) * DRAG_MULTIPLIER;
          const coastTarget = clampScroll(
            currentTarget + velocityPxPerMs * INERTIA_THROW_MS
          );
          lenis.scrollTo(coastTarget, {
            immediate: false,
            lerp,
          });
        }
      }

      if (suppressNextClick) {
        window.setTimeout(() => {
          suppressNextClick = false;
        }, 80);
      }
    };

    const onCaptureClick = (event: MouseEvent) => {
      if (suppressNextClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressNextClick = false;
      }
    };

    const onDragStart = (event: DragEvent) => {
      if (isPointerDown || isGrabDragging) {
        event.preventDefault();
      }
    };

    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mousemove', onMouseMove, { passive: false });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    window.addEventListener('blur', onMouseUp);
    window.addEventListener('click', onCaptureClick, true);
    window.addEventListener('dragstart', onDragStart);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onMouseUp);
      window.removeEventListener('click', onCaptureClick, true);
      window.removeEventListener('dragstart', onDragStart);
      document.documentElement.classList.remove('is-grab-scrolling');

      window.cancelAnimationFrame(rafId);
      lenis.off('scroll', handleScroll);
      lenis.destroy();
      lenisRef.current = null;
      setIsReady(false);
    };
  }, [lerp]);

  const subscribe = useCallback((callback: LenisScrollSubscriber) => {
    subscribersRef.current.add(callback);
    // Immediately invoke with current metrics so subscriber initializes in sync
    callback(metricsRef.current);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  const scrollTo = useCallback(
    (
      target: string | number | HTMLElement,
      options?: { offset?: number; duration?: number; immediate?: boolean }
    ) => {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(target, {
          offset: options?.offset ?? 0,
          duration: options?.duration ?? 1.15,
          immediate: options?.immediate ?? false,
        });
      } else if (typeof target === 'string') {
        const el = document.querySelector(target);
        el?.scrollIntoView({ behavior: 'smooth' });
      } else if (typeof target === 'number' && typeof window !== 'undefined') {
        window.scrollTo({
          top: target + (options?.offset ?? 0),
          behavior: options?.immediate ? 'auto' : 'smooth',
        });
      }
    },
    []
  );

  const getMetrics = useCallback(() => metricsRef.current, []);

  const contextValue = useMemo(
    () => ({
      subscribe,
      scrollTo,
      getMetrics,
      isReady,
      hasProvider: true,
    }),
    [subscribe, scrollTo, getMetrics, isReady]
  );

  return (
    <LenisContext.Provider value={contextValue}>
      {children}
    </LenisContext.Provider>
  );
}

export function useLenisScroll(enabled = true): UseLenisScrollResult {
  const ctx = useContext(LenisContext);
  const standaloneLenisRef = useRef<Lenis | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const scrollStateRef = useRef<ScrollTelemetry>({
    scrollY: 0,
    limit: 1,
    progress: 0,
    velocity: 0,
    showcaseProgress: 0,
    heroProgress: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const computeSectionMetrics = useCallback(
    (scrollY: number, limit: number, velocity: number) => {
      const safeLimit = Math.max(1, limit);
      const progress = Math.max(0, Math.min(1, scrollY / safeLimit));

      const vh = typeof window !== 'undefined' ? Math.max(1, window.innerHeight) : 900;
      const heroProgress = Math.max(0, Math.min(1, scrollY / vh));

      let showcaseProgress = 0;
      if (typeof document !== 'undefined') {
        const showcaseEl = document.getElementById('showcase');
        if (showcaseEl) {
          const rect = showcaseEl.getBoundingClientRect();
          const totalTravel = Math.max(1, rect.height - vh * 0.65);
          const scrolledInto = -rect.top + vh * 0.25;
          showcaseProgress = Math.max(0, Math.min(1, scrolledInto / totalTravel));
        }
      }

      scrollStateRef.current.scrollY = scrollY;
      scrollStateRef.current.limit = safeLimit;
      scrollStateRef.current.progress = progress;
      scrollStateRef.current.velocity = velocity;
      scrollStateRef.current.heroProgress = heroProgress;
      scrollStateRef.current.showcaseProgress = showcaseProgress;

      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${progress.toFixed(4)})`;
      }
    },
    []
  );

  // Sync telemetry either from the parent LenisProvider or a standalone instance
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      if (standaloneLenisRef.current) {
        standaloneLenisRef.current.destroy();
        standaloneLenisRef.current = null;
      }
      return;
    }

    if (ctx.hasProvider) {
      return ctx.subscribe((metrics) => {
        computeSectionMetrics(metrics.scroll, metrics.limit, metrics.velocity);
      });
    }

    if (prefersReducedMotion) {
      const handleNativeScroll = () => {
        const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
        const limit = Math.max(
          1,
          document.documentElement.scrollHeight - window.innerHeight
        );
        computeSectionMetrics(scrollY, limit, 0);
      };

      handleNativeScroll();
      window.addEventListener('scroll', handleNativeScroll, { passive: true });
      window.addEventListener('resize', handleNativeScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleNativeScroll);
        window.removeEventListener('resize', handleNativeScroll);
      };
    }

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      autoRaf: false,
    });

    standaloneLenisRef.current = lenis;

    const unsubscribeScroll = lenis.on('scroll', (instance: Lenis) => {
      computeSectionMetrics(instance.scroll, instance.limit, instance.velocity);
    });

    computeSectionMetrics(
      window.scrollY || 0,
      Math.max(1, document.documentElement.scrollHeight - window.innerHeight),
      0
    );

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };
    rafId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(rafId);
      unsubscribeScroll();
      lenis.destroy();
      standaloneLenisRef.current = null;
    };
  }, [ctx, enabled, prefersReducedMotion, computeSectionMetrics]);

  const scrollTo = useCallback(
    (
      target: string | number | HTMLElement,
      options?: { offset?: number; duration?: number; immediate?: boolean }
    ) => {
      if (ctx.hasProvider) {
        ctx.scrollTo(target, options);
        return;
      }

      if (standaloneLenisRef.current && !prefersReducedMotion) {
        standaloneLenisRef.current.scrollTo(target, {
          offset: options?.offset ?? 0,
          duration: options?.duration ?? 1.1,
          immediate: options?.immediate ?? false,
        });
        return;
      }

      if (typeof window === 'undefined') {
        return;
      }

      if (typeof target === 'number') {
        window.scrollTo({
          top: target + (options?.offset ?? 0),
          behavior: prefersReducedMotion || options?.immediate ? 'auto' : 'smooth',
        });
      } else {
        const el =
          typeof target === 'string'
            ? (document.querySelector(target) as HTMLElement | null)
            : target;
        if (el) {
          const top =
            el.getBoundingClientRect().top +
            window.scrollY +
            (options?.offset ?? 0);
          window.scrollTo({
            top,
            behavior: prefersReducedMotion || options?.immediate ? 'auto' : 'smooth',
          });
        }
      }
    },
    [ctx, prefersReducedMotion]
  );

  return {
    subscribe: ctx.subscribe,
    getMetrics: ctx.getMetrics,
    isReady: ctx.isReady || Boolean(standaloneLenisRef.current),
    scrollStateRef,
    progressBarRef,
    scrollTo,
    prefersReducedMotion,
  };
}

/**
 * Subscribe a callback to Lenis scroll updates without re-rendering the component.
 */
export function useLenisEffect(callback: LenisScrollSubscriber): void {
  const { subscribe } = useLenisScroll();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return subscribe((metrics) => {
      callbackRef.current(metrics);
    });
  }, [subscribe]);
}
