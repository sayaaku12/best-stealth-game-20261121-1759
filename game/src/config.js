// SABLE — The Silent Gallery: level data and tuning constants.
// A top-down stealth game. The player (Sable, a night thief) crosses a
// moonlit gallery, lifts every moon-gem, and slips out the exit unseen.
// Guards patrol fixed routes with vision cones; walls and cover block both
// movement and line of sight; shadow patches slow detection.

export const FIELD = { width: 1280, height: 664, hud: 56 };

export const PLAYER = {
  radius: 12,
  walkSpeed: 150,
  runSpeed: 235,
  crouchSpeed: 85,
  // How fast suspicion rises when the player is seen, at point-blank range.
  // Scales down with distance and stance (crouch / shadow).
  detectBase: 1.15,
};

export const GUARD = {
  radius: 13,
  patrolSpeed: 62,
  investigateSpeed: 95,
  chaseSpeed: 165,
  viewRange: 190,
  viewHalfAngle: 0.62, // ~35 degrees each side
  // Suspicion above this makes a guard stop and stare at the player.
  stareAt: 0.35,
  // Suspicion above this makes a guard walk toward the player.
  approachAt: 0.62,
  catchDistance: 30,
  // Seconds a chasing guard keeps hunting after losing sight.
  huntMemory: 2.5,
};

export const NOISE = { runRadius: 130, walkRadius: 0, crouchRadius: 0 };

export const LEVELS = [
  {
    name: 'The Quiet Gallery',
    sub: 'Lift 3 moon-gems, then slip out the east door.',
    player: { x: 90, y: 590 },
    exit: { x: 1188, y: 24, w: 68, h: 52 },
    walls: [
      { x: 300, y: 190, w: 330, h: 26 },
      { x: 660, y: 420, w: 330, h: 26 },
      { x: 930, y: 90, w: 26, h: 210 },
      { x: 180, y: 330, w: 26, h: 180 },
    ],
    cover: [
      { x: 130, y: 120, w: 72, h: 72, kind: 'crate' },
      { x: 520, y: 240, w: 72, h: 72, kind: 'crate' },
      { x: 760, y: 110, w: 72, h: 72, kind: 'crate' },
      { x: 150, y: 480, w: 72, h: 72, kind: 'crate' },
      { x: 1060, y: 300, w: 72, h: 72, kind: 'crate' },
      { x: 1120, y: 130, w: 64, h: 64, kind: 'statue' },
      { x: 420, y: 520, w: 64, h: 64, kind: 'statue' },
    ],
    shadows: [
      { x: 70, y: 300, w: 220, h: 130 },
      { x: 900, y: 470, w: 280, h: 130 },
    ],
    gems: [
      { x: 640, y: 120 },
      { x: 150, y: 570 },
      { x: 1150, y: 560 },
    ],
    guards: [
      { path: [{ x: 250, y: 100 }, { x: 250, y: 520 }], speed: 62, wait: 1.2 },
      { path: [{ x: 520, y: 330 }, { x: 900, y: 330 }], speed: 62, wait: 1.0 },
      { path: [{ x: 1040, y: 180 }, { x: 1040, y: 540 }, { x: 800, y: 540 }], speed: 58, wait: 1.4 },
    ],
  },
  {
    name: 'The Vault',
    sub: 'Four guards, tighter halls. Take 3 moon-gems and vanish.',
    player: { x: 90, y: 90 },
    exit: { x: 1188, y: 588, w: 68, h: 52 },
    walls: [
      { x: 240, y: 120, w: 26, h: 300 },
      { x: 560, y: 240, w: 380, h: 26 },
      { x: 560, y: 420, w: 26, h: 200 },
      { x: 940, y: 120, w: 26, h: 300 },
      { x: 240, y: 520, w: 380, h: 26 },
    ],
    cover: [
      { x: 300, y: 90, w: 72, h: 72, kind: 'crate' },
      { x: 700, y: 90, w: 72, h: 72, kind: 'crate' },
      { x: 700, y: 470, w: 72, h: 72, kind: 'crate' },
      { x: 1100, y: 460, w: 72, h: 72, kind: 'crate' },
      { x: 420, y: 330, w: 64, h: 64, kind: 'statue' },
      { x: 860, y: 330, w: 64, h: 64, kind: 'statue' },
      { x: 1100, y: 200, w: 64, h: 64, kind: 'statue' },
    ],
    shadows: [
      { x: 300, y: 440, w: 220, h: 130 },
      { x: 820, y: 90, w: 240, h: 120 },
      { x: 90, y: 300, w: 130, h: 160 },
    ],
    gems: [
      { x: 850, y: 120 },
      { x: 480, y: 620 },
      { x: 1150, y: 330 },
    ],
    guards: [
      { path: [{ x: 400, y: 90 }, { x: 400, y: 470 }], speed: 66, wait: 1.0 },
      { path: [{ x: 300, y: 180 }, { x: 900, y: 180 }], speed: 66, wait: 1.0 },
      { path: [{ x: 1040, y: 90 }, { x: 1040, y: 470 }], speed: 62, wait: 1.2 },
      { path: [{ x: 300, y: 580 }, { x: 1000, y: 580 }], speed: 70, wait: 0.8 },
    ],
  },
  {
    name: 'The Rooftop Garden',
    sub: 'Moonlight, hedges and four watchful guards. The last 3 gems.',
    player: { x: 90, y: 590 },
    exit: { x: 1188, y: 24, w: 68, h: 52 },
    walls: [
      { x: 320, y: 90, w: 26, h: 260 },
      { x: 640, y: 300, w: 340, h: 26 },
      { x: 960, y: 90, w: 26, h: 260 },
      { x: 320, y: 430, w: 340, h: 26 },
    ],
    cover: [
      { x: 130, y: 120, w: 76, h: 76, kind: 'hedge' },
      { x: 480, y: 110, w: 76, h: 76, kind: 'hedge' },
      { x: 760, y: 110, w: 76, h: 76, kind: 'hedge' },
      { x: 1080, y: 110, w: 76, h: 76, kind: 'hedge' },
      { x: 130, y: 470, w: 76, h: 76, kind: 'hedge' },
      { x: 480, y: 470, w: 76, h: 76, kind: 'hedge' },
      { x: 760, y: 470, w: 76, h: 76, kind: 'hedge' },
      { x: 1080, y: 470, w: 76, h: 76, kind: 'hedge' },
      { x: 560, y: 240, w: 64, h: 64, kind: 'statue' },
      { x: 1080, y: 300, w: 64, h: 64, kind: 'statue' },
    ],
    shadows: [
      { x: 70, y: 230, w: 200, h: 130 },
      { x: 1010, y: 230, w: 200, h: 130 },
      { x: 560, y: 560, w: 240, h: 90 },
    ],
    gems: [
      { x: 640, y: 90 },
      { x: 160, y: 340 },
      { x: 1120, y: 420 },
    ],
    guards: [
      { path: [{ x: 400, y: 90 }, { x: 400, y: 580 }], speed: 70, wait: 0.9 },
      { path: [{ x: 880, y: 90 }, { x: 880, y: 580 }], speed: 70, wait: 0.9 },
      { path: [{ x: 220, y: 340 }, { x: 1060, y: 340 }], speed: 74, wait: 0.8 },
      { path: [{ x: 300, y: 200 }, { x: 300, y: 500 }], speed: 66, wait: 1.1 },
    ],
  },
];
