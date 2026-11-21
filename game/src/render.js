// Canvas drawing for SABLE — all art is drawn in code: moonlit floor tiles,
// walls, crates, statues, hedges, shadow pools, moon-gems, the exit door,
// guards with their vision cones, and the player. No images, no fonts
// beyond the system sans-serif stack (no emoji anywhere: headless Chromium
// has no colour-emoji font and would draw tofu boxes).

import { FIELD } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_LEVEL_DONE = 'level-done';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

const FLOOR_A = '#232a3d';
const FLOOR_B = '#202635';
const WALL_FILL = '#3a4157';
const WALL_TOP = '#565e78';
const CRATE_FILL = '#6b4f2a';
const CRATE_EDGE = '#8a6a3c';
const STATUE_FILL = '#7d8296';
const HEDGE_FILL = '#2c5233';
const HEDGE_EDGE = '#3f7a48';
const SHADOW_FILL = 'rgba(8, 10, 24, 0.55)';
const GEM_FILL = '#8fe8ff';
const EXIT_FILL = '#2f7d4f';
const PLAYER_FILL = '#1b1b26';
const PLAYER_CLOAK = '#5b3a8c';
const GUARD_FILL = '#8c2f2f';
const GUARD_TRIM = '#d8b25a';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawFloor(ctx, time) {
  const tile = 64;
  for (let y = 0; y < FIELD.height; y += tile) {
    for (let x = 0; x < FIELD.width; x += tile) {
      ctx.fillStyle = ((x / tile + y / tile) % 2 === 0) ? FLOOR_A : FLOOR_B;
      ctx.fillRect(x, y, tile, tile);
    }
  }
  // Moonlight wash drifting slowly across the floor.
  const mx = 640 + Math.sin(time * 0.07) * 220;
  const grad = ctx.createRadialGradient(mx, 180, 60, mx, 180, 520);
  grad.addColorStop(0, 'rgba(190, 205, 255, 0.10)');
  grad.addColorStop(1, 'rgba(190, 205, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

export function drawShadows(ctx, shadows) {
  ctx.fillStyle = SHADOW_FILL;
  for (const s of shadows) roundRect(ctx, s.x, s.y, s.w, s.h, 18), ctx.fill();
  ctx.fillStyle = 'rgba(190, 205, 255, 0.10)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  for (const s of shadows) ctx.fillText('SHADOW — hard to spot here', s.x + 12, s.y + 20);
}

export function drawWalls(ctx, walls) {
  for (const w of walls) {
    ctx.fillStyle = WALL_FILL;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = WALL_TOP;
    ctx.fillRect(w.x, w.y, w.w, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
  }
}

export function drawCover(ctx, cover) {
  for (const c of cover) {
    if (c.kind === 'crate') {
      ctx.fillStyle = CRATE_FILL;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = CRATE_EDGE;
      ctx.lineWidth = 3;
      ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + c.w, c.y + c.h);
      ctx.moveTo(c.x + c.w, c.y);
      ctx.lineTo(c.x, c.y + c.h);
      ctx.stroke();
    } else if (c.kind === 'statue') {
      ctx.fillStyle = '#4a4e61';
      ctx.fillRect(c.x + 6, c.y + c.h - 16, c.w - 12, 16);
      ctx.fillStyle = STATUE_FILL;
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2 - 4, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9aa0b5';
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2 - 14, 11, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = HEDGE_FILL;
      roundRect(ctx, c.x, c.y, c.w, c.h, 16);
      ctx.fill();
      ctx.strokeStyle = HEDGE_EDGE;
      ctx.lineWidth = 3;
      roundRect(ctx, c.x + 3, c.y + 3, c.w - 6, c.h - 6, 13);
      ctx.stroke();
      ctx.fillStyle = '#4c9460';
      for (let i = 0; i < 5; i += 1) {
        const bx = c.x + 12 + ((i * 37) % (c.w - 24));
        const by = c.y + 14 + ((i * 53) % (c.h - 28));
        ctx.beginPath();
        ctx.arc(bx, by, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export function drawGems(ctx, gems, time) {
  for (const g of gems) {
    if (g.taken) continue;
    const pulse = 0.75 + Math.sin(time * 3 + g.x * 0.01) * 0.25;
    const glow = ctx.createRadialGradient(g.x, g.y, 2, g.x, g.y, 34);
    glow.addColorStop(0, `rgba(143, 232, 255, ${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(143, 232, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = GEM_FILL;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }
}

export function drawExit(ctx, exit, open, time) {
  ctx.fillStyle = open ? EXIT_FILL : '#4a4436';
  roundRect(ctx, exit.x, exit.y, exit.w, exit.h, 8);
  ctx.fill();
  ctx.strokeStyle = open ? '#8fe8a0' : '#8a7f5a';
  ctx.lineWidth = 3;
  roundRect(ctx, exit.x + 3, exit.y + 3, exit.w - 6, exit.h - 6, 6);
  ctx.stroke();
  ctx.fillStyle = open ? '#eaffef' : '#c9bd8f';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', exit.x + exit.w / 2, exit.y + exit.h / 2 + 5);
  if (open) {
    const a = 0.5 + Math.sin(time * 4) * 0.3;
    ctx.fillStyle = `rgba(143, 232, 160, ${a})`;
    ctx.beginPath();
    ctx.arc(exit.x + exit.w / 2, exit.y + exit.h / 2, 30, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCone(ctx, guard, color) {
  const range = guard.viewRange;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, range, guard.facing - guard.halfAngle, guard.facing + guard.halfAngle);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawGuards(ctx, guards, time) {
  for (const g of guards) {
    const alert = g.state === 'chase';
    const wary = g.state === 'investigate' || g.suspicion >= 0.35;
    const cone = alert
      ? 'rgba(255, 70, 60, 0.34)'
      : wary
        ? 'rgba(255, 176, 32, 0.30)'
        : 'rgba(255, 214, 90, 0.20)';
    drawCone(ctx, g, cone);
    // Patrol route, faint dotted line.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.setLineDash([4, 8]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.path[0].x, g.path[0].y);
    for (let i = 1; i < g.path.length; i += 1) ctx.lineTo(g.path[i].x, g.path[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    // Body: dark red coat, brass trim, peaked cap.
    ctx.fillStyle = GUARD_FILL;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = GUARD_TRIM;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.stroke();
    const fx = Math.cos(g.facing);
    const fy = Math.sin(g.facing);
    ctx.fillStyle = GUARD_TRIM;
    ctx.beginPath();
    ctx.arc(g.x + fx * 7, g.y + fy * 7, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Suspicion meter above the guard.
    if (g.suspicion > 0.02) {
      const w = 34;
      const x = g.x - w / 2;
      const y = g.y - g.radius - 14;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(x - 1, y - 1, w + 2, 7);
      ctx.fillStyle = alert ? '#ff463c' : g.suspicion >= 0.62 ? '#ffb020' : '#ffd65a';
      ctx.fillRect(x, y, w * Math.min(1, g.suspicion), 5);
    }
    if (alert) {
      ctx.fillStyle = '#ff463c';
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - g.radius - 18);
    } else if (g.suspicion >= 0.35) {
      ctx.fillStyle = '#ffb020';
      ctx.font = '900 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - g.radius - 18);
    }
  }
}

export function drawPlayer(ctx, player, time) {
  // Noise ring while running.
  if (player.running && player.moving) {
    const a = 0.25 + Math.sin(time * 6) * 0.1;
    ctx.strokeStyle = `rgba(255, 255, 255, ${a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 34, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Crouch: smaller, lower silhouette.
  const r = player.crouched ? 9 : player.radius;
  ctx.fillStyle = PLAYER_CLOAK;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - r - 6);
  ctx.lineTo(player.x - r - 3, player.y + r);
  ctx.lineTo(player.x + r + 3, player.y + r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PLAYER_FILL;
  ctx.beginPath();
  ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8fe8ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
  ctx.stroke();
  const fx = Math.cos(player.facing);
  const fy = Math.sin(player.facing);
  ctx.fillStyle = '#8fe8ff';
  ctx.beginPath();
  ctx.arc(player.x + fx * (r - 2), player.y + fy * (r - 2), 3, 0, Math.PI * 2);
  ctx.fill();
}

export function drawHud(ctx, state) {
  ctx.fillStyle = '#12141d';
  ctx.fillRect(0, 0, FIELD.width, FIELD.hud);
  ctx.fillStyle = '#2a2f42';
  ctx.fillRect(0, FIELD.hud - 2, FIELD.width, 2);
  ctx.fillStyle = '#e8eaf2';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SABLE', 16, 36);
  ctx.fillStyle = '#9aa3bd';
  ctx.font = '400 15px system-ui, sans-serif';
  ctx.fillText(state.level.name, 120, 35);
  // Gems.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8fe8ff';
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.fillText(`GEMS ${state.gemsTaken} / ${state.level.gems.length}`, 460, 36);
  // Lives as drawn hearts (circles + triangle), never emoji.
  ctx.fillStyle = '#ff6b81';
  for (let i = 0; i < state.lives; i += 1) {
    const cx = 640 + i * 30;
    const cy = 28;
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 2, 6, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.lineTo(cx, cy + 11);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#9aa3bd';
  ctx.font = '400 15px system-ui, sans-serif';
  ctx.fillText(`TIME ${formatTime(state.time)}`, 800, 35);
  ctx.fillText(`SCORE ${state.score}`, 960, 35);
  ctx.fillStyle = state.muted ? '#ff9d5c' : '#9aa3bd';
  ctx.fillText(state.muted ? 'MUTED (M)' : 'SOUND ON (M)', 1120, 35);
  if (state.alert) {
    ctx.fillStyle = '#ff463c';
    ctx.font = '900 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPOTTED — BREAK LINE OF SIGHT!', FIELD.width / 2, FIELD.hud + 26);
  }
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function drawOverlay(ctx, title, lines, hint) {
  ctx.fillStyle = 'rgba(10, 12, 22, 0.78)';
  ctx.fillRect(0, FIELD.hud, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8eaf2';
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.fillText(title, FIELD.width / 2, 250);
  ctx.font = '400 19px system-ui, sans-serif';
  ctx.fillStyle = '#c3c9dd';
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 300 + i * 30));
  if (hint) {
    ctx.fillStyle = '#8fe8ff';
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(hint, FIELD.width / 2, 300 + lines.length * 30 + 36);
  }
}
