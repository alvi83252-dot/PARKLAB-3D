import { useMemo } from 'react';
import { PERIMETER_BAY_ZONES, WORLD_BOUNDS } from '../constants/worldLayout';
import { useCustomization } from '../../../config/customization.config';

interface RoadAndSurfacesProps {
  enableShadows?: boolean;
}

/**
 * Renders the parking facility surface, road lanes, perimeter pavements,
 * raised kerbs, painted parking bays, zebra crossings, tarmac markings,
 * AND creative 3D environment surface props (LEGO Baseplate Studs, Wooden Playset
 * Track Grooves & Toy Blocks, Cyberpunk Neon Grid, Candy Park Peppermints, Mars Domes).
 * Strictly adheres to Y = 0 ground plane convention.
 */
export function RoadAndSurfaces({ enableShadows = true }: RoadAndSurfacesProps) {
  const { themeSpec } = useCustomization();
  const isWooden = themeSpec.id === 'wooden-playset';
  const isLego = themeSpec.id === 'lego-brick-city';
  const isCyber = themeSpec.id === 'cyber-neon-city';
  const isCandy = themeSpec.id === 'candy-wonderland';
  const isMars = themeSpec.id === 'mars-colony';

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

  // 3D LEGO Baseplate Stud positions around the green outer plaza apron
  const legoApronStuds = useMemo(() => {
    const coords: Array<[number, number]> = [];
    for (let x = -46; x <= 46; x += 4) {
      coords.push([x, -44.5]);
      coords.push([x, 44.5]);
    }
    for (let z = -38; z <= 38; z += 4) {
      coords.push([-44.5, z]);
      coords.push([44.5, z]);
    }
    return coords;
  }, []);

  return (
    <group name={`road-and-surfaces-${themeSpec.id}`}>
      {/* Distant ground base below Y=0 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.06, 0]}
        receiveShadow={enableShadows}
      >
        <planeGeometry
          args={[WORLD_BOUNDS.outerGroundSize, WORLD_BOUNDS.outerGroundSize]}
        />
        <meshStandardMaterial
          color={themeSpec.outerGroundColor}
          roughness={themeSpec.surfaceRoughness}
          metalness={themeSpec.surfaceMetalness}
        />
      </mesh>

      {/* Outer apron & pedestrian plaza base */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow={enableShadows}
      >
        <planeGeometry args={[144, 144]} />
        <meshStandardMaterial
          color={themeSpec.apronColor}
          roughness={themeSpec.surfaceRoughness}
          metalness={themeSpec.surfaceMetalness}
        />
      </mesh>

      {/* Main Parking Lot Surface at exact Y = 0 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow={enableShadows}
      >
        <planeGeometry
          args={[WORLD_BOUNDS.asphaltWidth, WORLD_BOUNDS.asphaltDepth]}
        />
        <meshStandardMaterial
          color={themeSpec.asphaltColor}
          roughness={themeSpec.surfaceRoughness}
          metalness={themeSpec.surfaceMetalness}
        />
      </mesh>

      {/* North-South & East-West through-roads */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.003, 0]}
        receiveShadow={enableShadows}
      >
        <planeGeometry args={[11.5, 68]} />
        <meshStandardMaterial
          color={themeSpec.roadLaneColor}
          roughness={themeSpec.surfaceRoughness}
          metalness={themeSpec.surfaceMetalness}
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
          color={themeSpec.roadLaneColor}
          roughness={themeSpec.surfaceRoughness}
          metalness={themeSpec.surfaceMetalness}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      {/* ================================================================
          THEMED 3D WORLD SURFACE DECORATIONS
         ================================================================ */}
      {/* 1. WOODEN PLAYSET: Carved Brio-Style Wooden Train/Car Track Grooves & Giant Toy Blocks */}
      {isWooden && (
        <group name="wooden-playset-surface-props">
          {/* Carved wooden wheel-groove rails along N-S and E-W tracks */}
          {[-2.8, -1.6, 1.6, 2.8].map((offset, idx) => (
            <group key={`wood-groove-${idx}`}>
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[offset, 0.005, 0]}
              >
                <planeGeometry args={[0.18, 66]} />
                <meshStandardMaterial color="#854d0e" roughness={0.85} />
              </mesh>
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.005, offset]}
              >
                <planeGeometry args={[66, 0.18]} />
                <meshStandardMaterial color="#854d0e" roughness={0.85} />
              </mesh>
            </group>
          ))}

          {/* Giant Hand-Painted Wooden Toy Alphabet Blocks on Perimeter Corners */}
          {[
            { pos: [-44.5, 1.4, -44.5], c: '#ef4444', r: 0.2 },
            { pos: [44.5, 1.4, -44.5], c: '#3b82f6', r: -0.3 },
            { pos: [-44.5, 1.4, 44.5], c: '#10b981', r: 0.4 },
            { pos: [44.5, 1.4, 44.5], c: '#f59e0b', r: -0.15 },
          ].map((blk, idx) => (
            <group
              key={`wooden-toy-block-${idx}`}
              position={blk.pos as [number, number, number]}
              rotation={[0, blk.r, 0]}
            >
              <mesh castShadow receiveShadow>
                <boxGeometry args={[2.6, 2.6, 2.6]} />
                <meshStandardMaterial
                  color="#deb887"
                  roughness={0.68}
                  metalness={0.04}
                />
              </mesh>
              <mesh>
                <boxGeometry args={[2.1, 2.1, 2.66]} />
                <meshStandardMaterial color={blk.c} roughness={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* 2. LEGO BRICK CITY: 3D Studded Green Baseplate Aprons */}
      {isLego && (
        <group name="lego-baseplate-studs">
          {legoApronStuds.map(([sx, sz], idx) => (
            <mesh
              key={`apron-stud-${idx}`}
              position={[sx, 0.19, sz]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.48, 0.48, 0.12, 16]} />
              <meshStandardMaterial
                color={
                  idx % 4 === 0
                    ? '#ef4444'
                    : idx % 4 === 1
                      ? '#facc15'
                      : idx % 4 === 2
                        ? '#2563eb'
                        : '#22c55e'
                }
                roughness={0.16}
                metalness={0.08}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* 3. CYBERPUNK NEON GRID: Glowing Synthwave Floor Grid */}
      {isCyber && (
        <gridHelper
          args={[80, 40, '#f43f5e', '#00f5d4']}
          position={[0, 0.005, 0]}
        />
      )}

      {/* 4. SUGAR RUSH CANDY PARK: Giant Peppermint Swirl Discs on Corners */}
      {isCandy && (
        <group name="candy-park-corner-treats">
          {[
            [-44.5, -44.5],
            [44.5, -44.5],
            [-44.5, 44.5],
            [44.5, 44.5],
          ].map(([cx, cz], idx) => (
            <group key={`candy-mint-${idx}`} position={[cx, 0.35, cz]}>
              <mesh castShadow>
                <cylinderGeometry args={[2.2, 2.2, 0.45, 24]} />
                <meshStandardMaterial
                  color={idx % 2 === 0 ? '#f472b6' : '#38bdf8'}
                  roughness={0.2}
                />
              </mesh>
              <mesh position={[0, 0.02, 0]}>
                <cylinderGeometry args={[1.4, 1.4, 0.48, 16]} />
                <meshStandardMaterial color="#fff1f2" roughness={0.2} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* 5. SPACEX MARS COLONY: Pressurized Geodesic Habitat Domes & Red Regolith Boulders */}
      {isMars && (
        <group name="mars-colony-domes">
          {[
            [-45, -45],
            [45, -45],
            [-45, 45],
            [45, 45],
          ].map(([mx, mz], idx) => (
            <group key={`mars-dome-${idx}`} position={[mx, 0, mz]}>
              <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[4.2, 4.5, 0.4, 24]} />
                <meshStandardMaterial
                  color="#94a3b8"
                  metalness={0.75}
                  roughness={0.3}
                />
              </mesh>
              <mesh position={[0, 0.4, 0]} castShadow>
                <sphereGeometry
                  args={[3.8, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
                />
                <meshStandardMaterial
                  color="#e2e8f0"
                  metalness={0.5}
                  roughness={0.2}
                />
              </mesh>
              <mesh position={[0, 0.42, 0]}>
                <sphereGeometry
                  args={[3.84, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]}
                />
                <meshBasicMaterial
                  color="#38bdf8"
                  wireframe
                  transparent
                  opacity={0.45}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Dashed road centreline markings (North-South & East-West) */}
      {centerDashedSegments.map((coord) => (
        <group key={`dash-${coord}`}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, coord]}>
            <planeGeometry args={[0.16, 2.2]} />
            <meshStandardMaterial
              color={themeSpec.laneMarkingColor}
              emissive={isCyber ? themeSpec.laneMarkingColor : '#000000'}
              emissiveIntensity={isCyber ? 1.4 : 0}
              roughness={0.5}
              polygonOffset
              polygonOffsetFactor={-2}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[coord, 0.008, 0]}>
            <planeGeometry args={[2.2, 0.16]} />
            <meshStandardMaterial
              color={themeSpec.laneMarkingColor}
              emissive={isCyber ? themeSpec.laneMarkingColor : '#000000'}
              emissiveIntensity={isCyber ? 1.4 : 0}
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
            color={themeSpec.yellowLineColor}
            emissive={isCyber ? themeSpec.yellowLineColor : '#000000'}
            emissiveIntensity={isCyber ? 1.5 : 0}
            roughness={0.5}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      ))}

      {/* Double perimeter edge lines along circulation ring */}
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
            color={themeSpec.yellowLineColor}
            emissive={isCyber ? themeSpec.yellowLineColor : '#000000'}
            emissiveIntensity={isCyber ? 1.2 : 0}
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
              color={themeSpec.laneMarkingColor}
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
                    color={themeSpec.laneMarkingColor}
                    roughness={0.5}
                    polygonOffset
                    polygonOffsetFactor={-2}
                  />
                </mesh>
              );
            })}
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
                color={themeSpec.laneMarkingColor}
                roughness={0.5}
                polygonOffset
                polygonOffsetFactor={-2}
              />
            </mesh>
          </group>
        );
      })}

      {/* Showcase Electric Blue Bay Highlight for the Flying Tesla Roadster at [-36.5, 0, -14.0] */}
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
                color={themeSpec.laneMarkingColor}
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
                color={themeSpec.laneMarkingColor}
                roughness={0.5}
                polygonOffset
                polygonOffsetFactor={-2}
              />
            </mesh>
          );
        })}
      </group>

      {/* Raised Perimeter Pavements & Kerbs */}
      {[
        { pos: [0, 0.07, -44.5], args: [96, 0.14, 8] },
        { pos: [0, 0.07, 44.5], args: [96, 0.14, 8] },
        { pos: [-44.5, 0.07, 0], args: [8, 0.14, 81] },
        { pos: [44.5, 0.07, 0], args: [8, 0.14, 81] },
      ].map((pave, idx) => (
        <mesh
          key={`pavement-${idx}`}
          position={pave.pos as [number, number, number]}
          receiveShadow={enableShadows}
          castShadow={enableShadows}
        >
          <boxGeometry args={pave.args as [number, number, number]} />
          <meshStandardMaterial
            color={themeSpec.pavementColor}
            roughness={themeSpec.surfaceRoughness}
          />
        </mesh>
      ))}

      {/* Kerb edging strips along pavement borders */}
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
          <meshStandardMaterial
            color={themeSpec.kerbColor}
            emissive={isCyber ? themeSpec.kerbColor : '#000000'}
            emissiveIntensity={isCyber ? 0.9 : 0}
            roughness={0.75}
          />
        </mesh>
      ))}
    </group>
  );
}
