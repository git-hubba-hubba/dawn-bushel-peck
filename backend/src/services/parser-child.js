import { extractDocument } from "./ingestion.js";
process.once("message", async (message) => {
  try {
    process.send({
      content: await extractDocument({
        originalname: message.originalname,
        buffer: Buffer.from(message.buffer, "base64"),
      }),
    });
  } catch {
    process.send({ error: "Document extraction failed." });
  }
});
