import { useMemo } from 'react';
import { PERIMETER_BAY_ZONES, WORLD_BOUNDS } from '../constants/worldLayout';

interface RoadAndSurfacesProps {
  enableShadows?: boolean;
}

/**
 * Renders the asphalt parking facility, road lanes, perimeter pavements,
 * raised concrete kerbs, painted parking bays, zebra crossings, and tarmac markings.
 * Strictly adheres to Y = 0 ground plane convention.
 */
export function RoadAndSurfaces({ enableShadows = true }: RoadAndSurfacesProps) {
  const centerDashedSegments = useMemo(() => {
    const coords: number[] = [];
    for (let i = -28; i <= 28; i += 4.5) {
      if (Math.abs(i) > 5.5) {
        coords.push(i);
      }
    }
    return coords;
  }, []);

  const zebraStripes = useMemo(() => [-2.4, -1.2, 0, 1.2, 2.4], []);

  const westEastBayIndices = useMemo(
    () => Array.from({ length: 15 }, (_, idx) => idx),
    []
  );

  const northBayIndices = useMemo(
    () => Array.from({ length: 16 }, (_, idx) => idx),
    []
  );

  const southAngledBayIndices = useMemo(
    () => Array.from({ length: 12 }, (_, idx) => idx),
    []
  );

  return (
    <group name="road-and-surfaces">
      {/* Distant urban ground base below Y=0 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.06, 0]}
        receiveShadow={enableShadows}
      >
        <planeGeometry
          args={[WORLD_BOUNDS.outerGroundSize, WORLD_BOUNDS.outerGroundSize]}
        />
        <meshStandardMaterial
          color="#1e242d"
          roughness={0.95}
          metalness={0.02}
        />
      </mesh>

      {/* Outer concrete apron & pedestrian plaza base */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow={enableShadows}
      >
        <planeGeometry args={[144, 144]} />
        <meshStandardMaterial
          color="#334155"
          roughness={0.9}
          metalness={0.04}
        />
      </mesh>

      {/* Main Asphalt Parking Lot Surface at exact Y = 0 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow={enableShadows}
      >
        <planeGeometry
          args={[WORLD_BOUNDS.asphaltWidth, WORLD_BOUNDS.asphaltDepth]}
        />
        <meshStandardMaterial
          color="#262b35"
          roughness={0.88}
          metalness={0.06}
        />
      </mesh>

      {/* Darker rolled tarmac for the main North-South & East-West through-roads */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.003, 0]}
        receiveShadow={enableShadows}
      >
        <planeGeometry args={[11.5, 68]} />
        <meshStandardMaterial
          color="#1f242d"
          roughness={0.86}
          metalness={0.07}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.003, 0]}
        receiveShadow={enableShadows}
      >
        <planeGeometry args={[68, 11.5]} />
        <meshStandardMaterial
          color="#1f242d"
          roughness={0.86}
          metalness={0.07}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      {/* Dashed white road centreline markings (North-South & East-West) */}
      {centerDashedSegments.map((coord) => (
        <group key={`dash-${coord}`}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.008, coord]}
          >
            <planeGeometry args={[0.16, 2.2]} />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.5}
              polygonOffset
              polygonOffsetFactor={-2}
            />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[coord, 0.008, 0]}
          >
            <planeGeometry args={[2.2, 0.16]} />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.5}
              polygonOffset
              polygonOffsetFactor={-2}
            />
          </mesh>
        </group>
      ))}

      {/* Central intersection box / junction corner guide lines */}
      {[
        [-5.75, -5.75],
        [5.75, -5.75],
        [-5.75, 5.75],
        [5.75, 5.75],
      ].map(([cx, cz], idx) => (
        <mesh
          key={`junction-corner-${idx}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[cx, 0.008, cz]}
        >
          <planeGeometry args={[1.2, 1.2]} />
          <meshStandardMaterial
            color="#f59e0b"
            roughness={0.5}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      ))}

      {/* Double yellow no-parking perimeter edge lines along circulation ring */}
      {(
        [
          { pos: [0, 0.007, -33.2], size: [64, 0.12] },
          { pos: [0, 0.007, -33.45], size: [64, 0.12] },
          { pos: [0, 0.007, 33.2], size: [64, 0.12] },
          { pos: [0, 0.007, 33.45], size: [64, 0.12] },
          { pos: [-33.2, 0.007, 0], size: [0.12, 64] },
          { pos: [-33.45, 0.007, 0], size: [0.12, 64] },
          { pos: [33.2, 0.007, 0], size: [0.12, 64] },
          { pos: [33.45, 0.007, 0], size: [0.12, 64] },
        ] as Array<{ pos: [number, number, number]; size: [number, number] }>
      ).map((line, idx) => (
        <mesh
          key={`yellow-line-${idx}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={line.pos}
        >
          <planeGeometry args={line.size} />
          <meshStandardMaterial
            color="#eab308"
            roughness={0.55}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      ))}

      {/* Pedestrian Zebra Crossing on North Approach */}
      <group position={[0, 0.009, -31.0]} name="zebra-crossing-north">
        {zebraStripes.map((xOffset) => (
          <mesh
            key={`zebra-n-${xOffset}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[xOffset, 0, 0]}
          >
            <planeGeometry args={[0.65, 2.8]} />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.45}
              polygonOffset
              polygonOffsetFactor={-2}
            />
          </mesh>
        ))}
      </group>

      {/* West & East Perimeter Perpendicular Parking Bay Markings */}
      {[-36.5, 36.5].map((bankX, bankIdx) => {
        const startZ = PERIMETER_BAY_ZONES[bankIdx].origin[2];
        const bayW = PERIMETER_BAY_ZONES[bankIdx].bayWidth;
        const bayL = PERIMETER_BAY_ZONES[bankIdx].bayLength;
        return (
          <group key={`perp-bank-${bankX}`}>
            {westEastBayIndices.map((idx) => {
              const lineZ = startZ + idx * bayW;
              return (
                <mesh
                  key={`bay-line-${bankX}-${idx}`}
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[bankX, 0.008, lineZ]}
                >
                  <planeGeometry args={[bayL, 0.12]} />
                  <meshStandardMaterial
                    color="#f1f5f9"
                    roughness={0.5}
                    polygonOffset
                    polygonOffsetFactor={-2}
                  />
                </mesh>
              );
            })}
            {/* Rear boundary line of bay bank */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[
                bankX + (bankX < 0 ? -bayL / 2 : bayL / 2),
                0.008,
                startZ + (14 * bayW) / 2,
              ]}
            >
              <planeGeometry args={[0.14, 14 * bayW]} />
              <meshStandardMaterial
                color="#f1f5f9"
                roughness={0.5}
                polygonOffset
                polygonOffsetFactor={-2}
              />
            </mesh>
          </group>
        );
      })}

      {/* Showcase Electric Blue Bay Highlight for the New Tesla Roadster at [-36.5, 0, -14.0] */}
      <group position={[-36.5, 0.009, -14.0]} name="tesla-roadster-showcase-bay">
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[5.1, 2.7]} />
          <meshStandardMaterial
            color="#0c4a6e"
            roughness={0.6}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.45, 0.001, 0]}>
          <planeGeometry args={[0.18, 2.7]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={0.35}
            polygonOffset
            polygonOffsetFactor={-3}
          />
        </mesh>
      </group>

      {/* North Test Centre Perpendicular Bay Markings */}
      <group name="north-test-centre-bays">
        {northBayIndices.map((idx) => {
          const lineX = -20.625 + idx * 2.75;
          return (
            <mesh
              key={`north-bay-${idx}`}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[lineX, 0.008, -37.5]}
            >
              <planeGeometry args={[0.12, 5.2]} />
              <meshStandardMaterial
                color="#f1f5f9"
                roughness={0.5}
                polygonOffset
                polygonOffsetFactor={-2}
              />
            </mesh>
          );
        })}
      </group>

      {/* South 45-Degree Angled Bay Markings */}
      <group name="south-angled-bays">
        {southAngledBayIndices.map((idx) => {
          const lineX = -16.5 + idx * 3.0;
          return (
            <mesh
              key={`south-angled-${idx}`}
              rotation={[-Math.PI / 2, 0, Math.PI / 4]}
              position={[lineX, 0.008, 36.8]}
            >
              <planeGeometry args={[0.12, 5.0]} />
              <meshStandardMaterial
                color="#f1f5f9"
                roughness={0.5}
                polygonOffset
                polygonOffsetFactor={-2}
              />
            </mesh>
          );
        })}
      </group>

      {/* Raised Perimeter Pavements & Concrete Kerbs (outside active [-40, 40] apron) */}
      {/* North Pavement */}
      <mesh
        position={[0, 0.07, -44.5]}
        receiveShadow={enableShadows}
        castShadow={enableShadows}
      >
        <boxGeometry args={[96, 0.14, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.85} />
      </mesh>
      {/* South Pavement */}
      <mesh
        position={[0, 0.07, 44.5]}
        receiveShadow={enableShadows}
        castShadow={enableShadows}
      >
        <boxGeometry args={[96, 0.14, 8]} />
        <meshStandardMaterial color="#475569" roughness={0.85} />
      </mesh>
      {/* West Pavement */}
      <mesh
        position={[-44.5, 0.07, 0]}
        receiveShadow={enableShadows}
        castShadow={enableShadows}
      >
        <boxGeometry args={[8, 0.14, 81]} />
        <meshStandardMaterial color="#475569" roughness={0.85} />
      </mesh>
      {/* East Pavement */}
      <mesh
        position={[44.5, 0.07, 0]}
        receiveShadow={enableShadows}
        castShadow={enableShadows}
      >
        <boxGeometry args={[8, 0.14, 81]} />
        <meshStandardMaterial color="#475569" roughness={0.85} />
      </mesh>

      {/* Light-grey concrete kerb edging strips along pavement borders */}
      {(
        [
          { pos: [0, 0.08, -40.4], args: [81.2, 0.16, 0.25] },
          { pos: [0, 0.08, 40.4], args: [81.2, 0.16, 0.25] },
          { pos: [-40.4, 0.08, 0], args: [0.25, 0.16, 80.6] },
          { pos: [40.4, 0.08, 0], args: [0.25, 0.16, 80.6] },
        ] as Array<{
          pos: [number, number, number];
          args: [number, number, number];
        }>
      ).map((kerb, idx) => (
        <mesh
          key={`perimeter-kerb-${idx}`}
          position={kerb.pos}
          receiveShadow={enableShadows}
          castShadow={enableShadows}
        >
          <boxGeometry args={kerb.args} />
          <meshStandardMaterial color="#94a3b8" roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}
