import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import test from "node:test";

async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  server.close();
  await once(server, "close");
  return port;
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      return await fetch(url);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error("Next.js server did not start");
}

test("server-renders the INSTEAD guide directory", async () => {
  const port = await availablePort();
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
    {
      cwd: new URL("..", import.meta.url),
      stdio: "ignore",
    },
  );

  try {
    const response = await waitForServer(`http://127.0.0.1:${port}`);
    assert.equal(response.status, 200);
    assert.match(
      response.headers.get("content-type") ?? "",
      /^text\/html\b/i,
    );

    const html = await response.text();
    assert.match(
      html,
      /<title>INSTEAD — Practical alternatives for everyday life<\/title>/i,
    );
    assert.match(html, /What are you trying to do\?/);
    assert.match(html, /Routine pest control/);
    assert.match(html, /Household Services/);
    assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
  } finally {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
});
