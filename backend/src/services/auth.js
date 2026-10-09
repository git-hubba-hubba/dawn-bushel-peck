import {
  randomBytes,
  createHash,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
export const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");
export function passwordVerifier(password) {
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, 64);
  return (input) => timingSafeEqual(digest, scryptSync(input, salt, 64));
}
export function cookieToken(req) {
  const match = (req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("dawn_session="));
  const token = match?.slice("dawn_session=".length);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export const newToken = () => randomBytes(32).toString("hex");
export const cookieOptions = (config) => ({
  httpOnly: true,
  secure: config.production,
  sameSite: "strict",
  path: "/",
  maxAge: 8 * 60 * 60 * 1000,
});
export function authMiddleware(db) {
  return async (req, res, next) => {
    const token = cookieToken(req);
    const session =
      token &&
      (await db
        .collection("sessions")
        .findOne({ _id: hashToken(token), expiresAt: { $gt: new Date() } }));
    if (!session)
      return res.status(401).json({ error: "Sign in to your workspace." });
    req.workspaceId = session.workspaceId;
    next();
  };
}
export function originMiddleware(config) {
  const allowedOrigins = new Set([config.origin]);
  const configured = new URL(config.origin);
  // Local development may use either loopback hostname; keep scheme and port exact.
  if (
    !config.production &&
    ["localhost", "127.0.0.1", "[::1]"].includes(configured.hostname)
  ) {
    for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
      const local = new URL(configured.origin);
      local.hostname = hostname;
      allowedOrigins.add(local.origin);
    }
  }
  return (req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      !allowedOrigins.has(req.headers.origin)
    )
      return res
        .status(403)
        .json({
          error: config.production
            ? "Request origin is not permitted."
            : "Request origin is not permitted. Open the frontend at the APP_ORIGIN address configured on the server, then restart the API if that setting changed.",
        });
    next();
  };
}
