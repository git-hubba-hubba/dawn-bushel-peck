import express from "express";
import { serveFrontend } from "./services/frontend.js";
import { accountRoutes } from "./routes/accounts.js";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import {
  authMiddleware,
  originMiddleware,
  passwordVerifier,
  cookieToken,
  hashToken,
  newToken,
  cookieOptions,
} from "./services/auth.js";
import { apiRoutes } from "./routes/api.js";
import { RequestError } from "./services/run-store.js";
export function createApp({ db, client, config }) {
  const app = express(),
    verify = passwordVerifier(config.password);
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxyHops || false);
  app.use(helmet(), express.json({ limit: "400kb" }), originMiddleware(config));
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );
  app.use("/api/auth", accountRoutes(db, config));
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.post(
    "/api/auth/login",
    rateLimit({ windowMs: 15 * 60000, limit: 10 }),
    async (req, res) => {
      if (
        typeof req.body?.password !== "string" ||
        req.body.password.length > 256 ||
        !verify(req.body.password)
      )
        return res.status(401).json({ error: "Invalid workspace password." });
      const token = newToken(),
        old = cookieToken(req);
      if (old)
        await db.collection("sessions").deleteOne({ _id: hashToken(old) });
      await db.collection("sessions").insertOne({
        _id: hashToken(token),
        workspaceId: "owner",
        expiresAt: new Date(Date.now() + 8 * 3600000),
      });
      res
        .cookie("dawn_session", token, cookieOptions(config))
        .json({ authenticated: true });
    },
  );
  app.post("/api/auth/logout", async (req, res) => {
    const token = cookieToken(req);
    if (token)
      await db.collection("sessions").deleteOne({ _id: hashToken(token) });
    res.clearCookie("dawn_session", cookieOptions(config)).status(204).end();
  });
  app.use("/api", authMiddleware(db), apiRoutes(db, config, client));
  if (config.production) serveFrontend(app);
  app.use((req, res) => res.status(404).json({ error: "Endpoint not found." }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof RequestError)
      return res.status(error.status).json({ error: error.message });
    if (error.name === "ZodError")
      return res.status(400).json({ error: "Invalid request fields." });
    if (
      error.code === "LIMIT_UNEXPECTED_FILE" ||
      error.code === "LIMIT_FIELD_COUNT"
    )
      return res
        .status(400)
        .json({ error: "Upload exactly one document file." });
    if (error.code === "LIMIT_FILE_SIZE")
      return res
        .status(413)
        .json({ error: "Upload a document smaller than 5 MB." });
    if (error.type === "entity.too.large")
      return res.status(413).json({ error: "Request is too large." });
    if (error instanceof SyntaxError)
      return res.status(400).json({ error: "Invalid JSON." });
    console.error("API request failed:", error.name);
    res.status(500).json({ error: "Request failed. Please try again." });
  });
  return app;
}
