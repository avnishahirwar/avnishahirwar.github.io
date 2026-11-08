import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = 8787;
const baseUrl = `http://${host}:${port}`;
const child = spawn(
  "npx",
  ["wrangler", "dev", "--local", "--ip", host, "--port", String(port), "--log-level", "error"],
  {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" }
  }
);

let logs = "";
child.stdout.on("data", chunk => { logs += chunk.toString(); });
child.stderr.on("data", chunk => { logs += chunk.toString(); });

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Wrangler exited early (code ${child.exitCode}).\n${logs}`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // The local Worker is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for Wrangler.\n${logs}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await waitForServer();

  const health = await fetch(`${baseUrl}/health`);
  const payload = await health.json();
  assert(health.status === 200, `GET /health returned ${health.status}`);
  assert(payload.status === "ok", "Health status should be ok");
  assert(payload.service === "avnish-ai-connector", "Unexpected service name");
  assert(payload.version === "0.2.0", "Unexpected connector version");
  assert(payload.mode === "read-only-public-data", "Unexpected security mode");
  assert(payload.mcpEndpoint === "/mcp", "Unexpected MCP endpoint");
  assert(health.headers.get("cache-control") === "no-store", "Health response must not be cached");
  assert(health.headers.get("x-content-type-options") === "nosniff", "Health response must set nosniff");

  const head = await fetch(`${baseUrl}/health`, { method: "HEAD" });
  assert(head.status === 200, `HEAD /health returned ${head.status}`);

  const method = await fetch(`${baseUrl}/health`, { method: "POST" });
  assert(method.status === 405, `POST /health should return 405, got ${method.status}`);
  assert(method.headers.get("allow") === "GET, HEAD", "405 response should advertise allowed methods");

  const missing = await fetch(`${baseUrl}/not-a-real-route`);
  assert(missing.status === 404, `Unknown route should return 404, got ${missing.status}`);
  assert(missing.headers.get("x-content-type-options") === "nosniff", "404 response must set nosniff");

  console.log("Local Worker smoke tests passed: health GET/HEAD, method restriction, response headers, and 404 routing.");
} finally {
  child.kill("SIGTERM");
}
