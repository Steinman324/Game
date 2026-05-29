export const InputState = {
  forward: false, backward: false,
  strafeLeft: false, strafeRight: false,
  turnLeft: false, turnRight: false,
  scanHeld: false, logToggle: false,
  use: false, confirm: false, pause: false,
  mouseDX: 0, pointerLocked: false,
  scanHoldMs: 0,
  _logConsumed: false, _pauseConsumed: false, _confirmConsumed: false,
};

let _canvas = null;

function onKeyDown(e) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    InputState.forward = true; break;
    case 'KeyS': case 'ArrowDown':  InputState.backward = true; break;
    case 'KeyA': case 'ArrowLeft':  InputState.strafeLeft = true; break;
    case 'KeyD': case 'ArrowRight': InputState.strafeRight = true; break;
    case 'KeyQ':                    InputState.turnLeft = true; break;
    case 'KeyE':                    InputState.scanHeld = true; break;
    case 'KeyL':
      if (!InputState._logConsumed) { InputState.logToggle = true; InputState._logConsumed = true; }
      break;
    case 'Escape':
      if (!InputState._pauseConsumed) { InputState.pause = true; InputState._pauseConsumed = true; }
      break;
    case 'Enter': case 'Space':
      if (!InputState._confirmConsumed) { InputState.confirm = true; InputState._confirmConsumed = true; }
      break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    InputState.forward = false; break;
    case 'KeyS': case 'ArrowDown':  InputState.backward = false; break;
    case 'KeyA': case 'ArrowLeft':  InputState.strafeLeft = false; break;
    case 'KeyD': case 'ArrowRight': InputState.strafeRight = false; break;
    case 'KeyQ':                    InputState.turnLeft = false; break;
    case 'KeyE':                    InputState.scanHeld = false; InputState.scanHoldMs = 0; break;
    case 'KeyL':                    InputState._logConsumed = false; break;
    case 'Escape':                  InputState._pauseConsumed = false; break;
    case 'Enter': case 'Space':     InputState._confirmConsumed = false; break;
  }
}

function onMouseMove(e) {
  if (InputState.pointerLocked) InputState.mouseDX += e.movementX;
}

function onPointerLockChange() {
  InputState.pointerLocked = document.pointerLockElement === _canvas;
}

function onMouseDown() {
  if (_canvas && !InputState.pointerLocked) _canvas.requestPointerLock().catch(() => {});
}

export function initInput(canvas) {
  _canvas = canvas;
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onPointerLockChange);
  canvas.addEventListener('click', onMouseDown);
}

export function removeInput() {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('pointerlockchange', onPointerLockChange);
}

export function flushMouseDX() {
  const dx = InputState.mouseDX;
  InputState.mouseDX = 0;
  return dx;
}

export function consumeLog() { InputState.logToggle = false; }
export function consumePause() { InputState.pause = false; }
export function consumeConfirm() { InputState.confirm = false; InputState._confirmConsumed = false; }
