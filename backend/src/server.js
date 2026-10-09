import { loadConfig } from "./config.js";
import { connectDatabase } from "./db.js";
import { createApp } from "./app.js";
const config = loadConfig(),
  { db, client, close } = await connectDatabase(config);
await db
  .collection("limits")
  .updateOne(
    { _id: "owner" },
    { $setOnInsert: { active: 0 } },
    { upsert: true },
  );
const app = createApp({ db, client, config });
const server = app.listen(config.port, config.host, () =>
  console.log(`Dawn API listening on ${config.host}:${config.port}`),
);
async function shutdown() {
  server.close();
  await close();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
