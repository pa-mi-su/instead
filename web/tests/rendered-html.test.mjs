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

test("server-renders the guide directory and policy pages", async () => {
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
    assert.match(html, /href="\/privacy"/);
    assert.match(html, /href="\/support"/);
    assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);

    const policyPages = [
      ["/privacy", /<title>Privacy Policy — INSTEAD<\/title>/i, /no accounts/i],
      ["/terms", /<title>Terms of Use — INSTEAD<\/title>/i, /reference tool/i],
      [
        "/safety",
        /<title>Safety — INSTEAD<\/title>/i,
        /NOT FOR EMERGENCIES/i,
      ],
      [
        "/support",
        /<title>Support — INSTEAD<\/title>/i,
        /CONTACT SUPPORT|public support email has not been configured yet/i,
      ],
    ];

    for (const [path, title, content] of policyPages) {
      const pageResponse = await fetch(`http://127.0.0.1:${port}${path}`);
      assert.equal(pageResponse.status, 200);
      const pageHtml = await pageResponse.text();
      assert.match(pageHtml, title);
      assert.match(pageHtml, content);
      assert.match(pageHtml, /href="\/privacy"/);
      assert.match(pageHtml, /href="\/support"/);
      assert.doesNotMatch(
        pageHtml,
        /codex-preview|Your site is taking shape/i,
      );
    }
  } finally {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
});
