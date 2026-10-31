/**
 * PARKLAB 3D — 3D Floating Rival Driver Nameplates (ARTHUR & YUSUFDEMIR201)
 *
 * Renders camera-facing 3D HUD badges above parked rival vehicles in the
 * driving environment, matching the competitive multiplayer parking aesthetic:
 *   LV 85          PARK MASTER
 *   [👤 ARTHUR] / [👤 YUSUFDEMIR201]
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { ObstacleDefinition } from '../../types/challenge.types';

export interface RivalNameplates3DProps {
  obstacles: ObstacleDefinition[];
}

interface RivalBadgeSpec {
  callsign: string;
  level: number;
  rankTitle: string;
  accentColor: string;
}

const RIVAL_SPECS: RivalBadgeSpec[] = [
  {
    callsign: 'ARTHUR',
    level: 85,
    rankTitle: 'PARK MASTER',
    accentColor: '#f59e0b',
  },
  {
    callsign: 'YUSUFDEMIR201',
    level: 85,
    rankTitle: 'PARK MASTER',
    accentColor: '#38bdf8',
  },
  {
    callsign: 'VALKYRIE_UK',
    level: 72,
    rankTitle: 'GRAND TOURER PRO',
    accentColor: '#ef4444',
  },
  {
    callsign: 'KAI_STUTTGART',
    level: 56,
    rankTitle: 'APEX SPECIALIST',
    accentColor: '#a855f7',
  },
];

function createRivalBadgeTexture(spec: RivalBadgeSpec): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  ctx.clearRect(0, 0, 512, 160);

  // Top Header Row: "LV 85" (left) and "PARK MASTER" (right)
  ctx.font = '700 24px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 6;
  ctx.fillText(`LV ${spec.level}`, 36, 38);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(spec.rankTitle, 476, 38);
  ctx.textAlign = 'left';

  // Main Dark Translucent Callsign Banner Box
  ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(10, 14, 23, 0.84)';
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.34)';
  ctx.lineWidth = 2.5;

  const bx = 28;
  const by = 52;
  const bw = 456;
  const bh = 78;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(bx, by, bw, bh, 10);
  } else {
    ctx.rect(bx, by, bw, bh);
  }
  ctx.fill();
  ctx.stroke();

  // Left Accent Strip
  ctx.fillStyle = spec.accentColor;
  ctx.fillRect(bx, by + 8, 6, bh - 16);

  // Driver Avatar Silhouette Icon
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(bx + 42, by + 28, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(bx + 26, by + 43, 32, 22, 6);
  } else {
    ctx.rect(bx + 26, by + 43, 32, 22);
  }
  ctx.fill();

  // Callsign Typography
  ctx.font = '800 34px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(spec.callsign, bx + 76, by + 51);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function RivalNameplates3D({ obstacles }: RivalNameplates3DProps) {
  const carObstacles = useMemo(
    () => obstacles.filter((obs) => obs.kind === 'parked-car').slice(0, 4),
    [obstacles]
  );

  const badgeTextures = useMemo(
    () => RIVAL_SPECS.map((spec) => createRivalBadgeTexture(spec)),
    []
  );

  if (carObstacles.length === 0) {
    return null;
  }

  return (
    <group name="rival-driver-nameplates-3d">
      {carObstacles.map((obs, idx) => {
        const texture = badgeTextures[idx % badgeTextures.length];
        if (!texture) return null;
        const height = obs.dimensions?.height ?? 1.45;

        return (
          <sprite
            key={`rival-tag-${obs.id}`}
            position={[
              obs.position[0],
              obs.position[1] + height + 1.08,
              obs.position[2],
            ]}
            scale={[2.85, 0.88, 1]}
          >
            <spriteMaterial
              map={texture}
              transparent
              depthWrite={false}
              opacity={0.95}
            />
          </sprite>
        );
      })}
    </group>
  );
}
