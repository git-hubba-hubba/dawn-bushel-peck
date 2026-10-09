import { fork } from "node:child_process";
export function extractIsolated(file) {
  return new Promise((resolve, reject) => {
    const child = fork(new URL("./parser-child.js", import.meta.url), [], {
      execArgv: ["--max-old-space-size=256"],
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    let settled = false;
    const finish = (error, text) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      error ? reject(error) : resolve(text);
    };
    const timer = setTimeout(
      () => finish(new Error("Parsing timed out.")),
      20000,
    );
    child.on("error", (error) => finish(error));
    child.on("exit", () => finish(new Error("Parser exited.")));
    child.on("message", (message) =>
      message.error
        ? finish(new Error(message.error))
        : finish(null, message.content),
    );
    child.send({
      originalname: file.originalname,
      buffer: file.buffer.toString("base64"),
    });
  });
}
