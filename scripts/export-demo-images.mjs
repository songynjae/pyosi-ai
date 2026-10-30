#!/usr/bin/env node
// Writes the synthetic images of the evaluation cases to docs/demo-assets/ so that they can be uploaded in
// the app (for example for the demo video). They are drawn by code (eval/cases.mjs), contain no real data and
// are the same images the evaluation harness sends.
//
//   node --experimental-strip-types scripts/export-demo-images.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CASES } from "../eval/cases.mjs";
import { encodePng } from "../eval/png.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "docs/demo-assets");
mkdirSync(outDir, { recursive: true });

const names = { D6: "squares-row", D7: "tall-list", D9: "pcb-top-view", D10: "mounting-plate" };
for (const c of CASES) {
  if (!c.image.make || !names[c.id]) continue;
  const file = resolve(outDir, `${c.id.toLowerCase()}-${names[c.id]}.png`);
  writeFileSync(file, new Uint8Array(encodePng(c.image.make())));
  console.log(`${file.replace(root + "/", "")}  notes for the demo: ${c.notes}`);
}
