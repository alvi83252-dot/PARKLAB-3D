/**
 * PARKLAB 3D — Mobile Virtual Thumbstick (Right) & Touch Handbrake + 3D Flight Controls (Left)
 *
 * Ergonomic dual-thumb mobile layout:
 * - Left Thumb (Bottom-Left):
 *   - Dedicated BRAKE / STOP pedal (`handbrake`)
 *   - When driving a flight-capable vehicle (Tesla Roadster): SpaceX 3D Flight vertical thrusters
 *     (`▲ FLY UP` for `ascend`, `▼ DOWN` for `descend`) + live Altitude readout.
 * - Right Thumb (Bottom-Right): 360° Drive & Steer thumbstick (`accelerate`, `brakeOrReverse`, `steerLeft`, `steerRight`)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { setVirtualDrivingInput } from '../vehicles/useKeyboardControls';
import './challenge-ui.css';

const STICK_RADIUS_PX = 48;
const DEADZONE_RATIO = 0.24;

export interface MobileThumbstickProps {
  /** Force-show thumbstick even on desktop viewports when enabled */
  forceVisible?: boolean;
  /** Whether the active vehicle supports 3D vertical flight (e.g. Tesla Roadster) */
  isFlyingCapable?: boolean;
  /** Current altitude in meters */
  altitudeMeters?: number;
  /** Whether the vehicle is currently airborne */
  isAirborne?: boolean;
}

export function MobileThumbstick({
  forceVisible = false,
  isFlyingCapable = false,
  altitudeMeters = 0,
  isAirborne = false,
}: MobileThumbstickProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isBrakingTouch, setIsBrakingTouch] = useState<boolean>(false);
  const [activeFlightTouch, setActiveFlightTouch] = useState<
    'ascend' | 'descend' | null
  >(null);

  const syncDirectionInputs = useCallback((normX: number, normY: number) => {
    // Vertical axis: negative Y is UP (Accelerate), positive Y is DOWN (Brake / Reverse)
    setVirtualDrivingInput('accelerate', normY < -DEADZONE_RATIO);
    setVirtualDrivingInput('brakeOrReverse', normY > DEADZONE_RATIO);

    // Horizontal axis: negative X is LEFT (Steer Left), positive X is RIGHT (Steer Right)
    setVirtualDrivingInput('steerLeft', normX < -DEADZONE_RATIO);
    setVirtualDrivingInput('steerRight', normX > DEADZONE_RATIO);
  }, []);

  const releaseAllStickInputs = useCallback(() => {
    setVirtualDrivingInput('accelerate', false);
    setVirtualDrivingInput('brakeOrReverse', false);
    setVirtualDrivingInput('steerLeft', false);
    setVirtualDrivingInput('steerRight', false);
    activePointerIdRef.current = null;
    setIsDragging(false);
    setKnobOffset({ x: 0, y: 0 });
  }, []);

  const updateStickFromClientXY = useCallback(
    (clientX: number, clientY: number) => {
      const baseEl = baseRef.current;
      if (!baseEl) {
        return;
      }
      const rect = baseEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const rawDx = clientX - centerX;
      const rawDy = clientY - centerY;
      const dist = Math.hypot(rawDx, rawDy);

      const clampedDist = Math.min(dist, STICK_RADIUS_PX);
      const angle = Math.atan2(rawDy, rawDx);
      const clampedX = Math.cos(angle) * clampedDist;
      const clampedY = Math.sin(angle) * clampedDist;

      setKnobOffset({ x: clampedX, y: clampedY });

      const normX = clampedX / STICK_RADIUS_PX;
      const normY = clampedY / STICK_RADIUS_PX;
      syncDirectionInputs(normX, normY);
    },
    [syncDirectionInputs]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    updateStickFromClientXY(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) {
      return;
    }
    e.preventDefault();
    updateStickFromClientXY(e.clientX, e.clientY);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) {
      return;
    }
    e.preventDefault();
    releaseAllStickInputs();
  };

  const handleBrakeDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsBrakingTouch(true);
    setVirtualDrivingInput('handbrake', true);
  };

  const handleBrakeUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsBrakingTouch(false);
    setVirtualDrivingInput('handbrake', false);
  };

  const handleAscendDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setActiveFlightTouch('ascend');
    setVirtualDrivingInput('descend', false);
    setVirtualDrivingInput('ascend', true);
  };

  const handleAscendUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setActiveFlightTouch((prev) => (prev === 'ascend' ? null : prev));
    setVirtualDrivingInput('ascend', false);
  };

  const handleDescendDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setActiveFlightTouch('descend');
    setVirtualDrivingInput('ascend', false);
    setVirtualDrivingInput('descend', true);
  };

  const handleDescendUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setActiveFlightTouch((prev) => (prev === 'descend' ? null : prev));
    setVirtualDrivingInput('descend', false);
  };

  useEffect(() => {
    if (!isFlyingCapable) {
      setActiveFlightTouch(null);
      setVirtualDrivingInput('ascend', false);
      setVirtualDrivingInput('descend', false);
    }
  }, [isFlyingCapable]);

  useEffect(() => {
    return () => {
      releaseAllStickInputs();
      setVirtualDrivingInput('handbrake', false);
      setVirtualDrivingInput('ascend', false);
      setVirtualDrivingInput('descend', false);
    };
  }, [releaseAllStickInputs]);

  return (
    <div
      className={`pk-thumbstick-dock ${
        forceVisible ? 'pk-thumbstick-dock--force-visible' : ''
      }`}
      aria-label="Mobile Touch Driving Controls"
    >
      {/* LEFT SIDE: Touch Handbrake + Roadster SpaceX 3D Flight Up/Down Thrusters */}
      <div className="pk-thumbstick-left-cluster">
        {isFlyingCapable && (
          <div
            className={`pk-thumbstick-flight-stack ${
              isAirborne ? 'pk-thumbstick-flight-stack--airborne' : ''
            }`}
            role="group"
            aria-label="Roadster 3D Flight Controls"
          >
            <span className="pk-thumbstick-alt-badge">
              ALT {altitudeMeters.toFixed(1)}m
            </span>
            <button
              type="button"
              className={`pk-thumbstick-flight-btn pk-thumbstick-flight-btn--up ${
                activeFlightTouch === 'ascend' ? 'is-active' : ''
              }`}
              onPointerDown={handleAscendDown}
              onPointerUp={handleAscendUp}
              onPointerCancel={handleAscendUp}
              onLostPointerCapture={handleAscendUp}
              aria-label="Fly Up (Ascend)"
              data-testid="mobile-fly-up-btn"
            >
              <span>▲ FLY UP</span>
            </button>
            <button
              type="button"
              className={`pk-thumbstick-flight-btn pk-thumbstick-flight-btn--down ${
                activeFlightTouch === 'descend' ? 'is-active' : ''
              }`}
              onPointerDown={handleDescendDown}
              onPointerUp={handleDescendUp}
              onPointerCancel={handleDescendUp}
              onLostPointerCapture={handleDescendUp}
              aria-label="Fly Down (Descend)"
              data-testid="mobile-fly-down-btn"
            >
              <span>▼ DOWN</span>
            </button>
          </div>
        )}

        <button
          type="button"
          className={`pk-thumbstick-brake ${
            isBrakingTouch ? 'pk-thumbstick-brake--active' : ''
          }`}
          onPointerDown={handleBrakeDown}
          onPointerUp={handleBrakeUp}
          onPointerCancel={handleBrakeUp}
          onLostPointerCapture={handleBrakeUp}
        >
          <span>BRAKE</span>
          <small>STOP</small>
        </button>
      </div>

      {/* RIGHT SIDE: 360° Driving & Steering Thumbstick */}
      <div
        ref={baseRef}
        className={`pk-thumbstick ${
          isDragging ? 'pk-thumbstick--active' : ''
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        onLostPointerCapture={handlePointerUpOrCancel}
        role="slider"
        aria-label="Drive and Steer Thumbstick"
        aria-valuenow={Math.round((knobOffset.x / STICK_RADIUS_PX) * 100)}
        tabIndex={-1}
      >
        <span className="pk-thumbstick__dir pk-thumbstick__dir--up">FWD</span>
        <span className="pk-thumbstick__dir pk-thumbstick__dir--down">REV</span>
        <span className="pk-thumbstick__dir pk-thumbstick__dir--left">L</span>
        <span className="pk-thumbstick__dir pk-thumbstick__dir--right">R</span>

        <div
          className="pk-thumbstick__knob"
          style={{
            transform: `translate(${knobOffset.x.toFixed(1)}px, ${knobOffset.y.toFixed(1)}px)`,
          }}
        />
      </div>
    </div>
  );
}

export default MobileThumbstick;
