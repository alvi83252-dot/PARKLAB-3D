import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import type { ChallengeId } from '../types/challenge.types';
import { CHALLENGES, DEFAULT_CHALLENGE } from '../features/challenges';
import { VEHICLES, getVehicleById } from '../features/vehicles';
import { LandingExperience } from '../features/showcase';
import { SimulationScreen } from '../features/simulation';
import type { SimulationMode } from '../features/cities';
import { LenisProvider } from '../hooks/useLenisScroll';
import './App.css';

export type ExperienceMode = 'landing' | 'gameplay';

export function App() {
  const [experienceMode, setExperienceMode] = useState<ExperienceMode>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (
        path.startsWith('/simulate') ||
        params.get('mode') === 'freeroam' ||
        params.has('city')
      ) {
        return 'gameplay';
      }
    }
    return 'landing';
  });

  // Default to the centrepiece New Tesla Roadster ('tesla-roadster')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const vehicleParam = params.get('vehicle');
      if (vehicleParam && VEHICLES.some((v) => v.id === vehicleParam)) {
        return vehicleParam;
      }
    }
    return 'tesla-roadster';
  });

  // Default to the first parking challenge ('parallel')
  const [selectedChallengeId, setSelectedChallengeId] = useState<ChallengeId>(
    () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const challengeParam = params.get('challenge') as ChallengeId | null;
        if (challengeParam && CHALLENGES.some((c) => c.id === challengeParam)) {
          return challengeParam;
        }
      }
      return DEFAULT_CHALLENGE.id;
    }
  );

  const [initialSimMode, setInitialSimMode] = useState<SimulationMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'freeroam' || params.has('city')) {
        return 'freeroam';
      }
    }
    return 'challenges';
  });

  const [initialCityId, setInitialCityId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('city') ?? 'central-london-uk';
    }
    return 'central-london-uk';
  });

  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Lock body overflow when inside the full-screen 3D simulator
  useEffect(() => {
    if (experienceMode === 'gameplay') {
      document.body.style.overflow = 'hidden';
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [experienceMode]);

  const handleSelectVehicle = useCallback((vehicleId: string) => {
    if (VEHICLES.some((v) => v.id === vehicleId)) {
      setSelectedVehicleId(vehicleId);
    }
  }, []);

  const handleSelectChallenge = useCallback((challengeId: string) => {
    const valid = CHALLENGES.find((c) => c.id === challengeId);
    if (valid) {
      setSelectedChallengeId(valid.id);
    }
  }, []);

  const handleEnterGameplay = useCallback(
    (options?: { mode?: SimulationMode; cityId?: string }) => {
      if (isTransitioning) return;
      if (options?.mode) {
        setInitialSimMode(options.mode);
      } else {
        setInitialSimMode('challenges');
      }
      if (options?.cityId) {
        setInitialCityId(options.cityId);
      }
      setIsTransitioning(true);
      window.setTimeout(() => {
        setExperienceMode('gameplay');
        window.setTimeout(() => {
          setIsTransitioning(false);
        }, 280);
      }, 320);
    },
    [isTransitioning]
  );

  const handleExitToShowcase = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    window.setTimeout(() => {
      setExperienceMode('landing');
      window.setTimeout(() => {
        setIsTransitioning(false);
      }, 280);
    }, 260);
  }, [isTransitioning]);

  const activeVehicle = getVehicleById(selectedVehicleId);

  return (
    <BrowserRouter>
      <LenisProvider lerp={0.085}>
        <div
          className={`parklab-experience parklab-experience--${experienceMode}`}
        >
          {experienceMode === 'landing' ? (
            <LandingExperience
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={handleSelectVehicle}
              selectedChallengeId={selectedChallengeId}
              onSelectChallenge={handleSelectChallenge}
              onStartDriving={() => handleEnterGameplay({ mode: 'challenges' })}
              onStartFreeRoam={(cityId) =>
                handleEnterGameplay({
                  mode: 'freeroam',
                  cityId: cityId ?? 'central-london-uk',
                })
              }
              isTransitioningOut={isTransitioning}
            />
          ) : (
            <SimulationScreen
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={handleSelectVehicle}
              selectedChallengeId={selectedChallengeId}
              onSelectChallenge={handleSelectChallenge}
              initialMode={initialSimMode}
              initialCityId={initialCityId}
              onExitToShowcase={handleExitToShowcase}
            />
          )}

          {/* Cinematic Transition Curtain */}
          <div
            className={`parklab-curtain ${
              isTransitioning ? 'parklab-curtain--active' : ''
            }`}
            aria-hidden="true"
          >
            <div className="parklab-curtain__inner">
              <span className="parklab-curtain__eyebrow">PARKLAB 3D</span>
              <span className="parklab-curtain__title">
                {experienceMode === 'landing'
                  ? `INITIALIZING ${activeVehicle.name.toUpperCase()}...`
                  : 'RETURNING TO 3D STUDIO...'}
              </span>
            </div>
          </div>
        </div>
      </LenisProvider>
    </BrowserRouter>
  );
}

export default App;
