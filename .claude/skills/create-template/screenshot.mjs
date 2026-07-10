/*
 * Screenshot a local HTML file at true US-Letter size (612pt × 792pt = 816px ×
 * 1056px at 96dpi) for the create-template demo review gate. Uses puppeteer-core
 * against system Chrome, matching scripts/gen-pdfs.mjs.
 *
 * Usage: node .claude/skills/create-template/screenshot.mjs <input.html> <output.png>
 * Chrome path: $PUPPETEER_EXECUTABLE_PATH or $CHROME_PATH, else auto-detected.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

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

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: node screenshot.mjs <input.html> <output.png>");
  process.exit(1);
}
const url = pathToFileURL(resolve(input)).href;

const browser = await puppeteer.launch({ executablePath: chromePath() });
try {
  const page = await browser.newPage();
  // 816 × 1056 px = 612pt × 792pt at 96dpi — one US-Letter page at true size.
  await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.screenshot({ path: resolve(output), fullPage: true });
  console.log(`Wrote ${output}`);
} finally {
  await browser.close();
}
