export const InputState = {
  forward:     false,
  backward:    false,
  strafeLeft:  false,
  strafeRight: false,
  turnLeft:    false,
  turnRight:   false,
  scanHeld:    false,     // [E] held
  logToggle:   false,     // [L] pressed
  confirm:     false,     // [Enter]
  escape:      false,     // [Esc]
  mouseDX:     0,
  pointerLocked: false,

  _logConsumed:     false,
  _confirmConsumed: false,
  _escapeConsumed:  false,
};

let _canvas = null;

function onKeyDown(e) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    InputState.forward      = true; break;
    case 'KeyS': case 'ArrowDown':  InputState.backward     = true; break;
    case 'KeyA':                    InputState.strafeLeft   = true; break;
    case 'KeyD':                    InputState.strafeRight  = true; break;
    case 'ArrowLeft':               InputState.turnLeft     = true; break;
    case 'ArrowRight':              InputState.turnRight    = true; break;
    case 'KeyE':                    InputState.scanHeld     = true; break;
    case 'KeyL':
      if (!InputState._logConsumed) InputState.logToggle = true;
      break;
    case 'Escape':
      if (!InputState._escapeConsumed) InputState.escape = true;
      break;
    case 'Enter':
      if (!InputState._confirmConsumed) InputState.confirm = true;
      break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp':    InputState.forward     = false; break;
    case 'KeyS': case 'ArrowDown':  InputState.backward    = false; break;
    case 'KeyA':                    InputState.strafeLeft  = false; break;
    case 'KeyD':                    InputState.strafeRight = false; break;
    case 'ArrowLeft':               InputState.turnLeft    = false; break;
    case 'ArrowRight':              InputState.turnRight   = false; break;
    case 'KeyE':                    InputState.scanHeld    = false; break;
    case 'KeyL':
      InputState.logToggle = false;
      InputState._logConsumed = false;
      break;
    case 'Escape':
      InputState.escape = false;
      InputState._escapeConsumed = false;
      break;
    case 'Enter':
      InputState.confirm = false;
      InputState._confirmConsumed = false;
      break;
  }
}

function onMouseDown(e) {
  if (_canvas && !InputState.pointerLocked) _canvas.requestPointerLock();
}

function onMouseMove(e) {
  if (InputState.pointerLocked) InputState.mouseDX += e.movementX;
}

function onPointerLockChange() {
  InputState.pointerLocked = document.pointerLockElement === _canvas;
}

export function initInput(canvas) {
  _canvas = canvas;
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousedown', onMouseDown);
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
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('pointerlockchange', onPointerLockChange);
}

export function flushMouseDX() {
  const dx = InputState.mouseDX;
  InputState.mouseDX = 0;
  return dx;
}

export function consumeLogToggle()  { InputState._logConsumed = true;     InputState.logToggle = false; }
export function consumeConfirm()    { InputState._confirmConsumed = true; InputState.confirm   = false; }
export function consumeEscape()     { InputState._escapeConsumed = true;  InputState.escape    = false; }
