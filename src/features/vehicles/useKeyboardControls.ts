/**
 * PARKLAB 3D — Keyboard Driving Input Hook
 * High-frequency ref-based keyboard listener for W/A/S/D, Arrow keys, and Space handbrake.
 */

import { useEffect, useRef, type MutableRefObject } from 'react';

export interface DrivingInputState {
  accelerate: boolean;
  brakeOrReverse: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  handbrake: boolean;
}

const INITIAL_INPUT_STATE: DrivingInputState = {
  accelerate: false,
  brakeOrReverse: false,
  steerLeft: false,
  steerRight: false,
  handbrake: false,
};

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

type DrivingAction = keyof DrivingInputState;

function mapKeyEventToAction(event: KeyboardEvent): DrivingAction | null {
  const code = event.code;
  const key = event.key.toLowerCase();

  if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup') {
    return 'accelerate';
  }
  if (
    code === 'KeyS' ||
    code === 'ArrowDown' ||
    key === 's' ||
    key === 'arrowdown'
  ) {
    return 'brakeOrReverse';
  }
  if (
    code === 'KeyA' ||
    code === 'ArrowLeft' ||
    key === 'a' ||
    key === 'arrowleft'
  ) {
    return 'steerLeft';
  }
  if (
    code === 'KeyD' ||
    code === 'ArrowRight' ||
    key === 'd' ||
    key === 'arrowright'
  ) {
    return 'steerRight';
  }
  if (code === 'Space' || key === ' ') {
    return 'handbrake';
  }

  return null;
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
  });

  useEffect(() => {
    const resetAllInputs = () => {
      heldCodesRef.current.accelerate.clear();
      heldCodesRef.current.brakeOrReverse.clear();
      heldCodesRef.current.steerLeft.clear();
      heldCodesRef.current.steerRight.clear();
      heldCodesRef.current.handbrake.clear();

      inputRef.current.accelerate = false;
      inputRef.current.brakeOrReverse = false;
      inputRef.current.steerLeft = false;
      inputRef.current.steerRight = false;
      inputRef.current.handbrake = false;
    };

    if (!enabled) {
      resetAllInputs();
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) {
        return;
      }

      const action = mapKeyEventToAction(event);
      if (!action) {
        return;
      }

      // Prevent default browser scrolling on Arrow keys and Space while driving
      if (
        event.code === 'Space' ||
        event.code.startsWith('Arrow') ||
        event.key === ' ' ||
        event.key.startsWith('Arrow')
      ) {
        event.preventDefault();
      }

      const token = event.code || event.key.toLowerCase();
      heldCodesRef.current[action].add(token);
      inputRef.current[action] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const action = mapKeyEventToAction(event);
      if (!action) {
        return;
      }

      const token = event.code || event.key.toLowerCase();
      heldCodesRef.current[action].delete(token);
      inputRef.current[action] = heldCodesRef.current[action].size > 0;
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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetAllInputs);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resetAllInputs();
    };
  }, [enabled]);

  return inputRef;
}
