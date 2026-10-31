/**
 * PARKLAB 3D — Keyboard & Touch Driving + SpaceX 3D Flight Input Hook
 * High-frequency ref-based listener for:
 * - W/A/S/D and Arrow keys (throttle, brake/reverse, steering/yaw)
 * - Space / Q / PageUp (Ascend / Vertical Thrusters on Roadster, Handbrake on ground cars)
 * - Shift / F / PageDown (Descend / Land Thrusters on Roadster)
 * - B (Dedicated Handbrake)
 * - On-screen HUD touch/pointer driving & flight controls.
 */

import { useEffect, useRef, type MutableRefObject } from 'react';

export interface DrivingInputState {
  accelerate: boolean;
  brakeOrReverse: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  handbrake: boolean;
  ascend: boolean;
  descend: boolean;
}

export type DrivingAction = keyof DrivingInputState;

const INITIAL_INPUT_STATE: DrivingInputState = {
  accelerate: false,
  brakeOrReverse: false,
  steerLeft: false,
  steerRight: false,
  handbrake: false,
  ascend: false,
  descend: false,
};

const virtualInputState: DrivingInputState = { ...INITIAL_INPUT_STATE };
const virtualInputSubscribers = new Set<() => void>();

/**
 * Sets or releases a virtual driving/flight input action (used by HUD touch/pointer pedals, wheel & flight deck).
 */
export function setVirtualDrivingInput(
  action: DrivingAction,
  active: boolean
): void {
  if (virtualInputState[action] === active) {
    return;
  }
  virtualInputState[action] = active;
  virtualInputSubscribers.forEach((sync) => sync());
}

/**
 * Clears all virtual touch/pointer driving and flight inputs.
 */
export function clearVirtualDrivingInputs(): void {
  let changed = false;
  (Object.keys(virtualInputState) as DrivingAction[]).forEach((key) => {
    if (virtualInputState[key]) {
      virtualInputState[key] = false;
      changed = true;
    }
  });
  if (changed) {
    virtualInputSubscribers.forEach((sync) => sync());
  }
}

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    target.isContentEditable
  );
}

function mapKeyEventToActions(event: KeyboardEvent): DrivingAction[] {
  const code = event.code;
  const key = event.key.toLowerCase();

  if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup') {
    return ['accelerate'];
  }
  if (
    code === 'KeyS' ||
    code === 'ArrowDown' ||
    key === 's' ||
    key === 'arrowdown'
  ) {
    return ['brakeOrReverse'];
  }
  if (
    code === 'KeyA' ||
    code === 'ArrowLeft' ||
    key === 'a' ||
    key === 'arrowleft'
  ) {
    return ['steerLeft'];
  }
  if (
    code === 'KeyD' ||
    code === 'ArrowRight' ||
    key === 'd' ||
    key === 'arrowright'
  ) {
    return ['steerRight'];
  }
  // Space activates vertical ascent thrusters on flight-capable vehicles and handbrake on ground vehicles
  if (code === 'Space' || key === ' ') {
    return ['ascend', 'handbrake'];
  }
  if (code === 'KeyQ' || code === 'PageUp' || key === 'q') {
    return ['ascend'];
  }
  if (
    code === 'ShiftLeft' ||
    code === 'ShiftRight' ||
    code === 'KeyF' ||
    code === 'PageDown' ||
    key === 'f' ||
    key === 'shift'
  ) {
    return ['descend'];
  }
  if (code === 'KeyB' || key === 'b') {
    return ['handbrake'];
  }

  return [];
}

export function useKeyboardControls(
  enabled = true
): MutableRefObject<DrivingInputState> {
  const inputRef = useRef<DrivingInputState>({ ...INITIAL_INPUT_STATE });
  const heldCodesRef = useRef<Record<DrivingAction, Set<string>>>({
    accelerate: new Set(),
    brakeOrReverse: new Set(),
    steerLeft: new Set(),
    steerRight: new Set(),
    handbrake: new Set(),
    ascend: new Set(),
    descend: new Set(),
  });

  useEffect(() => {
    const syncCombinedInputs = () => {
      if (!enabled) {
        inputRef.current.accelerate = false;
        inputRef.current.brakeOrReverse = false;
        inputRef.current.steerLeft = false;
        inputRef.current.steerRight = false;
        inputRef.current.handbrake = false;
        inputRef.current.ascend = false;
        inputRef.current.descend = false;
        return;
      }

      inputRef.current.accelerate =
        heldCodesRef.current.accelerate.size > 0 || virtualInputState.accelerate;
      inputRef.current.brakeOrReverse =
        heldCodesRef.current.brakeOrReverse.size > 0 ||
        virtualInputState.brakeOrReverse;
      inputRef.current.steerLeft =
        heldCodesRef.current.steerLeft.size > 0 || virtualInputState.steerLeft;
      inputRef.current.steerRight =
        heldCodesRef.current.steerRight.size > 0 || virtualInputState.steerRight;
      inputRef.current.handbrake =
        heldCodesRef.current.handbrake.size > 0 || virtualInputState.handbrake;
      inputRef.current.ascend =
        heldCodesRef.current.ascend.size > 0 || virtualInputState.ascend;
      inputRef.current.descend =
        heldCodesRef.current.descend.size > 0 || virtualInputState.descend;
    };

    const resetAllInputs = () => {
      heldCodesRef.current.accelerate.clear();
      heldCodesRef.current.brakeOrReverse.clear();
      heldCodesRef.current.steerLeft.clear();
      heldCodesRef.current.steerRight.clear();
      heldCodesRef.current.handbrake.clear();
      heldCodesRef.current.ascend.clear();
      heldCodesRef.current.descend.clear();
      clearVirtualDrivingInputs();
      syncCombinedInputs();
    };

    virtualInputSubscribers.add(syncCombinedInputs);

    if (!enabled) {
      resetAllInputs();
      return () => {
        virtualInputSubscribers.delete(syncCombinedInputs);
      };
    }

    syncCombinedInputs();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) {
        return;
      }

      const actions = mapKeyEventToActions(event);
      if (actions.length === 0) {
        return;
      }

      // Prevent default browser scrolling on Arrow keys, Space, PageUp/PageDown while driving/flying
      if (
        event.code === 'Space' ||
        event.code.startsWith('Arrow') ||
        event.code === 'PageUp' ||
        event.code === 'PageDown' ||
        event.key === ' ' ||
        event.key.startsWith('Arrow')
      ) {
        event.preventDefault();
      }

      const token = event.code || event.key.toLowerCase();
      for (const action of actions) {
        heldCodesRef.current[action].add(token);
      }
      syncCombinedInputs();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const actions = mapKeyEventToActions(event);
      if (actions.length === 0) {
        return;
      }

      const token = event.code || event.key.toLowerCase();
      for (const action of actions) {
        heldCodesRef.current[action].delete(token);
      }
      syncCombinedInputs();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        resetAllInputs();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', resetAllInputs);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      virtualInputSubscribers.delete(syncCombinedInputs);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetAllInputs);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resetAllInputs();
    };
  }, [enabled]);

  return inputRef;
}
