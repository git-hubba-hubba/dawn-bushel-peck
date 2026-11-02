import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { serveFrontend } from "../src/services/frontend.js";
import { loadConfig } from "../src/config.js";

const base = {
  MONGODB_URI: "mongodb://example.test/dawn",
  WORKSPACE_PASSWORD: "test-only-long-password",
};

test("production uses the hosting port and public bind; proxy trust is explicit and bounded", () => {
  assert.equal(loadConfig(base).host, "127.0.0.1");
  assert.equal(loadConfig(base).trustProxyHops, 0);
  const production = loadConfig({
    ...base,
    NODE_ENV: "production",
    APP_ORIGIN: "https://dawn.example.test",
    PORT: "10000",
    TRUST_PROXY_HOPS: "1",
  });
  assert.equal(production.host, "0.0.0.0");
  assert.equal(production.port, 10000);
  assert.equal(production.trustProxyHops, 1);
  for (const value of ["true", "-1", "1.5", "6"]) {
    assert.throws(
      () => loadConfig({ ...base, TRUST_PROXY_HOPS: value }),
      /TRUST_PROXY_HOPS/,
    );
  }
});

test("compiled frontend serves navigation while preserving API and missing-asset responses", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dawn-hosting-"));
  let server;
  try {
    await mkdir(join(directory, "assets"));
    await writeFile(
      join(directory, "index.html"),
      "<!doctype html><title>Dawn hosting test</title>",
    );
    await writeFile(
      join(directory, "assets", "app.js"),
      "document.title = 'Dawn';",
    );
    await writeFile(join(directory, ".hidden"), "private fixture");
    const app = express();
    app.get("/api/health", (req, res) => res.json({ status: "ok" }));
    app.use("/api", (req, res) => res.status(401).json({ error: "Sign in." }));
    serveFrontend(app, directory);
    app.use((req, res) => res.status(404).json({ error: "Not found." }));
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const url = `http://127.0.0.1:${server.address().port}`;
    for (const path of ["/", "/workspace/ideas"]) {
      const response = await fetch(url + path, {
        headers: { accept: "text/html" },
      });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /text\/html/);
      assert.match(await response.text(), /Dawn hosting test/);
      assert.equal(response.headers.get("cache-control"), "no-cache");
    }
    assert.deepEqual(await (await fetch(url + "/api/health")).json(), {
      status: "ok",
    });
    assert.equal((await fetch(url + "/api/projects")).status, 401);
    assert.equal((await fetch(url + "/api/unknown")).status, 401);
    assert.equal((await fetch(url + "/assets/app.js")).status, 200);
    for (const path of [
      "/assets/missing.js",
      "/.hidden",
      "/backend/src/server.js",
    ]) {
      assert.equal((await fetch(url + path)).status, 404);
    }
    assert.equal(
      (
        await fetch(url + "/workspace", {
          headers: { accept: "application/json" },
        })
      ).status,
      404,
    );
    assert.equal(
      (await fetch(url + "/workspace", { method: "POST" })).status,
      404,
    );
    assert.throws(
      () => serveFrontend(express(), join(directory, "missing")),
      /Frontend build missing/,
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
