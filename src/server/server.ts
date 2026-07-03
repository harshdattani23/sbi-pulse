import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { listPersonas, runPersona, runFleet, type RunOpts } from "./engineApi.ts";
import { listCustomers, startForCustomer, replyForCustomer, cockpit, impact, studio, flywheel, forecastFor, type PulseOpts } from "./pulseApi.ts";

// ---------------------------------------------------------------------------
// Zero-dependency web server. Serves the static UI from /web and exposes the
// engine over a tiny JSON API. Start with:  npm run web
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = join(__dirname, "..", "..", "web");
const PORT = Number(process.env.PORT ?? 5173);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

function json(res: import("node:http").ServerResponse, data: unknown, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}

function optsFromParams(p: URLSearchParams): RunOpts {
  const opts: RunOpts = {};
  if (p.has("hour")) opts.hour = Number(p.get("hour"));
  if (p.has("recent")) opts.recentContacts = Number(p.get("recent"));
  if (p.has("cap")) opts.frequencyCap = Number(p.get("cap"));
  if (p.has("marketing")) opts.marketing = p.get("marketing") === "1" || p.get("marketing") === "true";
  return opts;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    const path = url.pathname;

    // ---- API ----
    if (path === "/api/personas") return json(res, listPersonas());

    if (path === "/api/run") {
      const id = url.searchParams.get("id") ?? "";
      const result = await runPersona(id, optsFromParams(url.searchParams));
      return result ? json(res, result) : json(res, { error: "unknown persona" }, 404);
    }

    if (path === "/api/fleet") {
      return json(res, await runFleet(optsFromParams(url.searchParams)));
    }

    // ---- Pulse API (engagement journeys) ----
    const pulseOpts: PulseOpts = optsFromParams(url.searchParams);
    if (path === "/api/pulse/customers") return json(res, listCustomers());
    if (path === "/api/pulse/start") {
      const id = url.searchParams.get("id") ?? "";
      const r = await startForCustomer(id, pulseOpts);
      return r ? json(res, r) : json(res, { error: "unknown customer" }, 404);
    }
    if (path === "/api/pulse/reply") {
      const id = url.searchParams.get("id") ?? "";
      const input = url.searchParams.get("msg") ?? url.searchParams.get("choice") ?? "";
      return json(res, await replyForCustomer(id, input));
    }
    if (path === "/api/pulse/cockpit") return json(res, cockpit(pulseOpts));
    if (path === "/api/pulse/impact") return json(res, impact(pulseOpts));
    if (path === "/api/pulse/studio") return json(res, studio());
    if (path === "/api/pulse/forecast") {
      const r = forecastFor(url.searchParams.get("id") ?? "");
      return r ? json(res, r) : json(res, { error: "unknown customer" }, 404);
    }
    if (path === "/api/pulse/flywheel") return json(res, flywheel(Number(url.searchParams.get("rounds") ?? 0)));

    // ---- static ----
    const rel = path === "/" ? "index.html" : path.replace(/^\/+/, "");
    if (rel.includes("..")) return json(res, { error: "bad path" }, 400);
    try {
      const file = await readFile(join(WEB_DIR, rel));
      res.writeHead(200, { "content-type": MIME[extname(rel)] ?? "application/octet-stream" });
      return res.end(file);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("Not found");
    }
  } catch (err) {
    json(res, { error: String(err) }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`\n  🫀  SBI Pulse → http://localhost:${PORT}\n`);
});
