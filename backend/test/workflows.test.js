import { test } from "node:test";
import assert from "node:assert/strict";
import { structures } from "../../shared/structures.js";
import { executeWorkflow } from "../src/services/orchestrator.js";
import { rankRuns } from "../src/services/analytics.js";
import { passwordVerifier, originMiddleware } from "../src/services/auth.js";
import {
  projectSchema,
  runSchema,
  reportSchema,
} from "../src/services/validation.js";
import { executeApprovedAction, actionPolicy } from "../src/services/tools.js";
import { loadConfig } from "../src/config.js";
const report = {
  summary: "Grounded summary",
  deliverable: "Draft deliverable",
  decisions: ["Decision"],
  risks: ["Risk"],
  nextSteps: ["Step"],
  actions: [],
};
for (const model of structures)
  test(`${model.name}: dependencies arrive before downstream work`, async () => {
    const finished = new Set(),
      calls = [],
      completed = [];
    const result = await executeWorkflow({
      structureId: model.id,
      content: "A local services concept",
      provider: async ({ input, evaluate, instructions }) => {
        if (evaluate)
          return {
            output: {
              quality: 80,
              purposeFit: 75,
              reasoning: "Evidence",
              evidence: ["Draft"],
            },
            usage: { inputTokens: 2, outputTokens: 3 },
            model: "test",
          };
        const data = JSON.parse(input);
        for (const contribution of data.contributions)
          assert.ok(finished.has(contribution.id), "Dependency finished");
        const node = model.nodes.find(
          (n) =>
            instructions.startsWith(`You are ${n.role} in`) &&
            JSON.stringify(data.contributions.map((c) => c.id)) ===
              JSON.stringify(n.dependsOn),
        );
        assert.ok(node);
        assert.deepEqual(
          data.contributions.map((c) => c.id),
          node.dependsOn,
        );
        await new Promise((resolve) => setTimeout(resolve, 2));
        finished.add(node.id);
        calls.push(node.id);
        return {
          output: report,
          usage: { inputTokens: 10, outputTokens: 20 },
          model: "test",
        };
      },
      onStep: async (step) => {
        if (step.status === "completed") completed.push(step.id);
      },
    });
    assert.equal(calls.length, model.nodes.length);
    assert.equal(completed.length, model.nodes.length);
    assert.equal(result.metrics.inputTokens, model.nodes.length * 10 + 2);
    assert.equal(result.metrics.outputTokens, model.nodes.length * 20 + 3);
    assert.deepEqual(result.report, report);
  });
test("cancellation prevents any provider call", async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;
  await assert.rejects(
    executeWorkflow({
      structureId: "flat",
      content: "idea",
      signal: controller.signal,
      provider: async () => {
        called = true;
      },
    }),
  );
  assert.equal(called, false);
});
test("downstream stages do not proceed after a specialist failure", async () => {
  let owner = false;
  await assert.rejects(
    executeWorkflow({
      structureId: "flat",
      content: "idea",
      provider: async ({ instructions }) => {
        if (instructions.includes("CEO / Owner")) owner = true;
        throw new Error("Provider failed");
      },
    }),
  );
  assert.equal(owner, false);
});
test("analytics exclude failed runs and honor selected priorities", () => {
  const runs = [
    {
      _id: "a",
      structureId: "flat",
      status: "completed",
      evaluation: { quality: 90, purposeFit: 90 },
      metrics: { durationMs: 200, inputTokens: 100, outputTokens: 100 },
    },
    {
      _id: "b",
      structureId: "agile",
      status: "completed",
      evaluation: { quality: 60, purposeFit: 60 },
      metrics: { durationMs: 100, inputTokens: 50, outputTokens: 50 },
    },
    { _id: "c", status: "failed" },
  ];
  assert.equal(
    rankRuns(runs, { quality: 100, speed: 0, efficiency: 0 })[0].id,
    "a",
  );
  assert.equal(
    rankRuns(runs, { quality: 0, speed: 100, efficiency: 0 })[0].id,
    "b",
  );
  assert.equal(
    rankRuns(runs, { quality: 0, speed: 0, efficiency: 100 })[0].id,
    "b",
  );
  assert.equal(
    rankRuns(runs, { quality: 1, speed: 1, efficiency: 1 }).length,
    2,
  );
});
test("malicious request shapes and invalid weights are rejected", () => {
  assert.equal(
    projectSchema.safeParse({ name: "X", content: { $gt: "" } }).success,
    false,
  );
  assert.equal(
    projectSchema.safeParse({
      name: "X",
      content: "idea",
      workspaceId: "another",
    }).success,
    false,
  );
  assert.equal(
    runSchema.safeParse({
      projectId: "a".repeat(24),
      structures: ["flat", "flat"],
      weights: { quality: 1, speed: 1, efficiency: 1 },
    }).success,
    false,
  );
  assert.equal(
    runSchema.safeParse({
      projectId: "a".repeat(24),
      structures: ["flat"],
      weights: { quality: 0, speed: 0, efficiency: 0 },
    }).success,
    false,
  );
  assert.equal(
    reportSchema.safeParse({
      ...report,
      actions: [{ tool: "x", description: "x", payload: { url: "x" } }],
    }).success,
    false,
  );
});
test("external tools require ownership, approval and registration", async () => {
  await assert.rejects(
    executeApprovedAction({
      action: { workspaceId: "other", status: "approved", tool: "x" },
      workspaceId: "owner",
    }),
  );
  await assert.rejects(
    executeApprovedAction({
      action: { workspaceId: "owner", status: "pending", tool: "x" },
      workspaceId: "owner",
    }),
  );
  await assert.rejects(
    executeApprovedAction({
      action: { workspaceId: "owner", status: "approved", tool: "x" },
      workspaceId: "owner",
    }),
  );
});
test("cross-origin mutation is blocked", () => {
  let allowed = false,
    status;
  originMiddleware({ origin: "http://localhost:5173" })(
    { method: "POST", headers: { origin: "https://attacker.example" } },
    {
      status: (code) => {
        status = code;
        return { json: () => {} };
      },
    },
    () => {
      allowed = true;
    },
  );
  assert.equal(allowed, false);
  assert.equal(status, 403);
});
test("password verification and production configuration fail safely", () => {
  const verify = passwordVerifier("a-unique-long-password");
  assert.equal(verify("a-unique-long-password"), true);
  assert.equal(verify("wrong"), false);
  assert.throws(() =>
    loadConfig({ MONGODB_URI: "mongodb://x", WORKSPACE_PASSWORD: "short" }),
  );
  assert.throws(() =>
    loadConfig({
      MONGODB_URI: "mongodb://x",
      WORKSPACE_PASSWORD: "a-unique-long-password",
      NODE_ENV: "production",
      APP_ORIGIN: "http://example.com",
    }),
  );
});

test("payment and software restructuring classifications are server controlled", () => {
  const registry = new Map([
    ["paid", { requiresPayment: true, restructuresSoftware: false }],
    ["critical", { requiresPayment: false, restructuresSoftware: true }],
    ["free", { requiresPayment: false, restructuresSoftware: false }],
  ]);
  assert.equal(actionPolicy("paid", registry).requiresApproval, true);
  assert.equal(actionPolicy("critical", registry).requiresApproval, true);
  assert.equal(actionPolicy("free", registry).requiresApproval, false);
  assert.equal(actionPolicy("unknown", registry).configured, false);
});

test("live output arrives before completed deliverables and carries the agent mandate", async () => {
  const events = [];
  await executeWorkflow({
    structureId: "flat",
    content: "A repair workflow",
    onStep: async (step) => events.push(step),
    provider: async ({ evaluate, onProgress }) => {
      if (!evaluate) await onProgress("Partial generated output");
      return {
        output: evaluate
          ? { quality: 80, purposeFit: 80, reasoning: "Evidence", evidence: [] }
          : report,
        usage: { inputTokens: 1, outputTokens: 1 },
        model: "test",
      };
    },
  });
  for (const node of structures.find((item) => item.id === "flat").nodes) {
    const preview = events.findIndex(
      (step) => step.id === node.id && step.preview,
    );
    const completed = events.findIndex(
      (step) => step.id === node.id && step.status === "completed",
    );
    assert.ok(preview >= 0 && preview < completed);
    assert.equal(events[preview].mandate, node.mandate);
    assert.equal(events[preview].output, undefined);
  }
});

test("development allows loopback aliases on the configured port while production remains exact", () => {
  function permitted(origin, production = false) {
    let allowed = false;
    originMiddleware({ origin: "http://localhost:5173", production })(
      { method: "POST", headers: { origin } },
      { status: () => ({ json: () => {} }) },
      () => {
        allowed = true;
      },
    );
    return allowed;
  }
  assert.equal(permitted("http://localhost:5173"), true);
  assert.equal(permitted("http://127.0.0.1:5173"), true);
  assert.equal(permitted("http://[::1]:5173"), true);
  assert.equal(permitted("http://127.0.0.1:5174"), false);
  assert.equal(permitted("https://localhost:5173"), false);
  assert.equal(permitted("http://localhost.evil.test:5173"), false);
  assert.equal(permitted(undefined), false);
  assert.equal(permitted("null"), false);
  assert.equal(permitted("http://127.0.0.1:5173", true), false);
});
