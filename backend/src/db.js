import { MongoClient } from "mongodb";
export async function connectDatabase(config) {
  const client = new MongoClient(config.uri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  const db = client.db(config.dbName);
  await Promise.all([
    db.collection("accounts").createIndex({ email: 1 }, { unique: true }),
    db
      .collection("sessions")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("projects").createIndex({ workspaceId: 1, createdAt: -1 }),
    db.collection("runs").createIndex({ workspaceId: 1, createdAt: -1 }),
    db
      .collection("runs")
      .createIndex({ status: 1, leaseUntil: 1, createdAt: 1 }),
    db.collection("artifacts").createIndex({ workspaceId: 1, createdAt: -1 }),
  ]);
  return { db, client, close: () => client.close() };
}
