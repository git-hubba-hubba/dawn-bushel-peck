import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { loadConfig } from "./config.js";
import { connectDatabase } from "./db.js";
import { createProvider } from "./services/provider.js";
import { executeWorkflow } from "./services/orchestrator.js";
import { runStore } from "./services/run-store.js";
import { actionPolicy, executeStoredAction } from "./services/tools.js";
const config = loadConfig();
if (!config.key) throw new Error("OPENAI_API_KEY is required for the worker.");
const { db, client, close } = await connectDatabase(config),
  provider = createProvider(config),
  workerId = randomUUID(),
  store = runStore(db, client);
let stopping = false,
  currentController;
async function work(run) {
  const owned = { _id: run._id, workerId, status: "running" };
  const controller = new AbortController();
  currentController = controller;
  const heartbeat = setInterval(async () => {
    try {
      const result = await db.collection("runs").updateOne(owned, {
        $set: { leaseUntil: new Date(Date.now() + 60000) },
      });
      if (!result.matchedCount) controller.abort();
    } catch {
      controller.abort();
    }
  }, 10000);
  try {
    const project = await db
      .collection("projects")
      .findOne({ _id: run.projectId, workspaceId: run.workspaceId });
    if (!project) throw new Error("Source project removed.");
    const result = await executeWorkflow({
      structureId: run.structureId,
      content: project.content,
      provider,
      signal: controller.signal,
      onStep: async (step) => {
        const path = `stepState.${step.id}`;
        const updated = await db
          .collection("runs")
          .updateOne(owned, { $set: { [path]: step } });
        if (!updated.matchedCount) {
          controller.abort();
          throw new Error("Run cancelled or lease lost.");
        }
      },
    });
    controller.signal.throwIfAborted();
    result.metrics.costUsd =
      config.inputPrice === null || config.outputPrice === null
        ? null
        : (result.metrics.inputTokens * config.inputPrice +
            result.metrics.outputTokens * config.outputPrice) /
          1000000;
    // Proposals are in the completed run, eliminating writes racing project deletion.
    const actions = result.report.actions.map((a) => ({
      ...a,
      _id: new ObjectId(),
      status: "pending",
    }));
    const finished = await store.finish(owned, run.workspaceId, {
      ...result,
      actions,
      status: "completed",
    });
    if (finished)
      for (const action of actions) {
        const policy = actionPolicy(action.tool);
        if (policy.configured && !policy.requiresApproval) {
          try {
            await executeStoredAction({
              db,
              client,
              runId: run._id,
              actionId: action._id,
              workspaceId: run.workspaceId,
            });
          } catch {
            /* Failure status stays on the action; run deliverable remains valid. */
          }
        }
      }
  } catch {
    controller.abort();
    await store.finish(owned, run.workspaceId, {
      status: "failed",
      error:
        "Execution could not complete. Check provider access and server configuration.",
    });
  } finally {
    clearInterval(heartbeat);
    currentController = null;
  }
}
function shutdown() {
  stopping = true;
  currentController?.abort();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
while (!stopping) {
  // Interrupted jobs fail rather than automatically replaying paid provider calls.
  const stale = await db
    .collection("runs")
    .find({ status: "running", leaseUntil: { $lt: new Date() } })
    .toArray();
  for (const run of stale)
    await store.finish(
      { _id: run._id, leaseUntil: { $lt: new Date() } },
      run.workspaceId,
      {
        status: "failed",
        error: "Worker lease expired. Start a new run to retry.",
      },
    );
  const run = await db.collection("runs").findOneAndUpdate(
    { status: "queued" },
    {
      $set: {
        status: "running",
        workerId,
        startedAt: new Date(),
        leaseUntil: new Date(Date.now() + 60000),
      },
      $inc: { attempt: 1 },
    },
    { sort: { createdAt: 1 }, returnDocument: "after" },
  );
  if (run) await work(run);
  else await new Promise((resolve) => setTimeout(resolve, 1000));
}
await close();
