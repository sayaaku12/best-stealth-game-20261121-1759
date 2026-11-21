// SABLE main loop: screens (title / play / level-done / win / game-over),
// the requestAnimationFrame loop, HUD, sounds, and the debug handle the
// interaction test uses. Keyboard + click-to-move feed the world each
// frame; the world owns all rules.

import { FIELD, LEVELS } from './config.js';
import { createWorld, resetLevel, stepWorld, EVENT_STEP, EVENT_GEM, EVENT_ALERT, EVENT_CAUGHT, EVENT_LEVEL_DONE } from './world.js';
import { createInput, keyVector, consumePressed, clearPressed } from './input.js';
import { createAudio } from './audio.js';
import {
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_LEVEL_DONE, SCREEN_WIN, SCREEN_OVER,
  drawFloor, drawShadows, drawWalls, drawCover, drawGems, drawExit,
  drawGuards, drawPlayer, drawHud, drawOverlay, formatTime,
} from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function resize() {
  canvas.width = 1280;
  canvas.height = FIELD.hud + FIELD.height;
}
resize();

const input = createInput(canvas);
const audio = createAudio();

const game = {
  screen: SCREEN_TITLE,
  world: createWorld(0),
  totalScore: 0,
  best: 0,
  paused: false,
  flash: 0,
  hint: null,
  hintTimer: 0,
};

function announce(text) {
  statusEl.textContent = text;
}

function startLevel(index) {
  game.world = createWorld(index);
  game.world.score = game.totalScore;
  game.screen = SCREEN_PLAY;
  game.paused = false;
  game.hint = null;
  input.moveTarget = null;
  announce(`${LEVELS[index].name}. Collect ${LEVELS[index].gems.length} moon-gems, then reach the exit unseen.`);
}

function startGame() {
  game.totalScore = 0;
  startLevel(0);
  audio.unlock();
}

function restartLevel() {
  const kept = game.world.score;
  const index = game.world.levelIndex;
  game.world = createWorld(index);
  game.world.score = kept;
  game.screen = SCREEN_PLAY;
  game.paused = false;
  input.moveTarget = null;
  announce('Level restarted.');
}

function levelDone() {
  game.totalScore = game.world.score;
  audio.levelDone();
  const last = game.world.levelIndex === LEVELS.length - 1;
  if (last) {
    game.screen = SCREEN_WIN;
    game.best = Math.max(game.best, game.totalScore);
    audio.win();
    announce(`You cleared every gallery. Final score ${game.totalScore}.`);
  } else {
    game.screen = SCREEN_LEVEL_DONE;
    announce(`${game.world.level.name} cleared. Score ${game.totalScore}.`);
  }
}

function caught() {
  audio.caught();
  game.world.lives -= 1;
  game.world.caughtFlash = 0.5;
  if (game.world.lives <= 0) {
    game.screen = SCREEN_OVER;
    game.best = Math.max(game.best, game.totalScore);
    audio.gameOver();
    announce('Caught for the last time. Game over.');
    return;
  }
  resetLevel(game.world);
  input.moveTarget = null;
  announce(`Caught! ${game.world.lives} ${game.world.lives === 1 ? 'life' : 'lives'} left.`);
}

function handleEvents(events) {
  if (events & EVENT_STEP) audio.footstep();
  if (events & EVENT_GEM) {
    audio.gem();
    announce(`Moon-gem taken. ${game.world.gemsTaken} of ${game.world.level.gems.length}.`);
  }
  if (events & EVENT_ALERT) {
    audio.alert();
    announce('A guard spotted you — break line of sight!');
  }
  if (events & EVENT_CAUGHT) caught();
  else if (events & EVENT_LEVEL_DONE) levelDone();
}

function update(dt) {
  if (game.screen !== SCREEN_PLAY || game.paused) return;
  const vec = keyVector(input);
  let mx = vec.x;
  let my = vec.y;
  // Click-to-move: steer toward the target until keys take over.
  if ((mx === 0 && my === 0) && input.moveTarget) {
    const p = game.world.player;
    const dx = input.moveTarget.x - p.x;
    const dy = input.moveTarget.y - (FIELD.hud + p.y);
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      input.moveTarget = null;
    } else {
      mx = dx / dist;
      my = dy / dist;
    }
  } else if (mx !== 0 || my !== 0) {
    input.moveTarget = null;
  }
  const events = stepWorld(game.world, {
    mx,
    my,
    running: input.keys.has('run'),
    crouched: input.keys.has('crouch'),
  }, dt);
  handleEvents(events);
  if (game.hintTimer > 0) {
    game.hintTimer -= dt;
    if (game.hintTimer <= 0) game.hint = null;
  }
}

function showHint() {
  const w = game.world;
  const remaining = w.gems.filter((g) => !g.taken);
  if (remaining.length === 0) {
    game.hint = 'All gems taken — the exit is open. Go!';
  } else {
    const g = remaining[0];
    const dir = g.x > w.player.x ? 'east' : 'west';
    const dir2 = g.y > w.player.y ? 'south' : 'north';
    game.hint = `Nearest moon-gem is to the ${dir2}-${dir}.`;
  }
  game.hintTimer = 4;
}

function handleKeys() {
  if (consumePressed(input, 'mute')) {
    const muted = audio.toggleMute();
    announce(muted ? 'Sound muted.' : 'Sound on.');
  }
  if (game.screen === SCREEN_TITLE) {
    if (consumePressed(input, 'enter')) startGame();
    return;
  }
  if (game.screen === SCREEN_LEVEL_DONE) {
    if (consumePressed(input, 'enter')) startLevel(game.world.levelIndex + 1);
    return;
  }
  if (game.screen === SCREEN_WIN || game.screen === SCREEN_OVER) {
    if (consumePressed(input, 'enter') || consumePressed(input, 'restart')) startGame();
    return;
  }
  if (consumePressed(input, 'pause')) {
    game.paused = !game.paused;
    announce(game.paused ? 'Paused.' : 'Resumed.');
  }
  if (consumePressed(input, 'restart')) restartLevel();
  if (consumePressed(input, 'hint')) showHint();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const w = game.world;
  ctx.save();
  ctx.translate(0, FIELD.hud);
  const t = w.time;
  drawFloor(ctx, t);
  drawShadows(ctx, w.level.shadows);
  drawExit(ctx, w.level.exit, w.exitOpen, t);
  drawGems(ctx, w.gems, t);
  drawCover(ctx, w.level.cover);
  drawWalls(ctx, w.level.walls);
  drawGuards(ctx, w.guards, t);
  drawPlayer(ctx, w.player, t);
  ctx.restore();

  drawHud(ctx, {
    level: w.level,
    gemsTaken: w.gemsTaken,
    lives: w.lives,
    time: w.time,
    score: w.score,
    muted: audio.muted,
    alert: w.alert,
  });

  if (game.hint) {
    ctx.fillStyle = 'rgba(10, 12, 22, 0.85)';
    const hw = 420;
    ctx.fillRect((FIELD.width - hw) / 2, FIELD.hud + 40, hw, 34);
    ctx.fillStyle = '#8fe8ff';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.hint, FIELD.width / 2, FIELD.hud + 62);
  }

  if (w.caughtFlash > 0) {
    ctx.fillStyle = `rgba(255, 40, 30, ${Math.min(0.4, w.caughtFlash)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (game.paused && game.screen === SCREEN_PLAY) {
    drawOverlay(ctx, 'PAUSED', ['Take a breath. The guards keep their rounds.'], 'Esc to resume · R to restart');
  } else if (game.screen === SCREEN_TITLE) {
    drawOverlay(ctx, 'SABLE', [
      'The Silent Gallery — a top-down stealth game.',
      'Sneak past the guards and their vision cones.',
      'Hide behind crates, statues and hedges. Crouch in shadow.',
      'Lift every moon-gem, then slip out the exit unseen.',
      '',
      'Move: WASD / arrows or click  ·  Run (loud): Shift  ·  Crouch: C',
      'Hint: H  ·  Restart: R  ·  Pause: Esc  ·  Sound: M',
    ], 'Press Enter to begin');
  } else if (game.screen === SCREEN_LEVEL_DONE) {
    drawOverlay(ctx, 'GALLERY CLEARED', [
      `${w.level.name} — score ${game.totalScore}.`,
      'The next gallery waits, with more guards.',
    ], 'Press Enter for the next level');
  } else if (game.screen === SCREEN_WIN) {
    drawOverlay(ctx, 'THE SILENT GALLERY', [
      'Every moon-gem lifted. Every guard outwitted.',
      `Final score: ${game.totalScore}. Best: ${game.best}.`,
    ], 'Press Enter to play again');
  } else if (game.screen === SCREEN_OVER) {
    drawOverlay(ctx, 'CAUGHT', [
      'The gallery keeps its gems tonight.',
      `Score: ${game.totalScore}. Best: ${game.best}.`,
    ], 'Press Enter to try again');
  }
}

// ?shot=start|play|alert|win stages a deterministic frame for screenshots:
// the real world stepped forward by a scripted autopilot, same seed, same
// frame every run. Any other value (or none) plays the title screen.
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  const staged = stageShot(shotName, game.world);
  game.screen = staged.screen;
  game.totalScore = staged.score;
  game.world.score = staged.score;
  game.best = staged.best ?? game.best;
  render();
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    handleKeys();
    update(dt);
    render();
    clearPressed(input);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Debug handle for the interaction test (read-only state + helpers).
window.__sable = {
  game,
  input,
  startGame,
  restartLevel,
  step(dt, mx, my, running, crouched) {
    const events = stepWorld(game.world, { mx, my, running: !!running, crouched: !!crouched }, dt);
    handleEvents(events);
    return events;
  },
};
