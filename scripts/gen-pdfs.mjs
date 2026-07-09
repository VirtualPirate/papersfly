/*
 * Headless PDF generator for the forensic CI gate. Drives a real browser
 * against the built + previewed app (the source of truth for PDF output), and
 * for EVERY template × EVERY font pairing clicks Download and captures the
 * exported PDF. Pair with `node scripts/inspect-pdf.mjs <file> --strict` to
 * assert each export is a clean vector document with no fallback fonts.
 *
 * PDF generation is browser-only, so this cannot run in jsdom/vitest — hence a
 * standalone script + a CI job rather than a unit test.
 *
 * Usage: node scripts/gen-pdfs.mjs [--base http://localhost:4321] [--out .pdf-out]
 * Chrome path: $PUPPETEER_EXECUTABLE_PATH or $CHROME_PATH, else auto-detected.
 */
import puppeteer from "puppeteer-core";
import { readdirSync, existsSync, mkdirSync, rmSync, renameSync } from "node:fs";
import { join, resolve } from "node:path";

const arg = (flag, def) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : def;
};
const BASE = arg("--base", process.env.BASE_URL || "http://localhost:4321").replace(/\/$/, "");
const OUT = resolve(arg("--out", ".pdf-out"));
const DIST_BUILD = resolve("dist/build");

function chromePath() {
  const env = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (env) return env;
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("No Chrome found — set PUPPETEER_EXECUTABLE_PATH");
  return found;
}

/** Routes to test: /build/<doc>/<template>/ discovered from the static build. */
function routes() {
  if (!existsSync(DIST_BUILD)) throw new Error(`No ${DIST_BUILD} — run \`pnpm build\` first`);
  const out = [];
  for (const doc of readdirSync(DIST_BUILD, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const tpl of readdirSync(join(DIST_BUILD, doc.name), { withFileTypes: true }).filter((d) => d.isDirectory())) {
      out.push({ doc: doc.name, tpl: tpl.name });
    }
  }
  return out;
}

async function waitForDownload(dir, before, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const files = readdirSync(dir).filter((f) => f.endsWith(".pdf") && !before.has(f));
    const done = files.find((f) => !readdirSync(dir).includes(f + ".crdownload"));
    if (done && !readdirSync(dir).some((f) => f.endsWith(".crdownload"))) return done;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("PDF download did not complete in time");
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const generated = [];
try {
  for (const { doc, tpl } of routes()) {
    const page = await browser.newPage();
    const client = await page.createCDPSession();
    await client.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: OUT });
    await page.goto(`${BASE}/build/${doc}/${tpl}/`, { waitUntil: "networkidle0" });
    await page.waitForSelector(".resume-page", { timeout: 20000 });

    // Font pairings offered for this template (self-updating from the picker UI).
    await page.click('button[aria-label="Variants"]');
    await page.waitForSelector('[aria-label="Font pairing"] button', { timeout: 5000 });
    const pairings = await page.$$eval('[aria-label="Font pairing"] button', (btns) =>
      btns.map((b) => b.getAttribute("aria-label")),
    );
    await page.keyboard.press("Escape");

    for (const pairing of pairings) {
      await page.click('button[aria-label="Variants"]');
      await page.waitForSelector(`[aria-label="Font pairing"] button[aria-label="${pairing}"]`, { timeout: 5000 });
      await page.click(`[aria-label="Font pairing"] button[aria-label="${pairing}"]`);
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 200));

      const before = new Set(readdirSync(OUT));
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find((b) => /Download|PDF/.test(b.textContent));
        btn.click();
      });
      const file = await waitForDownload(OUT, before);
      const dest = `${doc}-${tpl}-${pairing.toLowerCase()}.pdf`;
      renameSync(join(OUT, file), join(OUT, dest));
      generated.push(dest);
      console.log(`✓ ${dest}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`\nGenerated ${generated.length} PDF(s) in ${OUT}`);
