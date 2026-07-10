/*
 * Serve the create-template scratchpad demo over HTTP so the user (and any
 * coding agent's browser) can open it for the Step 4 review gate. Harness- and
 * agent-agnostic — no Claude-specific Artifact needed. Run it in the background.
 *
 * Usage: node .claude/skills/create-template/serve.mjs <dir> [port]
 *   <dir>  directory containing demo.html (usually the scratchpad dir)
 *   [port] optional; defaults to 4319
 *
 * Then tell the user to open:  http://localhost:<port>/demo.html
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const dir = process.argv[2];
const port = Number(process.argv[3]) || 4319;
if (!dir) {
  console.error("Usage: node serve.mjs <dir> [port]");
  process.exit(1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = normalize(urlPath === "/" ? "/demo.html" : urlPath).replace(/^(\.\.[/\\])+/, "");
    const file = join(dir, rel);
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Serving ${dir} at http://localhost:${port}/  →  open http://localhost:${port}/demo.html`);
});
