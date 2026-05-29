export const InputState = {
  forward: false,
  backward: false,
  strafeLeft: false,
  strafeRight: false,
  turnLeft: false,
  turnRight: false,
  shoot: false,
  use: false,          // open door
  pause: false,
  confirm: false,      // menu/gameover confirm
  mouseDX: 0,
  pointerLocked: false,
  _shootConsumed: false,
  _useConsumed: false,
  _pauseConsumed: false,
  _confirmConsumed: false,
};

let _canvas = null;

function onKeyDown(e) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    InputState.forward = true; break;
    case 'KeyS': case 'ArrowDown':  InputState.backward = true; break;
    case 'KeyA':                    InputState.strafeLeft = true; break;
    case 'KeyD':                    InputState.strafeRight = true; break;
    case 'ArrowLeft':               InputState.turnLeft = true; break;
    case 'ArrowRight':              InputState.turnRight = true; break;
    case 'Space': case 'KeyE':
      if (!InputState._useConsumed) { InputState.use = true; }
      break;
    case 'Escape':
      if (!InputState._pauseConsumed) { InputState.pause = true; }
      break;
    case 'Enter':
      if (!InputState._confirmConsumed) { InputState.confirm = true; }
      break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    InputState.forward = false; break;
    case 'KeyS': case 'ArrowDown':  InputState.backward = false; break;
    case 'KeyA':                    InputState.strafeLeft = false; break;
    case 'KeyD':                    InputState.strafeRight = false; break;
    case 'ArrowLeft':               InputState.turnLeft = false; break;
    case 'ArrowRight':              InputState.turnRight = false; break;
    case 'Space': case 'KeyE':
      InputState.use = false;
      InputState._useConsumed = false;
      break;
    case 'Escape':
      InputState.pause = false;
      InputState._pauseConsumed = false;
      break;
    case 'Enter':
      InputState.confirm = false;
      InputState._confirmConsumed = false;
      break;
  }
}

function onMouseDown(e) {
  if (e.button === 0 && !InputState._shootConsumed) {
    InputState.shoot = true;
  }
  if (_canvas && !InputState.pointerLocked) {
    _canvas.requestPointerLock();
  }
}

function onMouseUp(e) {
  if (e.button === 0) {
    InputState.shoot = false;
    InputState._shootConsumed = false;
  }
}

function onMouseMove(e) {
  if (InputState.pointerLocked) {
    InputState.mouseDX += e.movementX;
  }
}

function onPointerLockChange() {
  InputState.pointerLocked = document.pointerLockElement === _canvas;
}

export function initInput(canvas) {
  _canvas = canvas;
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  canvas.addEventListener('click', () => {
    if (!InputState.pointerLocked) canvas.requestPointerLock();
  });
}

export function removeInput() {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
  document.removeEventListener('mousedown', onMouseDown);
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('pointerlockchange', onPointerLockChange);
}

export function consumeUse() {
  InputState._useConsumed = true;
  InputState.use = false;
}

export function consumeShoot() {
  InputState._shootConsumed = true;
  InputState.shoot = false;
}

export function consumePause() {
  InputState._pauseConsumed = true;
  InputState.pause = false;
}

export function consumeConfirm() {
  InputState._confirmConsumed = true;
  InputState.confirm = false;
}

export function flushMouseDX() {
  const dx = InputState.mouseDX;
  InputState.mouseDX = 0;
  return dx;
}
