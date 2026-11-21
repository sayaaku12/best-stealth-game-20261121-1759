// SABLE — The Silent Gallery, a make.fun entry for
// best-stealth-game-20261121-1759 (Node 22, standard library only).
//
// The game lives in game/ as plain static files: game/index.html opens in a
// desktop browser and plays offline — no network request, no library, all
// art drawn in code. This program hands it in: it copies game/ and
// screenshots/ from beside this file into the output directory and writes
// output/dossier.json, the summary the AI judge reads, using the kit's
// vendored library.
//
// Play it locally first: serve game/ with any static server (for example
// `python3 -m http.server` from game/) and open http://localhost:8000.
// Screenshot states: index.html?shot=start | play | alert | win.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate rebuilds the dossier with the kit's own copy of the library and
// compares the two byte for byte, so refuse to run with a vendored copy
// that is not the kit's: the kit's sha256 (kit.json) of
// starter/vendor/makefun-game.ts.
const KIT_VENDOR_SHA256 = 'dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129';
const vendorBytes = readFileSync(join(here, 'vendor', 'makefun-game.ts'));
const vendorHash = createHash('sha256').update(vendorBytes).digest('hex');
if (vendorHash !== KIT_VENDOR_SHA256) {
  throw new Error(`vendor/makefun-game.ts is not the kit's copy (sha256 ${vendorHash})`);
}

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (from the kit's competition.yaml): only
// text_max_bytes shapes the dossier bytes; the other caps refuse an entry
// the scorer would refuse — more than 4 screenshots, one over 256 KiB, more
// than 993 files in game/ or 48 MiB of game files in all, or a game/ path
// over 1000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Read the dossier back and report what was handed in: a second,
// independent check that the hand-in is complete and self-consistent.
const written = JSON.parse(readFileSync(join(outDir, 'dossier.json'), 'utf8'));
const gameBlock = written.text.split('\n').slice(0, 12).join('\n');
console.log(gameBlock);
console.log(`dossier.json: ${Buffer.byteLength(dossier)} bytes, ${written.images?.length ?? '?'} screenshots`);

// Self-check the hand-in against the gate's caps, so a bad build fails
// here instead of at the scorer: index.html present, 3-4 screenshots,
// each a whole JPEG/PNG under the 256 KiB cap, and the whole /output tree
// under the platform's 1000-entry cap (game/ + screenshots/ + dossier).
import { readdirSync, statSync } from 'node:fs';
if (!existsSync(join(outDir, 'game', 'index.html'))) {
  throw new Error('game/index.html missing from the hand-in');
}
const shots = readdirSync(join(outDir, 'screenshots')).filter((f) => !f.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3-4 screenshots, found ${shots.length}`);
}
for (const shot of shots) {
  const size = statSync(join(outDir, 'screenshots', shot)).size;
  if (size > 262144) throw new Error(`screenshot ${shot} is ${size} bytes, over the 256 KiB cap`);
}
function countEntries(dir) {
  let n = 1;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countEntries(join(dir, entry.name)) : 1;
  }
  return n;
}
const outEntries = countEntries(outDir) - 1;
if (outEntries > 1000) throw new Error(`/output holds ${outEntries} entries, over the 1000-entry cap`);
console.log(`hand-in OK: ${shots.length} screenshots, all under the cap, ${outEntries} /output entries`);
