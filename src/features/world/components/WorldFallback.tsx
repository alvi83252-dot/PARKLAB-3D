import { Component, type ErrorInfo, type ReactNode } from 'react';

interface WorldSubtreeErrorBoundaryProps {
  sectionName: string;
  fallback?: ReactNode;
  children: ReactNode;
}

interface WorldSubtreeErrorBoundaryState {
  hasError: boolean;
}

/**
 * Isolates individual 3D world layers (lighting, roads, buildings, decorative cars, signage)
 * so that any unexpected runtime or WebGL geometry error in one layer degrades gracefully
 * without crashing the simulation Canvas.
 */
export class WorldSubtreeErrorBoundary extends Component<
  WorldSubtreeErrorBoundaryProps,
  WorldSubtreeErrorBoundaryState
> {
  public state: WorldSubtreeErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): WorldSubtreeErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn(
      `[PARKLAB 3D World] Degraded nicely in section "${this.props.sectionName}":`,
      error.message,
      info.componentStack
    );
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

/**
 * Minimal guaranteed 3D ground and lighting fallback if the primary environment encounters an error.
 */
export function EmergencyGroundFallback() {
  return (
    <group name="emergency-world-fallback">
      <ambientLight intensity={0.8} />
      <directionalLight position={[25, 40, 20]} intensity={1.1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#252a34" roughness={0.9} />
      </mesh>
    </group>
  );
}
