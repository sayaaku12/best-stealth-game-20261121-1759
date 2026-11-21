// SABLE world simulation: player movement with circle-vs-rect collision,
// guard patrol / stare / investigate / chase AI, vision cones with line of
// sight blocked by walls and cover, suspicion that rises with proximity,
// stance and light, running noise that draws guards in, gems and the exit.
// Pure simulation — no DOM, no audio — so screenshots can step it forward
// deterministically and the interaction test can drive it directly.

import { FIELD, PLAYER, GUARD, NOISE, LEVELS } from './config.js';
import { clamp, angleDiff, hasLineOfSight, pointInRects, mulberry32 } from './random.js';

export const EVENT_STEP = 1;
export const EVENT_GEM = 2;
export const EVENT_ALERT = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_LEVEL_DONE = 16;

export const GUARD_PATROL = 'patrol';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_CHASE = 'chase';
export const GUARD_RETURN = 'return';

export function createWorld(levelIndex) {
  const level = LEVELS[levelIndex];
  const rng = mulberry32(0x5ab1e + levelIndex * 97);
  const world = {
    level,
    levelIndex,
    rng,
    time: 0,
    score: 0,
    lives: 3,
    gemsTaken: 0,
    exitOpen: false,
    alert: false,
    maxSuspicion: 0,
    caughtFlash: 0,
    stepAccum: 0,
    blockers: [...level.walls, ...level.cover],
    player: {
      x: level.player.x,
      y: level.player.y,
      facing: -Math.PI / 2,
      radius: PLAYER.radius,
      crouched: false,
      running: false,
      moving: false,
    },
    gems: level.gems.map((g) => ({ x: g.x, y: g.y, taken: false })),
    guards: level.guards.map((g) => ({
      x: g.path[0].x,
      y: g.path[0].y,
      facing: 0,
      radius: GUARD.radius,
      path: g.path,
      pathIndex: 1,
      wait: g.wait,
      waitTimer: 0,
      speed: g.speed,
      viewRange: GUARD.viewRange,
      halfAngle: GUARD.viewHalfAngle,
      state: GUARD_PATROL,
      suspicion: 0,
      lastSeen: null,
      huntTimer: 0,
      scanDir: 1,
    })),
  };
  for (const guard of world.guards) {
    const next = guard.path[guard.pathIndex];
    guard.facing = Math.atan2(next.y - guard.y, next.x - guard.x);
  }
  return world;
}

/** Reset the current level's positions, gems and guards (keeps score/lives). */
export function resetLevel(world) {
  const level = world.level;
  world.time = 0;
  world.gemsTaken = 0;
  world.exitOpen = false;
  world.alert = false;
  world.maxSuspicion = 0;
  world.caughtFlash = 0;
  world.player.x = level.player.x;
  world.player.y = level.player.y;
  world.player.facing = -Math.PI / 2;
  world.player.crouched = false;
  world.player.running = false;
  world.player.moving = false;
  world.gems = level.gems.map((g) => ({ x: g.x, y: g.y, taken: false }));
  world.guards = level.guards.map((g) => ({
    x: g.path[0].x,
    y: g.path[0].y,
    facing: 0,
    radius: GUARD.radius,
    path: g.path,
    pathIndex: 1,
    wait: g.wait,
    waitTimer: 0,
    speed: g.speed,
    viewRange: GUARD.viewRange,
    halfAngle: GUARD.viewHalfAngle,
    state: GUARD_PATROL,
    suspicion: 0,
    lastSeen: null,
    huntTimer: 0,
    scanDir: 1,
  }));
  for (const guard of world.guards) {
    const next = guard.path[guard.pathIndex];
    guard.facing = Math.atan2(next.y - guard.y, next.x - guard.x);
  }
}

function circleHitsBlockers(x, y, radius, blockers) {
  for (const b of blockers) {
    const cx = clamp(x, b.x, b.x + b.w);
    const cy = clamp(y, b.y, b.y + b.h);
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

/** Move a circle axis-by-axis so it slides along walls instead of sticking. */
function moveCircle(body, dx, dy, blockers) {
  const nx = clamp(body.x + dx, body.radius, FIELD.width - body.radius);
  if (!circleHitsBlockers(nx, body.y, body.radius, blockers)) body.x = nx;
  const ny = clamp(body.y + dy, body.radius, FIELD.height - body.radius);
  if (!circleHitsBlockers(body.x, ny, body.radius, blockers)) body.y = ny;
}

function moveToward(body, tx, ty, speed, dt, blockers) {
  const dx = tx - body.x;
  const dy = ty - body.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  moveCircle(body, (dx / dist) * step, (dy / dist) * step, blockers);
  body.facing = Math.atan2(dy, dx);
  return dist - step < 2;
}

function turnToward(guard, targetAngle, dt, rate = 5) {
  const diff = angleDiff(guard.facing, targetAngle);
  const maxTurn = rate * dt;
  guard.facing += clamp(diff, -maxTurn, maxTurn);
}

function guardSeesPlayer(guard, world) {
  const p = world.player;
  const dx = p.x - guard.x;
  const dy = p.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > guard.viewRange) return 0;
  const angle = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(guard.facing, angle)) > guard.halfAngle) return 0;
  if (!hasLineOfSight(guard.x, guard.y, p.x, p.y, world.blockers)) return 0;
  return dist;
}

export function stepWorld(world, input, dt) {
  let events = 0;
  world.time += dt;
  if (world.caughtFlash > 0) world.caughtFlash -= dt;
  const p = world.player;

  // --- Player movement ---
  const speed = input.crouched
    ? PLAYER.crouchSpeed
    : input.running
      ? PLAYER.runSpeed
      : PLAYER.walkSpeed;
  p.crouched = input.crouched;
  p.running = input.running && (input.mx !== 0 || input.my !== 0);
  p.moving = input.mx !== 0 || input.my !== 0;
  if (p.moving) {
    const ox = p.x;
    const oy = p.y;
    moveCircle(p, input.mx * speed * dt, input.my * speed * dt, world.blockers);
    p.facing = Math.atan2(input.my, input.mx);
    const moved = Math.hypot(p.x - ox, p.y - oy);
    world.stepAccum += moved;
    if (world.stepAccum > 30) {
      world.stepAccum = 0;
      events |= EVENT_STEP;
    }
  }

  const inShadow = pointInRects(p.x, p.y, world.level.shadows);
  const stanceFactor = p.crouched ? 0.45 : p.running ? 1.3 : 1;
  const shadowFactor = inShadow ? 0.5 : 1;

  // --- Running noise draws nearby guards toward the player ---
  if (p.running && p.moving) {
    for (const g of world.guards) {
      if (g.state === GUARD_CHASE) continue;
      const d = Math.hypot(p.x - g.x, p.y - g.y);
      if (d < NOISE.runRadius) {
        g.suspicion = Math.min(0.6, g.suspicion + 0.3 * dt);
        if (g.state === GUARD_PATROL) {
          g.state = GUARD_INVESTIGATE;
          g.lastSeen = { x: p.x, y: p.y };
        }
      }
    }
  }

  // --- Guards ---
  let anyChase = false;
  let maxSuspicion = 0;
  for (const g of world.guards) {
    const seenDist = guardSeesPlayer(g, world);
    const sawPlayer = seenDist > 0;
    const wasChasing = g.state === GUARD_CHASE;

    if (sawPlayer) {
      const near = 1 - (seenDist / g.viewRange) * 0.6;
      g.suspicion = Math.min(1, g.suspicion + PLAYER.detectBase * near * stanceFactor * shadowFactor * dt);
      g.lastSeen = { x: p.x, y: p.y };
      turnToward(g, Math.atan2(p.y - g.y, p.x - g.x), dt, 7);
      if (g.suspicion >= 1) {
        if (!wasChasing) events |= EVENT_ALERT;
        g.state = GUARD_CHASE;
        g.huntTimer = GUARD.huntMemory;
      } else if (g.suspicion >= GUARD.approachAt) {
        if (g.state !== GUARD_CHASE) g.state = GUARD_INVESTIGATE;
      }
      // A guard that spots the player stops patrolling to stare.
      if (g.suspicion >= GUARD.stareAt && g.state === GUARD_PATROL) {
        g.state = GUARD_INVESTIGATE;
      }
    } else {
      g.suspicion = Math.max(0, g.suspicion - 0.35 * dt);
      if (g.state === GUARD_CHASE) {
        g.huntTimer -= dt;
        if (g.huntTimer <= 0) {
          g.state = GUARD_RETURN;
          g.lastSeen = null;
        }
      } else if (g.state === GUARD_INVESTIGATE && g.suspicion < 0.05) {
        g.state = GUARD_RETURN;
        g.lastSeen = null;
      }
    }

    if (g.state === GUARD_PATROL) {
      if (g.waitTimer > 0) {
        g.waitTimer -= dt;
      } else {
        const target = g.path[g.pathIndex];
        if (moveToward(g, target.x, target.y, g.speed, dt, world.blockers)) {
          g.pathIndex = (g.pathIndex + 1) % g.path.length;
          g.waitTimer = g.wait;
        }
      }
    } else if (g.state === GUARD_INVESTIGATE) {
      if (g.lastSeen) {
        if (moveToward(g, g.lastSeen.x, g.lastSeen.y, GUARD.investigateSpeed, dt, world.blockers)) {
          // Arrived and found nothing: scan the area, then give up. While the
          // player is still visible, suspicion keeps rising instead — a guard
          // staring at a crouched thief at point-blank must not stall.
          g.facing += g.scanDir * 1.6 * dt;
          if (Math.abs(angleDiff(g.facing, Math.atan2(g.lastSeen.y - g.y, g.lastSeen.x - g.x))) > 1.2) {
            g.scanDir *= -1;
          }
          if (!sawPlayer) g.suspicion = Math.max(0, g.suspicion - 0.5 * dt);
        }
      }
    } else if (g.state === GUARD_CHASE) {
      anyChase = true;
      moveToward(g, p.x, p.y, GUARD.chaseSpeed, dt, world.blockers);
      const d = Math.hypot(p.x - g.x, p.y - g.y);
      if (d < GUARD.catchDistance) {
        events |= EVENT_CAUGHT;
      }
    } else if (g.state === GUARD_RETURN) {
      // Head back to the nearest patrol waypoint, then resume the route.
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < g.path.length; i += 1) {
        const d = Math.hypot(g.path[i].x - g.x, g.path[i].y - g.y);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      if (moveToward(g, g.path[best].x, g.path[best].y, g.speed, dt, world.blockers)) {
        g.pathIndex = (best + 1) % g.path.length;
        g.state = GUARD_PATROL;
      }
    }
    if (g.suspicion > maxSuspicion) maxSuspicion = g.suspicion;
  }
  world.alert = anyChase;
  world.maxSuspicion = maxSuspicion;

  // --- Gems ---
  for (const gem of world.gems) {
    if (gem.taken) continue;
    if (Math.hypot(p.x - gem.x, p.y - gem.y) < 26) {
      gem.taken = true;
      world.gemsTaken += 1;
      world.score += 100;
      events |= EVENT_GEM;
    }
  }
  if (world.gemsTaken === world.level.gems.length) world.exitOpen = true;

  // --- Exit ---
  if (world.exitOpen) {
    const e = world.level.exit;
    if (p.x > e.x - 6 && p.x < e.x + e.w + 6 && p.y > e.y - 6 && p.y < e.y + e.h + 6) {
      world.score += 500 + Math.max(0, 300 - Math.floor(world.time) * 2);
      events |= EVENT_LEVEL_DONE;
    }
  }
  return events;
}
