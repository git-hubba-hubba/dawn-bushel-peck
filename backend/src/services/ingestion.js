import { PDFParse } from "pdf-parse";
import { extractDocx } from "./docx.js";
export async function extractDocument(file) {
  const extension = file.originalname.split(".").pop()?.toLowerCase();
  let content;
  if (["txt", "md"].includes(extension)) {
    if (file.buffer.includes(0))
      throw new Error("Text file contains binary data.");
    content = new TextDecoder("utf-8", { fatal: true }).decode(file.buffer);
  } else if (extension === "pdf") {
    if (file.buffer.subarray(0, 5).toString() !== "%PDF-")
      throw new Error("File is not a PDF.");
    const parser = new PDFParse({ data: file.buffer });
    try {
      content = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } else if (extension === "docx") {
    if (file.buffer.subarray(0, 2).toString() !== "PK")
      throw new Error("File is not a DOCX archive.");
    content = await extractDocx(file.buffer);
  } else throw new Error("Supported files: PDF, DOCX, TXT, Markdown.");
  if (!content?.trim())
    throw new Error(
      "No readable text found. Scanned PDFs require OCR, which is not configured.",
    );
  if (content.length > 80000)
    throw new Error(
      "Extracted content exceeds 80,000 characters. Split the document.",
    );
  return content.trim();
}
