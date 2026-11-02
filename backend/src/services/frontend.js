import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const buildDirectory = fileURLToPath(
  new URL("../../../frontend/dawn_admin/dist/", import.meta.url),
);

export function serveFrontend(app, directory = buildDirectory) {
  const index = join(directory, "index.html");
  if (!existsSync(index))
    throw new Error(
      "Frontend build missing. Run npm run build before starting production.",
    );
  // Only the compiled public directory is served, never the repository or backend.
  app.use(express.static(directory, { dotfiles: "deny", index: false }));
  app.get("/{*path}", (req, res, next) => {
    // Missing API endpoints and assets must not turn into a successful HTML response.
    if (
      req.path === "/api" ||
      req.path.startsWith("/api/") ||
      /\.[^/]+$/.test(req.path) ||
      !req.accepts("html")
    )
      return next();
    res.set("Cache-Control", "no-cache").sendFile(index);
  });
}
