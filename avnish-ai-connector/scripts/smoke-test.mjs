import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = 8787;
const baseUrl = `http://${host}:${port}`;
const wranglerEntrypoint = "./node_modules/wrangler/bin/wrangler.js";
const child = spawn(
  process.execPath,
  [wranglerEntrypoint, "dev", "--local", "--ip", host, "--port", String(port), "--log-level", "error"],
  {
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" }
  }
);

let logs = "";
child.stdout.on("data", chunk => { logs = (logs + chunk.toString()).slice(-12_000); });
child.stderr.on("data", chunk => { logs = (logs + chunk.toString()).slice(-12_000); });

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    signal: AbortSignal.timeout(3_000)
  });
}

async function waitForServer() {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Wrangler exited early (code ${child.exitCode}, signal ${child.signalCode}).\\n${logs}`);
    }
    try {
      const response = await request("/health");
      if (response.ok) return;
    } catch {
      // The local Worker is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out waiting for Wrangler.\\n${logs}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function stopWorker() {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (process.platform === "win32") child.kill("SIGTERM");
    else process.kill(-child.pid, "SIGTERM");
  } catch {
    // The process may have already exited.
  }
  await Promise.race([
    new Promise(resolve => child.once("close", resolve)),
    new Promise(resolve => setTimeout(resolve, 2_000))
  ]);
  if (child.exitCode === null && child.signalCode === null) {
    try {
      if (process.platform === "win32") child.kill("SIGKILL");
      else process.kill(-child.pid, "SIGKILL");
    } catch {
      // The process group may already be gone.
    }
  }
}

try {
  await waitForServer();

  const root = await request("/");
  const rootPayload = await root.json();
  assert(root.status === 200, `GET / returned ${root.status}`);
  assert(rootPayload.service === "avnish-ai-connector", "Unexpected root service name");
  assert(rootPayload.endpoints?.health === "/health", "Root response must advertise health endpoint");
  assert(rootPayload.endpoints?.mcp === "/mcp", "Root response must advertise MCP endpoint");
  assert(root.headers.get("cache-control") === "no-store", "Root response must not be cached");

  const health = await request("/health");
  const payload = await health.json();
  assert(health.status === 200, `GET /health returned ${health.status}`);
  assert(payload.status === "ok", "Health status should be ok");
  assert(payload.service === "avnish-ai-connector", "Unexpected service name");
  assert(payload.version === "0.2.0", "Unexpected connector version");
  assert(payload.mode === "read-only-public-data", "Unexpected security mode");
  assert(payload.mcpEndpoint === "/mcp", "Unexpected MCP endpoint");
  assert(health.headers.get("cache-control") === "no-store", "Health response must not be cached");
  assert(health.headers.get("x-content-type-options") === "nosniff", "Health response must set nosniff");

  const head = await request("/health", { method: "HEAD" });
  assert(head.status === 200, `HEAD /health returned ${head.status}`);

  const method = await request("/health", { method: "POST" });
  assert(method.status === 405, `POST /health should return 405, got ${method.status}`);
  assert(method.headers.get("allow") === "GET, HEAD", "405 response should advertise allowed methods");

  const missing = await request("/not-a-real-route");
  assert(missing.status === 404, `Unknown route should return 404, got ${missing.status}`);
  assert(missing.headers.get("x-content-type-options") === "nosniff", "404 response must set nosniff");

  console.log("Local Worker smoke tests passed: health GET/HEAD, method restriction, response headers, and 404 routing.");
} finally {
  await stopWorker();
}
