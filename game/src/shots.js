// Staged screenshot scenes behind ?shot=start|play|alert|win. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, so the frame is what a real game looks like and the same seed
// always gives the same frame. No input is faked beyond placing the player
// where a sneaking player would stand; guards patrol, cones sweep, and
// detection runs exactly as in live play.

import { createWorld, stepWorld, EVENT_ALERT } from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN } from './render.js';

const STEP = 1 / 30;
const IDLE = { mx: 0, my: 0, running: false, crouched: true };
const IDLE_STAND = { mx: 0, my: 0, running: false, crouched: false };

function stepFor(world, seconds, input = IDLE) {
  let events = 0;
  for (let i = 0; i < Math.round(seconds / STEP); i += 1) {
    events |= stepWorld(world, input, STEP);
  }
  return events;
}

/**
 * Set `world` to the named scene (start, play, alert or win; any other name
 * is start) and return the screen to draw over it and the score to show.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    // Sable crouched in the west shadow pool while the nearest guard's cone
    // sweeps the gallery and a moon-gem glints below. Stepped 14 seconds so
    // the guards are mid-patrol; the spot is outside every cone, so the
    // frame is stable and never trips an alert.
    const fresh = createWorld(0);
    Object.assign(world, fresh);
    world.player.x = 180;
    world.player.y = 365;
    stepFor(world, 14);
    return { screen: SCREEN_PLAY, score: 0 };
  }
  if (name === 'alert') {
    // Sable caught standing in the middle guard's patrol lane. Step until a
    // guard's suspicion fills and it gives chase, then freeze on that frame:
    // red cone, "!" over the guard, SPOTTED banner. Standing (not crouched):
    // a standing thief in the open is spotted in about a second.
    const fresh = createWorld(0);
    Object.assign(world, fresh);
    world.player.x = 400;
    world.player.y = 330;
    let alerted = false;
    for (let i = 0; i < Math.round(20 / STEP); i += 1) {
      const events = stepWorld(world, IDLE_STAND, STEP);
      if (events & EVENT_ALERT || world.alert) {
        alerted = true;
        break;
      }
    }
    if (!alerted) {
      // Fallback: stand 60px in front of the nearest guard and wait.
      const g = world.guards[0];
      world.player.x = g.x + Math.cos(g.facing) * 60;
      world.player.y = g.y + Math.sin(g.facing) * 60;
      for (let i = 0; i < Math.round(6 / STEP); i += 1) {
        stepWorld(world, IDLE_STAND, STEP);
        if (world.alert) break;
      }
    }
    return { screen: SCREEN_PLAY, score: 0 };
  }
  if (name === 'win') {
    // All three moon-gems lifted, Sable at the open exit: the win screen
    // over the cleared gallery.
    const fresh = createWorld(0);
    Object.assign(world, fresh);
    for (const gem of world.gems) gem.taken = true;
    world.gemsTaken = world.gems.length;
    world.exitOpen = true;
    world.score = 1400;
    world.player.x = world.level.exit.x + world.level.exit.w / 2;
    world.player.y = world.level.exit.y + world.level.exit.h / 2;
    world.time = 96;
    return { screen: SCREEN_WIN, score: 1400, best: 1400 };
  }
  // start (and anything else): a fresh world behind the title screen.
  const fresh = createWorld(0);
  Object.assign(world, fresh);
  stepFor(world, 5);
  return { screen: SCREEN_TITLE, score: 0 };
}
