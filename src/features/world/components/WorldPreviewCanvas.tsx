import { useEffect, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import type { Vec3 } from '../../../types/vehicle.types';
import type { CameraMode, ParkingEnvironmentProps } from '../world.types';
import { DrivingCamera } from './DrivingCamera';
import { ParkingEnvironment } from './ParkingEnvironment';
import { WorldSubtreeErrorBoundary } from './WorldFallback';

export interface WorldPreviewCanvasProps extends ParkingEnvironmentProps {
  /** Target position for DrivingCamera. Defaults to [0, 0, 0]. */
  targetPosition?: Vec3;
  /** Target Y rotation in radians for DrivingCamera. Defaults to 0. */
  targetRotationY?: number;
  /** Active camera mode ('follow' | 'overhead'). Defaults to 'follow'. */
  cameraMode?: CameraMode;
  /** Optional additional 3D children (e.g., VehicleController, ChallengeScene). */
  children?: ReactNode;
}

/**
 * Checks whether the current browser environment supports WebGL rendering.
 */
export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGL2RenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Resilient Canvas wrapper with automatic WebGL support detection and error boundary fallback.
 * Useful for standalone world previews and future Stage integration.
 */
export function WorldPreviewCanvas({
  targetPosition = [0, 0, 0],
  targetRotationY = 0,
  cameraMode = 'follow',
  enableShadows = true,
  showDecorativeVehicles = true,
  showBuildings = true,
  showStreetFurniture = true,
  children,
}: WorldPreviewCanvasProps) {
  const [webglSupported, setWebglSupported] = useState<boolean>(true);

  useEffect(() => {
    setWebglSupported(isWebGLAvailable());
  }, []);

  if (!webglSupported) {
    return (
      <div
        role="alert"
        style={{
          width: '100%',
          minHeight: '420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          padding: '2rem',
          backgroundColor: '#11151c',
          color: '#f8fafc',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '0.875rem',
          textAlign: 'center',
        }}
      >
        <strong>3D WebGL Viewport Unavailable</strong>
        <span style={{ color: '#94a3b8', maxWidth: '48ch' }}>
          Hardware acceleration or WebGL context creation is disabled in this
          browser environment. Enable WebGL to view the PARKLAB 3D parking
          facility.
        </span>
      </div>
    );
  }

  return (
    <WorldSubtreeErrorBoundary
      sectionName="WorldPreviewCanvas"
      fallback={
        <div
          role="alert"
          style={{
            padding: '2rem',
            backgroundColor: '#11151c',
            color: '#f8fafc',
            borderRadius: '0.875rem',
          }}
        >
          PARKLAB 3D Viewport encountered an unexpected rendering error and
          recovered safely.
        </div>
      }
    >
      <Canvas
        shadows={enableShadows}
        camera={{ fov: 50, near: 0.1, far: 300, position: [0, 5, 10] }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%', minHeight: '480px' }}
      >
        <DrivingCamera
          targetPosition={targetPosition}
          targetRotationY={targetRotationY}
          mode={cameraMode}
        />
        <ParkingEnvironment
          enableShadows={enableShadows}
          showDecorativeVehicles={showDecorativeVehicles}
          showBuildings={showBuildings}
          showStreetFurniture={showStreetFurniture}
        />
        {children}
      </Canvas>
    </WorldSubtreeErrorBoundary>
  );
}
