import { ObjectId } from "mongodb";
import { randomUUID } from "node:crypto";
export class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function runStore(db, client) {
  const transaction = (task) =>
    client.withSession((session) =>
      session.withTransaction(() => task(session)),
    );
  return {
    enqueue(workspaceId, data) {
      return transaction(async (session) => {
        const projectId = new ObjectId(data.projectId);
        const touched = await db
          .collection("projects")
          .updateOne(
            { _id: projectId, workspaceId },
            { $inc: { revision: 1 } },
            { session },
          );
        if (!touched.matchedCount)
          throw new RequestError(404, "Project not found.");
        const slots = await db
          .collection("limits")
          .findOneAndUpdate(
            { _id: workspaceId, active: { $lte: 14 - data.structures.length } },
            { $inc: { active: data.structures.length } },
            { session, returnDocument: "after" },
          );
        if (!slots)
          throw new RequestError(
            429,
            "The workspace queue is full. Wait for current runs to finish.",
          );
        const batchId = randomUUID(),
          runs = data.structures.map((structureId) => ({
            _id: new ObjectId(),
            workspaceId,
            projectId,
            structureId,
            batchId,
            weights: data.weights,
            status: "queued",
            steps: [],
            createdAt: new Date(),
            attempt: 0,
          }));
        await db.collection("runs").insertMany(runs, { session });
        return { batchId, runs };
      });
    },
    cancel(workspaceId, id) {
      return transaction(async (session) => {
        const run = await db
          .collection("runs")
          .findOneAndUpdate(
            { _id: id, workspaceId, status: { $in: ["queued", "running"] } },
            { $set: { status: "cancelled", finishedAt: new Date() } },
            { session, returnDocument: "after" },
          );
        if (!run) throw new RequestError(409, "Run is not cancellable.");
        await db
          .collection("limits")
          .updateOne(
            { _id: workspaceId },
            { $inc: { active: -1 } },
            { session },
          );
        return run;
      });
    },
    deleteProject(workspaceId, projectId) {
      return transaction(async (session) => {
        const project = await db
          .collection("projects")
          .findOneAndDelete({ _id: projectId, workspaceId }, { session });
        if (!project) throw new RequestError(404, "Project not found.");
        const filter = { projectId, workspaceId },
          active = await db
            .collection("runs")
            .countDocuments(
              { ...filter, status: { $in: ["queued", "running"] } },
              { session },
            );
        await db.collection("runs").deleteMany(filter, { session });
        await db.collection("artifacts").deleteMany(filter, { session });
        if (active)
          await db
            .collection("limits")
            .updateOne(
              { _id: workspaceId },
              { $inc: { active: -active } },
              { session },
            );
      });
    },
    finish(filter, workspaceId, fields) {
      return transaction(async (session) => {
        const result = await db
          .collection("runs")
          .updateOne(
            { ...filter, status: "running" },
            {
              $set: { ...fields, finishedAt: new Date() },
              $unset: { leaseUntil: "" },
            },
            { session },
          );
        if (result.matchedCount)
          await db
            .collection("limits")
            .updateOne(
              { _id: workspaceId },
              { $inc: { active: -1 } },
              { session },
            );
        return result.matchedCount > 0;
      });
    },
  };
}
