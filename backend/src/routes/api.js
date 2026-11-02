import { rateLimit } from "express-rate-limit";
import { createProvider } from "../services/provider.js";
import {
  recommendStructures,
  assessmentFailure,
} from "../services/recommendations.js";
import { Router } from "express";
import { ObjectId } from "mongodb";
import multer from "multer";
import { structures } from "../../../shared/structures.js";
import {
  projectSchema,
  runSchema,
  weightsSchema,
} from "../services/validation.js";
import { extractIsolated } from "../services/document-parser.js";
import { rankRuns } from "../services/analytics.js";
import {
  toolRegistry,
  actionPolicy,
  executeStoredAction,
} from "../services/tools.js";
import { runStore } from "../services/run-store.js";
const assessing = new Set();
const objectId = (value) =>
  /^[a-f0-9]{24}$/.test(value || "") ? new ObjectId(value) : null;
export function apiRoutes(db, config, client) {
  const router = Router(),
    store = runStore(db, client);
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
  });
  router.get("/status", async (req, res) =>
    res.json({
      providerConfigured: Boolean(config.key),
      model: config.model,
      database: "connected",
      tools: [...toolRegistry.keys()].map((tool) => ({
        name: tool,
        ...actionPolicy(tool),
      })),
    }),
  );
  router.get("/artifacts", async (req, res) =>
    res.json(
      await db
        .collection("artifacts")
        .find({ workspaceId: req.workspaceId })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
    ),
  );
  router.get("/structures", (req, res) => res.json(structures));
  router.get("/projects", async (req, res) =>
    res.json(
      await db
        .collection("projects")
        .find({ workspaceId: req.workspaceId }, { projection: { content: 0 } })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
    ),
  );
  router.post("/projects", async (req, res) => {
    const data = projectSchema.parse(req.body),
      project = {
        ...data,
        workspaceId: req.workspaceId,
        createdAt: new Date(),
      };
    const result = await db.collection("projects").insertOne(project);
    res.status(201).json({ ...project, _id: result.insertedId });
  });
  router.post("/documents", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Choose a document." });
    let content;
    try {
      content = await extractIsolated(req.file);
    } catch {
      return res.status(422).json({
        error:
          "Unable to extract this document. Use a text-based PDF, DOCX, TXT, or Markdown file with at most 80,000 characters.",
      });
    }
    const data = projectSchema.parse({
      name: req.file.originalname.slice(0, 120),
      content,
    });
    const project = {
      ...data,
      workspaceId: req.workspaceId,
      createdAt: new Date(),
    };
    const result = await db.collection("projects").insertOne(project);
    res.status(201).json({ ...project, _id: result.insertedId });
  });
  router.get("/projects/:id", async (req, res) => {
    const project = await db
      .collection("projects")
      .findOne({ _id: objectId(req.params.id), workspaceId: req.workspaceId });
    if (!project) return res.status(404).json({ error: "Project not found." });
    res.json(project);
  });
  router.post(
    "/projects/:id/recommendations",
    rateLimit({ windowMs: 15 * 60000, limit: 5 }),
    async (req, res) => {
      const weights = weightsSchema.parse(req.body?.weights);
      const project = await db.collection("projects").findOne({
        _id: objectId(req.params.id),
        workspaceId: req.workspaceId,
      });
      if (!project)
        return res.status(404).json({ error: "Project not found." });
      if (
        project.recommendations &&
        JSON.stringify(project.recommendations.weights) ===
          JSON.stringify(weights)
      )
        return res.json(project.recommendations);
      if (!config.key)
        return res.status(503).json({
          error: "Configure the AI provider to assess this workflow.",
        });
      if (assessing.has(req.workspaceId))
        return res.status(409).json({
          error: "A workflow assessment is already running. Please wait.",
        });
      assessing.add(req.workspaceId);
      try {
        const result = await recommendStructures({
          content: project.content,
          weights,
          provider: createProvider(config),
        });
        const updated = await db
          .collection("projects")
          .updateOne(
            { _id: project._id, workspaceId: req.workspaceId },
            { $set: { recommendations: result } },
          );
        if (!updated.matchedCount)
          return res
            .status(404)
            .json({ error: "Source workflow was removed." });
        res.json(result);
      } catch (error) {
        const failure = assessmentFailure(error);
        console.error("Workflow assessment failed:", failure.code);
        res
          .status(failure.status)
          .json({ error: failure.error, code: failure.code });
      } finally {
        assessing.delete(req.workspaceId);
      }
    },
  );
  router.delete("/projects/:id", async (req, res) => {
    await store.deleteProject(req.workspaceId, objectId(req.params.id));
    res.status(204).end();
  });
  router.post("/runs", async (req, res) => {
    if (!config.key)
      return res.status(503).json({
        error: "The server needs an OpenAI API key before running agents.",
      });
    const data = runSchema.parse(req.body);
    res.status(202).json(await store.enqueue(req.workspaceId, data));
  });
  router.get("/runs", async (req, res) => {
    const filter = { workspaceId: req.workspaceId };
    if (req.query.projectId) filter.projectId = objectId(req.query.projectId);
    if (req.query.batchId && typeof req.query.batchId === "string")
      filter.batchId = req.query.batchId.slice(0, 100);
    res.json(
      await db
        .collection("runs")
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
    );
  });
  router.post("/runs/:id/cancel", async (req, res) => {
    res.json(await store.cancel(req.workspaceId, objectId(req.params.id)));
  });
  router.post("/analytics", async (req, res) => {
    const weights = weightsSchema.parse(req.body?.weights);
    if (typeof req.body.batchId !== "string")
      return res.status(400).json({ error: "A comparison batch is required." });
    const runs = await db
      .collection("runs")
      .find({
        workspaceId: req.workspaceId,
        batchId: req.body.batchId.slice(0, 100),
      })
      .toArray();
    res.json({
      rankings: rankRuns(runs, weights),
      completed: runs.filter((r) => r.status === "completed").length,
      total: runs.length,
      method:
        "Quality and purpose-fit are model judgments. Speed is normalized runtime; efficiency is normalized token usage within this batch. Results are not a prediction of business success.",
    });
  });
  router.get("/actions", async (req, res) => {
    const runs = await db
      .collection("runs")
      .find(
        { workspaceId: req.workspaceId, "actions.0": { $exists: true } },
        { projection: { actions: 1 } },
      )
      .limit(100)
      .toArray();
    res.json(
      runs.flatMap((run) =>
        run.actions.map((action) => ({ ...action, runId: run._id })),
      ),
    );
  });
  router.post("/runs/:runId/actions/:id/reject", async (req, res) => {
    const changed = await db.collection("runs").updateOne(
      {
        _id: objectId(req.params.runId),
        workspaceId: req.workspaceId,
        actions: {
          $elemMatch: { _id: objectId(req.params.id), status: "pending" },
        },
      },
      {
        $set: {
          "actions.$.status": "rejected",
          "actions.$.reviewedAt": new Date(),
        },
      },
    );
    if (!changed.matchedCount)
      return res.status(404).json({ error: "Pending action not found." });
    res.json({ status: "rejected" });
  });
  router.post("/runs/:runId/actions/:id/approve", async (req, res) => {
    try {
      res.json(
        await executeStoredAction({
          db,
          client,
          runId: objectId(req.params.runId),
          actionId: objectId(req.params.id),
          workspaceId: req.workspaceId,
          approved: true,
        }),
      );
    } catch (error) {
      res.status(409).json({ error: error.message });
    }
  });
  return router;
}
