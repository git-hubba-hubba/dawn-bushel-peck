import { z } from "zod";
export const toolRegistry = new Map([
  [
    "create_draft",
    {
      description: "Save a concept deliverable as a workspace draft",
      requiresPayment: false,
      restructuresSoftware: false,
      schema: z
        .object({
          title: z.string().min(1).max(120),
          body: z.string().min(1).max(22000),
        })
        .strict(),
      execute: async (payload, context) =>
        saveArtifact("draft", payload, context),
    },
  ],
  [
    "create_task",
    {
      description: "Save an actionable task in the workspace",
      requiresPayment: false,
      restructuresSoftware: false,
      schema: z
        .object({
          title: z.string().min(1).max(120),
          description: z.string().min(1).max(8000),
        })
        .strict(),
      execute: async (payload, context) =>
        saveArtifact("task", payload, context),
    },
  ],
]);
export function actionPolicy(tool, registry = toolRegistry) {
  const adapter = registry.get(tool);
  if (!adapter)
    return {
      configured: false,
      requiresApproval: true,
      reason: "Tool not configured.",
    };
  return {
    configured: true,
    requiresApproval: Boolean(
      adapter.requiresPayment || adapter.restructuresSoftware,
    ),
    reason: adapter.requiresPayment
      ? "Payment requires approval."
      : adapter.restructuresSoftware
        ? "Software restructuring requires approval."
        : "Permitted workspace action.",
  };
}
async function saveArtifact(
  type,
  payload,
  { db, client, workspaceId, projectId, idempotencyKey },
) {
  return client.withSession((session) =>
    session.withTransaction(async () => {
      const project = await db
        .collection("projects")
        .updateOne(
          { _id: projectId, workspaceId },
          { $inc: { revision: 1 } },
          { session },
        );
      if (!project.matchedCount) throw new Error("Source project removed.");
      await db
        .collection("artifacts")
        .updateOne(
          { _id: idempotencyKey },
          {
            $setOnInsert: {
              workspaceId,
              projectId,
              type,
              ...payload,
              createdAt: new Date(),
            },
          },
          { upsert: true, session },
        );
      return { artifactId: idempotencyKey, type };
    }),
  );
}
export async function executeApprovedAction({
  action,
  workspaceId,
  registry = toolRegistry,
  ...context
}) {
  if (action.workspaceId !== workspaceId || action.status !== "approved")
    throw new Error("Action is not authorized.");
  const adapter = registry.get(action.tool);
  if (!adapter) throw new Error("This tool is not configured or permitted.");
  const payload = adapter.schema.parse(JSON.parse(action.payload));
  return adapter.execute(payload, {
    ...context,
    idempotencyKey: String(action._id),
    workspaceId,
  });
}
export async function executeStoredAction({
  db,
  client,
  runId,
  actionId,
  workspaceId,
  approved = false,
}) {
  const run = await db
    .collection("runs")
    .findOne({
      _id: runId,
      workspaceId,
      status: "completed",
      actions: { $elemMatch: { _id: actionId, status: "pending" } },
    });
  if (!run) throw new Error("Pending action not found.");
  const action = run.actions.find((a) => String(a._id) === String(actionId)),
    policy = actionPolicy(action.tool);
  if (!policy.configured)
    throw new Error(
      "Tool is not configured or permitted. No external action was executed.",
    );
  if (policy.requiresApproval && !approved) throw new Error(policy.reason);
  const claimed = await db
    .collection("runs")
    .updateOne(
      {
        _id: runId,
        workspaceId,
        status: "completed",
        actions: { $elemMatch: { _id: actionId, status: "pending" } },
      },
      {
        $set: {
          "actions.$.status": "executing",
          "actions.$.approvedAt": approved ? new Date() : null,
        },
      },
    );
  if (!claimed.matchedCount) throw new Error("Action was already reviewed.");
  try {
    const result = await executeApprovedAction({
      action: { ...action, workspaceId, status: "approved" },
      workspaceId,
      db,
      client,
      projectId: run.projectId,
    });
    await db
      .collection("runs")
      .updateOne(
        { _id: runId, workspaceId, "actions._id": actionId },
        {
          $set: {
            "actions.$.status": "succeeded",
            "actions.$.result": result,
            "actions.$.finishedAt": new Date(),
          },
        },
      );
    return { status: "succeeded", result };
  } catch {
    await db
      .collection("runs")
      .updateOne(
        { _id: runId, workspaceId, "actions._id": actionId },
        {
          $set: {
            "actions.$.status": "failed",
            "actions.$.error": "Tool execution failed.",
            "actions.$.finishedAt": new Date(),
          },
        },
      );
    throw new Error("Tool execution failed. Check the configured adapter.");
  }
}
