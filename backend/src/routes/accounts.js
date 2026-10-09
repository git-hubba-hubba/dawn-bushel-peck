import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import {
  cookieToken,
  hashToken,
  newToken,
  cookieOptions,
} from "../services/auth.js";
const derive = promisify(scrypt);
const credentials = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(16).max(256),
  })
  .strict();
export function accountRoutes(db, config) {
  const router = Router();
  router.use(rateLimit({ windowMs: 15 * 60000, limit: 10 }));
  async function session(req, res, workspaceId, status = 200) {
    const token = newToken(),
      old = cookieToken(req);
    if (old) await db.collection("sessions").deleteOne({ _id: hashToken(old) });
    await db.collection("sessions").insertOne({
      _id: hashToken(token),
      workspaceId,
      expiresAt: new Date(Date.now() + 8 * 3600000),
    });
    res
      .status(status)
      .cookie("dawn_session", token, cookieOptions(config))
      .json({ authenticated: true });
  }
  router.post("/signup", async (req, res) => {
    const { email, password } = credentials.parse(req.body);
    const salt = randomBytes(16).toString("hex");
    const digest = (await derive(password, salt, 64)).toString("hex");
    let account;
    try {
      account = await db.collection("accounts").insertOne({
        email,
        salt,
        digest,
        createdAt: new Date(),
      });
    } catch (error) {
      if (error.code === 11000)
        return res
          .status(409)
          .json({
            error: "Unable to create this account. Try signing in instead.",
          });
      throw error;
    }
    await session(req, res, account.insertedId.toHexString(), 201);
  });
  router.post("/signin", async (req, res) => {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success)
      return res.status(401).json({ error: "Invalid email or password." });
    const { email, password } = parsed.data;
    const account = await db.collection("accounts").findOne({ email });
    const digest = await derive(
      password,
      account?.salt || "dawn-missing-account",
      64,
    );
    if (
      !account ||
      !timingSafeEqual(digest, Buffer.from(account.digest, "hex"))
    )
      return res.status(401).json({ error: "Invalid email or password." });
    await session(req, res, account._id.toHexString());
  });
  return router;
}
