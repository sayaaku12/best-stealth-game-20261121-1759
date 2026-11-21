// Keyboard + mouse input for SABLE. WASD / arrows move, Shift runs (loud),
// C crouches (slow, hard to spot), click sets a move target, Enter starts,
// R restarts, Esc pauses, M mutes. Exposes a plain state object the world
// reads each frame; nothing here touches the game logic.

export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    moveTarget: null,
    // Edge-triggered actions, consumed by main.js once per frame.
    pressed: new Set(),
  };

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
    KeyC: 'crouch',
    Enter: 'enter',
    KeyR: 'restart',
    Escape: 'pause',
    KeyM: 'mute',
    KeyH: 'hint',
  };

  function onKeyDown(event) {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (['up', 'down', 'left', 'right'].includes(action)) event.preventDefault();
    if (!event.repeat) input.pressed.add(action);
    keys.add(action);
  }
  function onKeyUp(event) {
    const action = KEYMAP[event.code];
    if (action) keys.delete(action);
  }
  function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.moveTarget = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  return input;
}

/** Read a movement vector from held keys (-1..1 each axis). */
export function keyVector(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('left')) x -= 1;
  if (input.keys.has('right')) x += 1;
  if (input.keys.has('up')) y -= 1;
  if (input.keys.has('down')) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}

export function consumePressed(input, action) {
  if (input.pressed.has(action)) {
    input.pressed.delete(action);
    return true;
  }
  return false;
}

export function clearPressed(input) {
  input.pressed.clear();
}
