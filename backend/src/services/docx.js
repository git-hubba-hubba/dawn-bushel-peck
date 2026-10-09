import yauzl from "yauzl";
import { SaxesParser } from "saxes";
export function extractDocx(buffer) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      buffer,
      { lazyEntries: true, validateEntrySizes: true },
      (error, zip) => {
        if (error) return reject(error);
        let entries = 0,
          settled = false;
        const finish = (failure, text) => {
          if (settled) return;
          settled = true;
          zip.close();
          failure ? reject(failure) : resolve(text);
        };
        zip.on("error", (error) => finish(error));
        zip.on("end", () => finish(new Error("DOCX document XML missing.")));
        zip.on("entry", (entry) => {
          if (++entries > 1000)
            return finish(new Error("Archive has too many entries."));
          if (entry.fileName !== "word/document.xml") {
            zip.readEntry();
            return;
          }
          if (entry.uncompressedSize > 5 * 1024 * 1024)
            return finish(new Error("DOCX text exceeds extraction limit."));
          zip.openReadStream(entry, (error, stream) => {
            if (error) return finish(error);
            let size = 0;
            const chunks = [];
            stream.on("error", (error) => finish(error));
            stream.on("data", (chunk) => {
              size += chunk.length;
              if (size > 5 * 1024 * 1024) {
                stream.destroy();
                finish(new Error("DOCX decompression limit exceeded."));
              } else chunks.push(chunk);
            });
            stream.on("end", () => {
              if (settled) return;
              try {
                const parser = new SaxesParser({ xmlns: true }),
                  parts = [];
                let inText = false;
                parser.on("doctype", () => {
                  throw new Error("Document types are prohibited.");
                });
                parser.on("error", (error) => {
                  throw error;
                });
                parser.on("opentag", (tag) => {
                  if (tag.local === "t") inText = true;
                  if (tag.local === "tab") parts.push("\t");
                });
                parser.on("text", (text) => {
                  if (inText) parts.push(text);
                });
                parser.on("closetag", (tag) => {
                  if (tag.local === "t") inText = false;
                  if (tag.local === "p") parts.push("\n");
                });
                parser
                  .write(
                    new TextDecoder("utf-8", { fatal: true }).decode(
                      Buffer.concat(chunks),
                    ),
                  )
                  .close();
                finish(null, parts.join(""));
              } catch (error) {
                finish(error);
              }
            });
          });
        });
        zip.readEntry();
      },
    );
  });
}
