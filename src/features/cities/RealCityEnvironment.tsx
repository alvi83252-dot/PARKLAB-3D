/**
 * PARKLAB 3D — 3D Real-Earth City Environment Renderer
 * Renders authentic street networks, roundabouts, iconic landmarks (Big Ben, Nelson's Column,
 * London Eye, St Mary's Harrow, One Canada Square, etc.), UK/world street name signs,
 * red London double-decker buses, black cabs, and roadside parking bays.
 */

import { useEffect, useMemo, useState } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { VehicleModel, getVehicleById } from '../vehicles';
import {
  buildMapboxStaticImageUrl,
  computeMapboxGroundSizeMeters,
  useMapboxGroundStyle,
} from './mapboxConfig';
import type {
  CityBuildingSpec,
  CityParkedVehicleSpec,
  CityParkingBaySpec,
  CityRoadSpec,
  CityRoundaboutSpec,
  CityStreetSignSpec,
  RealCityLocation,
} from './cityTypes';

export interface RealCityEnvironmentProps {
  city: RealCityLocation;
  enableShadows?: boolean;
}

function CityRoadSegment({ road, isLeftHand }: { road: CityRoadSpec; isLeftHand: boolean }) {
  const dashCount = Math.max(4, Math.floor(road.length / 7));
  const dashes = useMemo(
    () =>
      Array.from({ length: dashCount }, (_, idx) => {
        const z = -road.length / 2 + 3.5 + idx * 7;
        return z;
      }),
    [dashCount, road.length]
  );

  const lineColor = isLeftHand ? '#f8fafc' : '#facc15';

  return (
    <group
      position={[road.center[0], 0, road.center[1]]}
      rotation={[0, road.rotationY, 0]}
    >
      {/* Asphalt Carriageway */}
      <mesh position={[0, 0.012, 0]} receiveShadow>
        <boxGeometry args={[road.width, 0.024, road.length]} />
        <meshStandardMaterial color="#161b24" roughness={0.86} metalness={0.08} />
      </mesh>

      {/* Raised Left & Right Pavements / Kerbs */}
      {[-1, 1].map((side) => (
        <group key={`kerb-${side}`}>
          <mesh
            position={[side * (road.width / 2 + 1.6), 0.08, 0]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[3.2, 0.16, road.length]} />
            <meshStandardMaterial
              color="#334155"
              roughness={0.78}
              metalness={0.12}
            />
          </mesh>
          {/* Double-yellow no-parking kerb line */}
          <mesh
            position={[side * (road.width / 2 - 0.32), 0.026, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.1, road.length * 0.96]} />
            <meshBasicMaterial color="#eab308" />
          </mesh>
        </group>
      ))}

      {/* Centre Divider Dashed Line */}
      {dashes.map((zPos, i) => (
        <mesh
          key={i}
          position={[0, 0.027, zPos]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.16, 3.2]} />
          <meshBasicMaterial color={lineColor} />
        </mesh>
      ))}

      {/* Multi-lane sub-divider lines if 4 lanes */}
      {(road.lanes ?? 2) >= 4 &&
        [-road.width * 0.24, road.width * 0.24].map((xLane, lIdx) =>
          dashes.map((zPos, i) => (
            <mesh
              key={`lane-${lIdx}-${i}`}
              position={[xLane, 0.026, zPos]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.11, 2.4]} />
              <meshBasicMaterial color="#cbd5e1" transparent opacity={0.65} />
            </mesh>
          ))
        )}
    </group>
  );
}

function CityRoundaboutNode({ roundabout }: { roundabout: CityRoundaboutSpec }) {
  const [cx, cz] = roundabout.center;
  return (
    <group position={[cx, 0, cz]}>
      {/* Circular Asphalt Junction Apron */}
      <mesh position={[0, 0.016, 0]} receiveShadow>
        <cylinderGeometry
          args={[roundabout.outerRadius, roundabout.outerRadius, 0.032, 40]}
        />
        <meshStandardMaterial color="#181e29" roughness={0.85} metalness={0.08} />
      </mesh>

      {/* Outer Give-Way Dashed Ring */}
      <mesh position={[0, 0.034, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry
          args={[
            roundabout.outerRadius - 0.45,
            roundabout.outerRadius - 0.15,
            40,
          ]}
        />
        <meshBasicMaterial color="#f8fafc" side={THREE.DoubleSide} />
      </mesh>

      {/* Raised Central Stone Traffic Island */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry
          args={[roundabout.islandRadius, roundabout.islandRadius + 0.25, 0.36, 32]}
        />
        <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.18} />
      </mesh>

      {/* Inner landscaped turf / monument plinth */}
      <mesh position={[0, 0.38, 0]} receiveShadow>
        <cylinderGeometry
          args={[
            roundabout.islandRadius * 0.82,
            roundabout.islandRadius * 0.85,
            0.08,
            28,
          ]}
        />
        <meshStandardMaterial color="#15803d" roughness={0.9} />
      </mesh>

      {/* Central ornamental obelisk / beacon */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.55, 2.1, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.65, 0]}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial
          color="#fbbf24"
          emissive="#f59e0b"
          emissiveIntensity={1.6}
        />
      </mesh>
    </group>
  );
}

function CityBuildingMesh({ building }: { building: CityBuildingSpec }) {
  const [w, h, d] = building.dimensions;
  const [x, y, z] = building.position;
  const rotY = building.rotationY ?? 0;
  const roof = building.roofStyle ?? 'flat';

  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      {/* Main Building Tower Block */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={building.primaryColor}
          roughness={0.55}
          metalness={0.32}
        />
      </mesh>

      {/* Architectural Ground Floor Podium */}
      <mesh position={[0, Math.min(2.4, h * 0.18), 0]} castShadow receiveShadow>
        <boxGeometry args={[w + 0.35, Math.min(4.8, h * 0.36), d + 0.35]} />
        <meshStandardMaterial
          color={building.secondaryColor}
          roughness={0.62}
          metalness={0.25}
        />
      </mesh>

      {/* Illuminated Glazed Curtain Wall Strips (Front & Back) */}
      {[-1, 1].map((side) => (
        <mesh
          key={`glass-z-${side}`}
          position={[0, h * 0.54, side * (d / 2 + 0.04)]}
        >
          <planeGeometry args={[w * 0.82, h * 0.72]} />
          <meshStandardMaterial
            color={building.glassColor}
            emissive={building.glassColor}
            emissiveIntensity={0.28}
            metalness={0.85}
            roughness={0.14}
          />
        </mesh>
      ))}

      {/* Illuminated Glazed Curtain Wall Strips (Left & Right) */}
      {[-1, 1].map((side) => (
        <mesh
          key={`glass-x-${side}`}
          position={[side * (w / 2 + 0.04), h * 0.54, 0]}
          rotation={[0, side * (Math.PI / 2), 0]}
        >
          <planeGeometry args={[d * 0.82, h * 0.72]} />
          <meshStandardMaterial
            color={building.glassColor}
            emissive={building.glassColor}
            emissiveIntensity={0.24}
            metalness={0.85}
            roughness={0.14}
          />
        </mesh>
      ))}

      {/* Roofline Accent Cornice */}
      <mesh position={[0, h + 0.25, 0]}>
        <boxGeometry args={[w + 0.4, 0.5, d + 0.4]} />
        <meshStandardMaterial
          color={building.accentColor}
          emissive={building.accentColor}
          emissiveIntensity={0.35}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Special Landmark Roofs */}
      {roof === 'pyramid' && (
        <mesh position={[0, h + 6.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[w * 0.62, 13, 4]} />
          <meshStandardMaterial
            color="#e2e8f0"
            emissive="#38bdf8"
            emissiveIntensity={0.3}
            metalness={0.85}
            roughness={0.18}
          />
        </mesh>
      )}

      {roof === 'clocktower' && (
        <group position={[0, h, 0]}>
          {/* Clock stage */}
          <mesh position={[0, 3.2, 0]} castShadow>
            <boxGeometry args={[w * 1.06, 6.4, d * 1.06]} />
            <meshStandardMaterial color="#eab308" metalness={0.5} roughness={0.35} />
          </mesh>
          {/* 4 Glowing Clock Faces (Big Ben style) */}
          {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((ang, i) => (
            <group key={i} rotation={[0, ang, 0]}>
              <mesh position={[0, 3.2, d * 0.54]}>
                <circleGeometry args={[w * 0.34, 24]} />
                <meshStandardMaterial
                  color="#fef9c3"
                  emissive="#fde047"
                  emissiveIntensity={1.6}
                />
              </mesh>
            </group>
          ))}
          {/* Gothic Belfry Spire */}
          <mesh position={[0, 11.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[w * 0.68, 11, 4]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      )}

      {roof === 'spire' && (
        <mesh position={[0, h + 7, 0]} castShadow>
          <coneGeometry args={[Math.min(w, d) * 0.38, 14, 16]} />
          <meshStandardMaterial
            color={building.secondaryColor}
            metalness={0.65}
            roughness={0.3}
          />
        </mesh>
      )}

      {roof === 'dome' && (
        <mesh position={[0, h + 1, 0]} castShadow>
          <sphereGeometry
            args={[Math.min(w, d) * 0.42, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshStandardMaterial color="#475569" metalness={0.65} roughness={0.32} />
        </mesh>
      )}

      {roof === 'column' && (
        <group position={[0, h + 2.2, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[1.6, 1.9, 4.4, 20]} />
            <meshStandardMaterial color="#eab308" metalness={0.85} roughness={0.2} />
          </mesh>
        </group>
      )}

      {roof === 'wheel' && (
        <group position={[0, h * 0.62, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh>
            <torusGeometry args={[16, 0.55, 16, 48]} />
            <meshStandardMaterial
              color="#38bdf8"
              emissive="#0ea5e9"
              emissiveIntensity={1.2}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        </group>
      )}

      {/* Floating Landmark / Building Sign Label */}
      <Text
        position={[0, Math.min(h + 2.8, 28), d / 2 + 0.45]}
        fontSize={1.15}
        color="#f8fafc"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.08}
        outlineColor="#090d16"
      >
        {building.name}
      </Text>
    </group>
  );
}

function CityParkedVehicleMesh({ vehicle }: { vehicle: CityParkedVehicleSpec }) {
  const { length: L, width: W, height: H } = vehicle.dimensions;
  const isBus = vehicle.kind === 'london-bus';
  const isTaxi = vehicle.kind === 'black-cab' || vehicle.kind === 'nyc-cab';

  const resolvedCarVehicle = useMemo(() => {
    if (isBus) return null;
    let archetypeId = 'sedan';
    if (vehicle.kind === 'roadster') archetypeId = 'apex-hypercar';
    else if (vehicle.kind === 'suv' || vehicle.kind === 'black-cab') archetypeId = 'suv';
    else if (vehicle.kind === 'hatchback') archetypeId = 'hatchback';
    else if (vehicle.kind === 'nyc-cab') archetypeId = 'sedan';
    else {
      // Alternate between Porsche Taycan 4S, AMG GT R, and Executive Sedan for street traffic
      let hash = 0;
      for (let i = 0; i < vehicle.id.length; i++) {
        hash = (hash * 31 + vehicle.id.charCodeAt(i)) | 0;
      }
      const choices = ['porsche-taycan', 'amg-gt', 'sedan', 'apex-hypercar'];
      archetypeId = choices[Math.abs(hash) % choices.length] ?? 'sedan';
    }
    const base = getVehicleById(archetypeId);
    return {
      ...base,
      bodyColor: vehicle.color || base.bodyColor,
    };
  }, [isBus, vehicle.kind, vehicle.id, vehicle.color]);

  if (!isBus && resolvedCarVehicle) {
    const scaleX = W / resolvedCarVehicle.dimensions.width;
    const scaleY = H / resolvedCarVehicle.dimensions.height;
    const scaleZ = L / resolvedCarVehicle.dimensions.length;

    return (
      <group position={vehicle.position} rotation={[0, vehicle.rotationY, 0]}>
        <group scale={[scaleX, scaleY, scaleZ]}>
          <VehicleModel vehicle={resolvedCarVehicle} />
        </group>

        {/* Illuminated TAXI roof sign for London Black Cabs & NYC Yellow Cabs */}
        {isTaxi && (
          <mesh position={[0, H + 0.06, -L * 0.08]}>
            <boxGeometry args={[0.46, 0.14, 0.18]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#f59e0b"
              emissiveIntensity={1.8}
            />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <group position={vehicle.position} rotation={[0, vehicle.rotationY, 0]}>
      {/* Main Body (Double-Decker London Bus) */}
      <mesh position={[0, H * 0.52, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H * 0.82, L]} />
        <meshPhysicalMaterial
          color={vehicle.color}
          metalness={0.35}
          roughness={0.24}
          clearcoat={0.85}
        />
      </mesh>

      {/* Upper cabin / double-decker window band */}
      <group>
        {/* Upper deck window strip */}
        <mesh position={[0, H * 0.72, 0]}>
          <boxGeometry args={[W * 1.01, H * 0.22, L * 0.92]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Lower deck window strip */}
        <mesh position={[0, H * 0.36, 0]}>
          <boxGeometry args={[W * 1.01, H * 0.2, L * 0.88]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Illuminated Destination Board */}
        <mesh position={[0, H * 0.56, -L * 0.505]}>
          <boxGeometry args={[W * 0.68, 0.28, 0.02]} />
          <meshStandardMaterial
            color="#fef08a"
            emissive="#facc15"
            emissiveIntensity={1.4}
          />
        </mesh>
      </group>

      {/* Headlights & Taillights */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * (W * 0.35), 0.52, -L * 0.502]}>
            <boxGeometry args={[0.26, 0.12, 0.03]} />
            <meshStandardMaterial
              color="#f8fafc"
              emissive="#bae6fd"
              emissiveIntensity={1.4}
            />
          </mesh>
          <mesh position={[side * (W * 0.35), 0.54, L * 0.502]}>
            <boxGeometry args={[0.28, 0.12, 0.03]} />
            <meshStandardMaterial
              color="#dc2626"
              emissive="#ef4444"
              emissiveIntensity={1.1}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CityStreetSignPost({ sign }: { sign: CityStreetSignSpec }) {
  return (
    <group position={sign.position} rotation={[0, sign.rotationY, 0]}>
      {/* Twin Steel Posts */}
      {[-0.85, 0.85].map((xOff, i) => (
        <mesh key={i} position={[xOff, 1.35, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 2.7, 10]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}

      {/* Street Name Plate (UK White/Black with Red Borough Subtext) */}
      <mesh position={[0, 2.35, 0]} castShadow>
        <boxGeometry args={[2.35, 0.62, 0.08]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.35} />
      </mesh>
      <mesh position={[0, 2.35, 0]}>
        <boxGeometry args={[2.42, 0.68, 0.06]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>

      <Text
        position={[0, 2.43, 0.055]}
        fontSize={0.165}
        color="#090d16"
        anchorX="center"
        anchorY="middle"
      >
        {sign.text}
      </Text>
      {sign.subtext && (
        <Text
          position={[0, 2.21, 0.055]}
          fontSize={0.105}
          color="#dc2626"
          anchorX="center"
          anchorY="middle"
        >
          {sign.subtext}
        </Text>
      )}
    </group>
  );
}

function CityFreeRoamBay({ bay }: { bay: CityParkingBaySpec }) {
  const { width: W, length: L } = bay.dimensions;
  return (
    <group position={bay.position} rotation={[0, bay.rotationY, 0]}>
      <mesh position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, L]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.16} />
      </mesh>
      {/* Painted Bay Border */}
      <mesh position={[0, 0.036, -L / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, 0.12]} />
        <meshBasicMaterial color="#34d399" />
      </mesh>
      <mesh position={[0, 0.036, L / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, 0.12]} />
        <meshBasicMaterial color="#34d399" />
      </mesh>
      <Text
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.42}
        color="#6ee7b7"
        anchorX="center"
        anchorY="middle"
      >
        P · BAY
      </Text>
    </group>
  );
}

export function RealCityEnvironment({
  city,
  enableShadows = true,
}: RealCityEnvironmentProps) {
  const isLeftHand = city.trafficSide === 'left';
  const [mapboxStyle] = useMapboxGroundStyle();
  const [mapboxTexture, setMapboxTexture] = useState<THREE.Texture | null>(
    null
  );

  const mapboxTileZoom = 16.5;
  const mapboxPlaneSizeMeters = useMemo(
    () => computeMapboxGroundSizeMeters(city.lat, mapboxTileZoom, 1280),
    [city.lat]
  );

  useEffect(() => {
    if (mapboxStyle === 'procedural') {
      setMapboxTexture(null);
      return;
    }

    let cancelled = false;
    const url = buildMapboxStaticImageUrl({
      lat: city.lat,
      lng: city.lng,
      zoom: mapboxTileZoom,
      style: mapboxStyle,
      width: 1280,
      height: 1280,
      retina: true,
    });

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 16;
        tex.needsUpdate = true;
        setMapboxTexture((prev) => {
          if (prev && prev !== tex) prev.dispose();
          return tex;
        });
      },
      undefined,
      () => {
        if (!cancelled) {
          setMapboxTexture(null);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [city.lat, city.lng, mapboxStyle]);

  return (
    <group name={`real-city-environment-${city.id}`}>
      {/* Sky Dome, Sun & Ambient Lighting */}
      <color attach="background" args={['#0c1424']} />
      <fog attach="fog" args={['#0c1424', 95, 320]} />
      <ambientLight intensity={0.72} />
      <hemisphereLight args={['#bae6fd', '#1e293b', 0.58]} />
      <directionalLight
        position={[65, 95, 45]}
        intensity={1.35}
        castShadow={enableShadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={260}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
      />

      {/* Outer Horizon Base Plane */}
      <mesh
        position={[0, -0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color="#141923" roughness={0.94} metalness={0.04} />
      </mesh>

      {/* Live Mapbox Satellite / Street High-Res 3D Ground Plane */}
      <mesh
        key={mapboxTexture ? `mbx-ground-${city.id}-${mapboxStyle}` : 'proc-ground'}
        position={[0, -0.015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry
          args={[
            mapboxTexture ? mapboxPlaneSizeMeters : 380,
            mapboxTexture ? mapboxPlaneSizeMeters : 380,
          ]}
        />
        {mapboxTexture ? (
          <meshStandardMaterial
            map={mapboxTexture}
            roughness={0.88}
            metalness={0.05}
          />
        ) : (
          <meshStandardMaterial
            color="#1e2430"
            roughness={0.92}
            metalness={0.05}
          />
        )}
      </mesh>

      {/* Road Network */}
      <group name="city-roads">
        {city.roads.map((road) => (
          <CityRoadSegment
            key={road.id}
            road={road}
            isLeftHand={isLeftHand}
          />
        ))}
      </group>

      {/* Roundabouts */}
      <group name="city-roundabouts">
        {city.roundabouts.map((rb) => (
          <CityRoundaboutNode key={rb.id} roundabout={rb} />
        ))}
      </group>

      {/* Free Roam Practice Parking Bays */}
      <group name="city-parking-bays">
        {city.parkingBays.map((bay) => (
          <CityFreeRoamBay key={bay.id} bay={bay} />
        ))}
      </group>

      {/* Street Signs */}
      <group name="city-street-signs">
        {city.streetSigns.map((sign) => (
          <CityStreetSignPost key={sign.id} sign={sign} />
        ))}
      </group>

      {/* Parked Buses, Cabs & Cars */}
      <group name="city-parked-vehicles">
        {city.parkedVehicles.map((veh) => (
          <CityParkedVehicleMesh key={veh.id} vehicle={veh} />
        ))}
      </group>

      {/* Real-Earth Buildings & Iconic Landmarks */}
      <group name="city-buildings">
        {city.buildings.map((bldg) => (
          <CityBuildingMesh key={bldg.id} building={bldg} />
        ))}
      </group>
    </group>
  );
}
