/**
 * PARKLAB 3D — AttemptReplayModal (Interactive Saved Replay Theatre)
 *
 * Allows watching any saved attempt replay (recorded automatically when
 * completing or quitting/retrying a challenge). Renders a real-time 2D
 * top-down telemetry canvas showing the target bay, obstacles, driven
 * trajectory trail (forward vs reverse), collision markers, and animated
 * rotated vehicle with Play/Pause, timeline scrubbing, and speed controls.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Film,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import type { SavedAttemptReplay } from '../evaluation/attemptReplayStore';
import './challenge-ui.css';

export interface AttemptReplayModalProps {
  activeReplay: SavedAttemptReplay;
  allSavedReplays: SavedAttemptReplay[];
  onSelectReplay: (replay: SavedAttemptReplay) => void;
  onDeleteReplay: (replayId: string) => void;
  onWatchIn3D?: (replay: SavedAttemptReplay) => void;
  onClose: () => void;
}

const CANVAS_W = 620;
const CANVAS_H = 360;
const PIXELS_PER_METER = 18;

export function AttemptReplayModal({
  activeReplay,
  allSavedReplays,
  onSelectReplay,
  onDeleteReplay,
  onWatchIn3D,
  onClose,
}: AttemptReplayModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [frameIndex, setFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const totalFrames = Math.max(1, activeReplay.frames.length);
  const safeIndex = Math.min(frameIndex, totalFrames - 1);
  const currentFrame = activeReplay.frames[safeIndex] ?? activeReplay.frames[0];

  // Reset to start when switching replays
  useEffect(() => {
    setFrameIndex(0);
    setIsPlaying(true);
  }, [activeReplay.replayId]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying || totalFrames <= 1) {
      return;
    }

    const stepMs = Math.max(25, Math.round(100 / playbackSpeed));
    const timer = window.setInterval(() => {
      setFrameIndex((prev) => {
        if (prev + 1 >= totalFrames) {
          setIsPlaying(false);
          return totalFrames - 1;
        }
        return prev + 1;
      });
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, playbackSpeed, totalFrames]);

  // Render 2D Top-Down Telemetry Replay Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFrame) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const centerWorldX = activeReplay.parkingTarget.position[0] * 0.5;
    const centerWorldZ = activeReplay.parkingTarget.position[2] * 0.5 + 1.5;

    const worldToCanvas = (wx: number, wz: number): [number, number] => {
      const cx = CANVAS_W / 2 + (wx - centerWorldX) * PIXELS_PER_METER;
      const cy = CANVAS_H / 2 + (wz - centerWorldZ) * PIXELS_PER_METER;
      return [cx, cy];
    };

    // 1. Background asphalt & subtle meter grid
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let gx = -20; gx <= 20; gx += 2) {
      const [px] = worldToCanvas(gx, 0);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, CANVAS_H);
      ctx.stroke();
    }
    for (let gz = -20; gz <= 20; gz += 2) {
      const [, pz] = worldToCanvas(0, gz);
      ctx.beginPath();
      ctx.moveTo(0, pz);
      ctx.lineTo(CANVAS_W, pz);
      ctx.stroke();
    }

    // Helper to draw a rotated world rectangle
    const drawRotatedBox = (
      wx: number,
      wz: number,
      rotY: number,
      widthM: number,
      lengthM: number,
      fill: string,
      stroke: string,
      lineWidth = 1.5
    ) => {
      const [cx, cy] = worldToCanvas(wx, wz);
      ctx.save();
      ctx.translate(cx, cy);
      // In Three.js top-down (+X right, +Z down), positive rotationY is counter-clockwise
      ctx.rotate(-rotY);
      const wPx = widthM * PIXELS_PER_METER;
      const lPx = lengthM * PIXELS_PER_METER;
      ctx.fillStyle = fill;
      ctx.fillRect(-wPx / 2, -lPx / 2, wPx, lPx);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(-wPx / 2, -lPx / 2, wPx, lPx);
      ctx.restore();
    };

    // 2. Draw Target Parking Bay
    const target = activeReplay.parkingTarget;
    drawRotatedBox(
      target.position[0],
      target.position[2],
      target.rotationY,
      target.width,
      target.length,
      'rgba(16, 185, 129, 0.16)',
      '#10b981',
      2
    );

    // 3. Draw Obstacles (parked cars, cones, kerbs)
    for (const obs of activeReplay.obstacles) {
      if (obs.kind === 'parked-car') {
        drawRotatedBox(
          obs.position[0],
          obs.position[2],
          obs.rotationY,
          obs.dimensions.width,
          obs.dimensions.length,
          'rgba(51, 65, 85, 0.88)',
          '#94a3b8',
          1.5
        );
      } else if (obs.kind === 'kerb') {
        drawRotatedBox(
          obs.position[0],
          obs.position[2],
          obs.rotationY,
          obs.dimensions.width,
          obs.dimensions.length,
          'rgba(148, 163, 184, 0.55)',
          '#cbd5e1',
          1
        );
      } else if (obs.kind === 'cone') {
        const [coneX, coneY] = worldToCanvas(obs.position[0], obs.position[2]);
        ctx.beginPath();
        ctx.arc(coneX, coneY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#f97316';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // 4. Draw Driven Trajectory Trail up to current frame
    for (let i = 1; i <= safeIndex; i += 1) {
      const prev = activeReplay.frames[i - 1];
      const curr = activeReplay.frames[i];
      const [x1, y1] = worldToCanvas(prev.x, prev.z);
      const [x2, y2] = worldToCanvas(curr.x, curr.z);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = curr.rev ? '#fbbf24' : '#38bdf8';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    // 5. Draw Crash Markers up to current timestamp
    for (const marker of activeReplay.crashMarkers) {
      if (marker.t <= currentFrame.t + 0.15) {
        const [mx, my] = worldToCanvas(marker.x, marker.z);
        ctx.beginPath();
        ctx.arc(mx, my, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // 6. Draw Animated Player Vehicle at currentFrame
    const [vx, vy] = worldToCanvas(currentFrame.x, currentFrame.z);
    const vW = activeReplay.vehicleDimensions.width * PIXELS_PER_METER;
    const vL = activeReplay.vehicleDimensions.length * PIXELS_PER_METER;

    ctx.save();
    ctx.translate(vx, vy);
    ctx.rotate(-currentFrame.rotY);

    // Vehicle body
    ctx.fillStyle = activeReplay.vehicleColor || '#3b82f6';
    ctx.fillRect(-vW / 2, -vL / 2, vW, vL);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-vW / 2, -vL / 2, vW, vL);

    // Front windshield (-Y in canvas local is -Z forward)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-vW * 0.38, -vL * 0.28, vW * 0.76, vL * 0.42);

    // Front headlights (-Z)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-vW * 0.42, -vL / 2 - 1.5, vW * 0.22, 3);
    ctx.fillRect(vW * 0.2, -vL / 2 - 1.5, vW * 0.22, 3);

    // Rear brake / reverse lights (+Z)
    ctx.fillStyle = currentFrame.rev ? '#fbbf24' : '#ef4444';
    ctx.fillRect(-vW * 0.42, vL / 2 - 1.5, vW * 0.24, 3);
    ctx.fillRect(vW * 0.18, vL / 2 - 1.5, vW * 0.24, 3);

    ctx.restore();
  }, [activeReplay, currentFrame, safeIndex]);

  return (
    <div
      className="pk-replay-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pk-replay-modal-title"
    >
      <div className="pk-replay-modal">
        {/* Header */}
        <header className="pk-replay-modal__header">
          <div className="pk-replay-modal__title-wrap">
            <span className="pk-coach-bar__pill pk-coach-bar__pill--accent">
              <Film size={13} aria-hidden="true" />
              <span>Attempt Replay Theatre</span>
            </span>
            <h2 id="pk-replay-modal-title" className="pk-replay-modal__title">
              {activeReplay.challengeTitle} · Attempt #
              {activeReplay.attemptNumber} ({activeReplay.vehicleName})
            </h2>
          </div>

          <button
            type="button"
            className="pk-crash-coach__close-btn"
            onClick={onClose}
            aria-label="Close Replay Theatre"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="pk-replay-modal__body">
          {/* Left: 2D Top-Down Replay Canvas & Playback Controls */}
          <div className="pk-replay-modal__stage">
            <div className="pk-replay-modal__canvas-wrap">
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="pk-replay-modal__canvas"
              />

              {/* Live Frame Telemetry Overlay */}
              {currentFrame && (
                <div className="pk-replay-modal__hud-strip">
                  <span>Time: {currentFrame.t.toFixed(1)}s</span>
                  <span>
                    Speed: {currentFrame.speedMph.toFixed(1)} mph (
                    {currentFrame.rev ? 'REV' : 'FWD'})
                  </span>
                  <span>Steer: {currentFrame.steerDeg.toFixed(0)}°</span>
                  <span className="pk-replay-modal__legend">
                    <i style={{ background: '#38bdf8' }} /> Forward
                    <i style={{ background: '#fbbf24' }} /> Reverse
                    <i style={{ background: '#10b981' }} /> Target Bay
                  </span>
                </div>
              )}
            </div>

            {/* Scrubber & Playback Controls */}
            <div className="pk-replay-modal__controls">
              <button
                type="button"
                className="pk-btn pk-btn--primary"
                onClick={() => {
                  if (safeIndex >= totalFrames - 1) {
                    setFrameIndex(0);
                    setIsPlaying(true);
                  } else {
                    setIsPlaying((prev) => !prev);
                  }
                }}
              >
                {isPlaying ? (
                  <>
                    <Pause size={13} aria-hidden="true" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play size={13} aria-hidden="true" />
                    <span>{safeIndex >= totalFrames - 1 ? 'Replay' : 'Play'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="pk-btn pk-btn--secondary"
                onClick={() => {
                  setFrameIndex(0);
                  setIsPlaying(true);
                }}
                title="Restart replay from 0.0s"
              >
                <RotateCcw size={13} aria-hidden="true" />
              </button>

              <input
                type="range"
                min={0}
                max={Math.max(0, totalFrames - 1)}
                value={safeIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  setFrameIndex(Number(e.target.value));
                }}
                className="pk-replay-modal__scrubber"
                aria-label="Replay timeline scrubber"
              />

              <div className="pk-replay-modal__speed-btns">
                {[0.5, 1, 2].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    className={`pk-btn ${
                      playbackSpeed === spd
                        ? 'pk-btn--primary'
                        : 'pk-btn--secondary'
                    }`}
                    onClick={() => setPlaybackSpeed(spd)}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {onWatchIn3D && (
                <button
                  type="button"
                  className="pk-btn pk-btn--replay"
                  onClick={() => onWatchIn3D(activeReplay)}
                  title="Launch this saved attempt in the interactive 3D viewport"
                >
                  <Film size={13} aria-hidden="true" />
                  <span>Watch in 3D</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: General Saved Replays List */}
          <aside className="pk-replay-modal__sidebar">
            <span className="pk-hud__label">
              Saved Replays ({allSavedReplays.length})
            </span>

            <div className="pk-replay-modal__list">
              {allSavedReplays.map((item) => {
                const selected = item.replayId === activeReplay.replayId;
                const badgeText =
                  item.outcome === 'passed'
                    ? `PASS (${item.score}/100)`
                    : item.outcome === 'try-again'
                      ? `EVAL (${item.score ?? 0}/100)`
                      : 'QUIT / RETRY';

                return (
                  <div
                    key={item.replayId}
                    className={`pk-replay-modal__item ${
                      selected ? 'pk-replay-modal__item--active' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="pk-replay-modal__item-select"
                      onClick={() => onSelectReplay(item)}
                    >
                      <div className="pk-replay-modal__item-top">
                        <strong>
                          #{item.attemptNumber} · {item.challengeTitle}
                        </strong>
                        <span className="pk-replay-modal__outcome-tag">
                          {badgeText}
                        </span>
                      </div>
                      <span className="pk-replay-modal__item-meta">
                        {item.vehicleName} · {item.durationSeconds.toFixed(1)}s ·{' '}
                        {item.collisionCount} collision(s)
                      </span>
                    </button>

                    <button
                      type="button"
                      className="pk-replay-modal__delete-btn"
                      onClick={() => onDeleteReplay(item.replayId)}
                      title="Delete saved replay"
                      aria-label={`Delete replay for ${item.challengeTitle}`}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default AttemptReplayModal;
