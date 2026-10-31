import type { ParkingEnvironmentProps } from '../world.types';
import { DecorativeVehicles } from './DecorativeVehicles';
import { RoadAndSurfaces } from './RoadAndSurfaces';
import { StreetFurniture } from './StreetFurniture';
import { SurroundingBuildings } from './SurroundingBuildings';
import {
  EmergencyGroundFallback,
  WorldSubtreeErrorBoundary,
} from './WorldFallback';
import { WorldLighting } from './WorldLighting';

/**
 * ParkingEnvironment
 * Renders the complete PARKLAB 3D outdoor parking facility inside an existing
 * React Three Fiber <Canvas>.
 *
 * Includes:
 * - Daytime lighting, directional sun shadows, and atmospheric sky/fog
 * - Large asphalt parking area (Y = 0), driving lanes, kerbs, pavements, and bay markings
 * - UK road & traffic signs, LED streetlights, EV Supercharger stalls, and landscaping
 * - Surrounding architectural buildings (Test Centre, Multi-storey car park, office wings)
 * - Stationary decorative parked vehicles including the showcase New Tesla Roadster
 */
export function ParkingEnvironment({
  showDecorativeVehicles = true,
  showBuildings = true,
  showStreetFurniture = true,
  enableShadows = true,
}: ParkingEnvironmentProps = {}) {
  return (
    <WorldSubtreeErrorBoundary
      sectionName="ParkingEnvironmentRoot"
      fallback={<EmergencyGroundFallback />}
    >
      <group name="parklab-3d-environment">
        <WorldSubtreeErrorBoundary sectionName="WorldLighting">
          <WorldLighting enableShadows={enableShadows} />
        </WorldSubtreeErrorBoundary>

        <WorldSubtreeErrorBoundary
          sectionName="RoadAndSurfaces"
          fallback={<EmergencyGroundFallback />}
        >
          <RoadAndSurfaces enableShadows={enableShadows} />
        </WorldSubtreeErrorBoundary>

        {showBuildings && (
          <WorldSubtreeErrorBoundary sectionName="SurroundingBuildings">
            <SurroundingBuildings enableShadows={enableShadows} />
          </WorldSubtreeErrorBoundary>
        )}

        {showStreetFurniture && (
          <WorldSubtreeErrorBoundary sectionName="StreetFurniture">
            <StreetFurniture enableShadows={enableShadows} />
          </WorldSubtreeErrorBoundary>
        )}

        {showDecorativeVehicles && (
          <WorldSubtreeErrorBoundary sectionName="DecorativeVehicles">
            <DecorativeVehicles enableShadows={enableShadows} />
          </WorldSubtreeErrorBoundary>
        )}
      </group>
    </WorldSubtreeErrorBoundary>
  );
}

export default ParkingEnvironment;
