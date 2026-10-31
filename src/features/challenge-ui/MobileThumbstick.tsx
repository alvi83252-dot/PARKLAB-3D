/**
 * PARKLAB 3D — Mobile Virtual Thumbstick & Touch Handbrake Component
 *
 * Provides a responsive 360° touch/pointer virtual thumbstick and handbrake
 * pedal for mobile and tablet devices. Translates 2D thumbstick deflection
 * (including diagonal forward/reverse + left/right steering combinations)
 * into standard `KeyW`, `KeyS`, `KeyA`, `KeyD`, and `Space` window keyboard
 * events so `VehicleController` responds with zero changes to vehicle physics.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import './challenge-ui.css';

type ThumbstickKeyCode = 'KeyW' | 'KeyS' | 'KeyA' | 'KeyD' | 'Space';

const KEY_CHAR_MAP: Record<ThumbstickKeyCode, string> = {
  KeyW: 'w',
  KeyS: 's',
  KeyA: 'a',
  KeyD: 'd',
  Space: ' ',
};

const STICK_RADIUS_PX = 54;
const DEADZONE_RATIO = 0.24;

function dispatchDrivingKey(type: 'keydown' | 'keyup', code: ThumbstickKeyCode) {
  if (typeof window === 'undefined') {
    return;
  }
  const event = new KeyboardEvent(type, {
    code,
    key: KEY_CHAR_MAP[code],
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
}

export interface MobileThumbstickProps {
  /** Force-show thumbstick even on desktop viewports when enabled */
  forceVisible?: boolean;
}

export function MobileThumbstick({
  forceVisible = false,
}: MobileThumbstickProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const pressedKeysRef = useRef<Set<ThumbstickKeyCode>>(new Set());

  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isBrakingTouch, setIsBrakingTouch] = useState<boolean>(false);

  const syncDirectionKeys = useCallback(
    (normX: number, normY: number) => {
      const desired = new Set<ThumbstickKeyCode>();

      // Vertical axis: negative Y is UP (Accelerate / KeyW), positive Y is DOWN (Reverse / KeyS)
      if (normY < -DEADZONE_RATIO) {
        desired.add('KeyW');
      } else if (normY > DEADZONE_RATIO) {
        desired.add('KeyS');
      }

      // Horizontal axis: negative X is LEFT (Steer Left / KeyA), positive X is RIGHT (Steer Right / KeyD)
      if (normX < -DEADZONE_RATIO) {
        desired.add('KeyA');
      } else if (normX > DEADZONE_RATIO) {
        desired.add('KeyD');
      }

      const current = pressedKeysRef.current;

      // Release keys no longer active
      for (const code of Array.from(current)) {
        if (code !== 'Space' && !desired.has(code)) {
          current.delete(code);
          dispatchDrivingKey('keyup', code);
        }
      }

      // Press newly active keys
      for (const code of desired) {
        if (!current.has(code)) {
          current.add(code);
          dispatchDrivingKey('keydown', code);
        }
      }
    },
    []
  );

  const releaseAllStickKeys = useCallback(() => {
    const current = pressedKeysRef.current;
    for (const code of Array.from(current)) {
      current.delete(code);
      dispatchDrivingKey('keyup', code);
    }
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
      syncDirectionKeys(normX, normY);
    },
    [syncDirectionKeys]
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
    releaseAllStickKeys();
  };

  const handleBrakeDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsBrakingTouch(true);
    if (!pressedKeysRef.current.has('Space')) {
      pressedKeysRef.current.add('Space');
      dispatchDrivingKey('keydown', 'Space');
    }
  };

  const handleBrakeUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsBrakingTouch(false);
    if (pressedKeysRef.current.has('Space')) {
      pressedKeysRef.current.delete('Space');
      dispatchDrivingKey('keyup', 'Space');
    }
  };

  useEffect(() => {
    return () => {
      releaseAllStickKeys();
    };
  }, [releaseAllStickKeys]);

  return (
    <div
      className={`pk-thumbstick-dock ${
        forceVisible ? 'pk-thumbstick-dock--force-visible' : ''
      }`}
      aria-label="Mobile Touch Driving Thumbstick"
    >
      {/* Left/Main 360° Driving & Steering Thumbstick */}
      <div
        ref={baseRef}
        className={`pk-thumbstick ${
          isDragging ? 'pk-thumbstick--active' : ''
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
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

      {/* Dedicated Touch Handbrake / Stop Pedal */}
      <button
        type="button"
        className={`pk-thumbstick-brake ${
          isBrakingTouch ? 'pk-thumbstick-brake--active' : ''
        }`}
        onPointerDown={handleBrakeDown}
        onPointerUp={handleBrakeUp}
        onPointerCancel={handleBrakeUp}
      >
        <span>STOP</span>
        <small>BRAKE</small>
      </button>
    </div>
  );
}

export default MobileThumbstick;
