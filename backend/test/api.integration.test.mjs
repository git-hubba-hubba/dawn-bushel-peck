import { test } from "node:test";
import assert from "node:assert/strict";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { ObjectId } from "mongodb";
import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/db.js";
import { runStore } from "../src/services/run-store.js";
import { executeStoredAction } from "../src/services/tools.js";
import { structures } from "../../shared/structures.js";
import { executeWorkflow } from "../src/services/orchestrator.js";
test("MongoDB API: authentication, ingestion, queue transactions, results, approvals and deletion", async () => {
  const mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    binary: { downloadDir: "/private/tmp/dawn-mongodb-binaries" },
  });
  let close, server;
  try {
    const config = {
      uri: mongo.getUri(),
      dbName: "integration",
      password: "test-password-long-enough",
      origin: "http://localhost:5173",
      production: false,
      key: "fake-key-never-sent",
      model: "test",
      evaluator: "test",
    };
    const connection = await connectDatabase(config);
    close = connection.close;
    const { db, client } = connection;
    await db.collection("limits").insertOne({ _id: "owner", active: 0 });
    const app = createApp({ db, client, config });
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const url = `http://127.0.0.1:${server.address().port}/api`;
    let cookie = "";
    const request = (
      path,
      { method = "GET", body, origin = config.origin } = {},
    ) =>
      fetch(url + path, {
        method,
        headers: {
          ...(cookie ? { cookie } : {}),
          ...(method !== "GET" ? { origin } : {}),
          ...(body && !(body instanceof FormData)
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body:
          body instanceof FormData
            ? body
            : body
              ? JSON.stringify(body)
              : undefined,
      });
    assert.equal((await request("/projects")).status, 401);
    assert.equal(
      (
        await request("/auth/login", {
          method: "POST",
          body: { password: config.password },
          origin: "https://attacker.example",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request("/auth/login", {
          method: "POST",
          body: { password: "wrong" },
        })
      ).status,
      401,
    );
    const credentials = {
      email: "first@example.test",
      password: "a-long-private-account-password",
    };
    const signup = await request("/auth/signup", {
      method: "POST",
      body: credentials,
    });
    assert.equal(signup.status, 201);
    cookie = signup.headers.get("set-cookie").split(";")[0];
    const firstCookie = cookie;
    const privateProject = await request("/projects", {
      method: "POST",
      body: { name: "Private workflow", content: "Private source" },
    });
    assert.equal(privateProject.status, 201);
    const privateId = (await privateProject.json())._id;
    const storedAccount = await db
      .collection("accounts")
      .findOne({ email: credentials.email });
    assert.equal(storedAccount.password, undefined);
    assert.equal(storedAccount.digest.includes(credentials.password), false);
    assert.equal(
      (await request("/auth/signup", { method: "POST", body: credentials }))
        .status,
      409,
    );
    const secondSignup = await request("/auth/signup", {
      method: "POST",
      body: { ...credentials, email: "second@example.test" },
    });
    assert.equal(secondSignup.status, 201);
    cookie = secondSignup.headers.get("set-cookie").split(";")[0];
    assert.equal((await request(`/projects/${privateId}`)).status, 404);
    assert.deepEqual(await (await request("/projects")).json(), []);
    assert.equal(
      (
        await request("/auth/signin", {
          method: "POST",
          body: { ...credentials, password: "incorrect-long-password" },
        })
      ).status,
      401,
    );
    const signin = await request("/auth/signin", {
      method: "POST",
      body: { ...credentials, email: "FIRST@example.test" },
    });
    assert.equal(signin.status, 200);
    cookie = signin.headers.get("set-cookie").split(";")[0];
    assert.equal((await request(`/projects/${privateId}`)).status, 200);
    await request("/auth/logout", { method: "POST" });
    cookie = firstCookie;
    // This old session was revoked when the browser changed accounts.
    assert.equal((await request("/projects")).status, 401);
    cookie = "";
    const login = await request("/auth/login", {
      method: "POST",
      body: { password: config.password },
    });
    assert.equal(login.status, 200);
    cookie = login.headers.get("set-cookie").split(";")[0];
    assert.match(login.headers.get("set-cookie"), /HttpOnly/);
    assert.equal(
      (
        await request("/projects", {
          method: "POST",
          body: { name: "Injection", content: { $ne: null } },
        })
      ).status,
      400,
    );
    const upload = new FormData();
    upload.append(
      "file",
      new Blob(["A neighborhood repair service."], { type: "text/plain" }),
      "concept.txt",
    );
    const created = await request("/documents", {
      method: "POST",
      body: upload,
    });
    assert.equal(created.status, 201);
    const project = await created.json();
    assert.match(project.content, /repair/);
    const other = await db.collection("projects").insertOne({
      workspaceId: "other",
      name: "Private",
      content: "Private",
      createdAt: new Date(),
    });
    assert.equal((await request(`/projects/${other.insertedId}`)).status, 404);
    const data = {
      projectId: project._id,
      structures: structures.map((s) => s.id),
      weights: { quality: 50, speed: 50, efficiency: 50 },
    };
    const queued = await request("/runs", { method: "POST", body: data });
    assert.equal(queued.status, 202);
    const batch = await queued.json();
    assert.equal(batch.runs.length, 7);
    assert.equal(
      (await db.collection("limits").findOne({ _id: "owner" })).active,
      7,
    );
    const second = await request("/runs", { method: "POST", body: data });
    assert.equal(second.status, 202);
    assert.equal(
      (await request("/runs", { method: "POST", body: data })).status,
      429,
    );
    const store = runStore(db, client),
      run = batch.runs[0];
    await db
      .collection("runs")
      .updateOne(
        { _id: new ObjectId(run._id) },
        { $set: { status: "running", workerId: "test" } },
      );
    const report = {
      summary: "Plan",
      deliverable: "A tested draft plan",
      decisions: ["Pilot"],
      risks: ["Unknown demand"],
      nextSteps: ["Interview customers"],
      actions: [
        {
          tool: "unconfigured-tool",
          description: "Propose publishing",
          payload: "{}",
        },
      ],
    };
    const result = await executeWorkflow({
      structureId: "flat",
      content: project.content,
      provider: async ({ evaluate }) => ({
        output: evaluate
          ? {
              quality: 80,
              purposeFit: 90,
              reasoning: "Grounded pilot",
              evidence: ["Pilot"],
            }
          : report,
        usage: { inputTokens: 100, outputTokens: 40 },
        model: "test",
      }),
    });
    const actionId = new ObjectId();
    result.metrics.costUsd = null;
    assert.equal(
      await store.finish(
        { _id: new ObjectId(run._id), workerId: "test" },
        "owner",
        {
          ...result,
          status: "completed",
          actions: [{ ...report.actions[0], _id: actionId, status: "pending" }],
        },
      ),
      true,
    );
    assert.equal(
      await store.finish(
        { _id: new ObjectId(run._id), workerId: "test" },
        "owner",
        { status: "failed" },
      ),
      false,
    );
    assert.equal(
      (await db.collection("limits").findOne({ _id: "owner" })).active,
      13,
    );
    const analytics = await request("/analytics", {
      method: "POST",
      body: { batchId: batch.batchId, weights: data.weights },
    });
    assert.equal(analytics.status, 200);
    assert.equal((await analytics.json()).rankings.length, 1);
    assert.equal(
      (
        await request(`/runs/${run._id}/actions/${actionId}/approve`, {
          method: "POST",
          body: {},
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request(`/runs/${run._id}/actions/${actionId}/reject`, {
          method: "POST",
          body: {},
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request(`/runs/${batch.runs[1]._id}/cancel`, {
          method: "POST",
          body: {},
        })
      ).status,
      200,
    );
    assert.equal(
      (await db.collection("limits").findOne({ _id: "owner" })).active,
      12,
    );
    assert.equal(
      (
        await request(`/runs/${batch.runs[1]._id}/cancel`, {
          method: "POST",
          body: {},
        })
      ).status,
      409,
    );
    const draftId = new ObjectId();
    await db.collection("runs").updateOne(
      { _id: new ObjectId(run._id) },
      {
        $push: {
          actions: {
            _id: draftId,
            tool: "create_draft",
            status: "pending",
            description: "Save draft",
            payload: JSON.stringify({
              title: "Pilot",
              body: "Launch a repair pilot.",
            }),
          },
        },
      },
    );
    const saved = await executeStoredAction({
      db,
      client,
      runId: new ObjectId(run._id),
      actionId: draftId,
      workspaceId: "owner",
    });
    assert.equal(saved.status, "succeeded");
    assert.equal(
      await db.collection("artifacts").countDocuments({ workspaceId: "owner" }),
      1,
    );
    await assert.rejects(
      executeStoredAction({
        db,
        client,
        runId: new ObjectId(run._id),
        actionId: draftId,
        workspaceId: "owner",
      }),
    );
    assert.equal(
      (await request(`/projects/${project._id}`, { method: "DELETE" })).status,
      204,
    );
    assert.equal(
      await db.collection("artifacts").countDocuments({ workspaceId: "owner" }),
      0,
    );
    assert.equal(
      await db.collection("runs").countDocuments({ workspaceId: "owner" }),
      0,
    );
    assert.equal(
      (await db.collection("limits").findOne({ _id: "owner" })).active,
      0,
    );
    assert.equal(
      (await request("/auth/logout", { method: "POST", body: {} })).status,
      204,
    );
    assert.equal((await request("/projects")).status, 401);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (close) await close();
    await mongo.stop();
  }
});
