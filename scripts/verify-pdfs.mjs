/*
 * One-command PDF forensic gate. Serves the production build, generates a PDF
 * for every template × font pairing, and strict-inspects each one — failing if
 * any export is not a clean vector document (raster, or text drawn in a
 * non-embedded fallback font like Courier/Helvetica). This is the CI backstop
 * for the browser-only PDF path that unit tests cannot reach.
 *
 * Prereq: `pnpm build` (this serves dist/ via `astro preview`).
 * Usage:  node scripts/verify-pdfs.mjs   (or `pnpm verify:pdf`)
 */
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const PORT = 4321;
const BASE = `http://localhost:${PORT}`;
const OUT = resolve(".pdf-out");

function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: "inherit", ...opts });
    p.on("exit", (code) => (code === 0 ? res() : rej(new Error(`${cmd} ${args.join(" ")} → exit ${code}`))));
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`preview server never came up at ${url}`);
}

// Spawn the astro binary directly (not via `pnpm preview`) so killing it on
// teardown doesn't surface a spurious pnpm ELIFECYCLE non-zero line.
const astroBin = resolve("node_modules/.bin/astro");
const preview = spawn(astroBin, ["preview", "--port", String(PORT)], { stdio: "inherit" });
let failures = 0;
try {
  await waitForServer(BASE);
  await run("node", ["scripts/gen-pdfs.mjs", "--base", BASE, "--out", OUT]);

  const pdfs = readdirSync(OUT).filter((f) => f.endsWith(".pdf"));
  console.log(`\n================ STRICT INSPECT (${pdfs.length} PDFs) ================`);
  for (const f of pdfs) {
    try {
      await run("node", ["scripts/inspect-pdf.mjs", resolve(OUT, f), "--strict"], { stdio: "ignore" });
      console.log(`✓ ${f}`);
    } catch {
      failures++;
      console.error(`✗ ${f} — FAILED strict forensic check`);
      await run("node", ["scripts/inspect-pdf.mjs", resolve(OUT, f), "--strict"]).catch(() => {});
    }
  }
} finally {
  preview.kill();
}

if (failures) {
  console.error(`\n✗ ${failures} PDF(s) failed the forensic gate.`);
  process.exit(1);
}
console.log("\n✓ All exported PDFs are clean vector documents.");
