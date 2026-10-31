import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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

const DEFAULT_METRICS: LenisScrollMetrics = {
  scroll: 0,
  limit: 1,
  velocity: 0,
  direction: 1,
  progress: 0,
};

const LenisContext = createContext<LenisContextValue>({
  subscribe: () => () => {},
  scrollTo: () => {},
  getMetrics: () => DEFAULT_METRICS,
  isReady: false,
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
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

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

    return () => {
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
          offset: options?.offset ?? -64,
          duration: options?.duration ?? 1.2,
          immediate: options?.immediate ?? false,
        });
      } else if (typeof target === 'string') {
        const el = document.querySelector(target);
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    []
  );

  const getMetrics = useCallback(() => metricsRef.current, []);

  const contextValue = useMemo<LenisContextValue>(
    () => ({
      subscribe,
      scrollTo,
      getMetrics,
      isReady,
    }),
    [subscribe, scrollTo, getMetrics, isReady]
  );

  return (
    <LenisContext.Provider value={contextValue}>
      {children}
    </LenisContext.Provider>
  );
}

export function useLenisScroll(): LenisContextValue {
  return useContext(LenisContext);
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
