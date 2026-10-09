import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractIsolated } from "../src/services/document-parser.js";
import { extractDocx } from "../src/services/docx.js";
test("isolated parser extracts a small DOCX document as text", async () => {
  const buffer = await readFile(
    new URL("./fixtures/concept.docx", import.meta.url),
  );
  assert.match(
    await extractIsolated({ originalname: "concept.docx", buffer }),
    /Neighborhood repair pilot/,
  );
});
test("DOCX XML with document types is rejected", async () => {
  const buffer = await readFile(
    new URL("./fixtures/unsafe.docx", import.meta.url),
  );
  await assert.rejects(extractDocx(buffer));
});
test("binary text and unsupported uploads are rejected", async () => {
  await assert.rejects(
    extractIsolated({
      originalname: "binary.txt",
      buffer: Buffer.from([65, 0, 66]),
    }),
  );
  await assert.rejects(
    extractIsolated({
      originalname: "script.html",
      buffer: Buffer.from("<script>alert(1)</script>"),
    }),
  );
});
