// WebAudio sounds for SABLE, all synthesized — no audio files, no network.
// Footsteps, gem chimes, the alert sting, the caught buzz, level and win
// arpeggios. The context is created lazily on the first user gesture so
// headless screenshot runs (no gesture) stay silent and error-free.

export function createAudio() {
  const audio = { ctx: null, muted: false, stepFlip: false };

  function ensure() {
    if (audio.ctx) return audio.ctx;
    try {
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctx) return null;
      audio.ctx = new Ctx();
    } catch {
      return null;
    }
    return audio.ctx;
  }

  function tone(freq, dur, type, gain, when = 0, slideTo = null) {
    if (audio.muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // Audio is decoration; never break the game for it.
    }
  }

  return {
    get muted() {
      return audio.muted;
    },
    unlock() {
      ensure();
    },
    toggleMute() {
      audio.muted = !audio.muted;
      return audio.muted;
    },
    footstep() {
      audio.stepFlip = !audio.stepFlip;
      tone(audio.stepFlip ? 140 : 120, 0.06, 'triangle', 0.05);
    },
    gem() {
      tone(880, 0.12, 'sine', 0.12);
      tone(1318, 0.18, 'sine', 0.1, 0.09);
    },
    alert() {
      tone(220, 0.28, 'sawtooth', 0.12, 0, 110);
      tone(330, 0.22, 'sawtooth', 0.08, 0.12, 165);
    },
    caught() {
      tone(160, 0.5, 'square', 0.1, 0, 60);
    },
    levelDone() {
      tone(523, 0.14, 'sine', 0.12);
      tone(659, 0.14, 'sine', 0.12, 0.12);
      tone(784, 0.24, 'sine', 0.12, 0.24);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.12, i * 0.13));
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.26, 'triangle', 0.1, i * 0.16));
    },
  };
}
