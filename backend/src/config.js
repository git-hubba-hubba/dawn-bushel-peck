export function loadConfig(env = process.env) {
  if (!env.MONGODB_URI) throw new Error("MONGODB_URI is required.");
  if (!env.WORKSPACE_PASSWORD || env.WORKSPACE_PASSWORD.length < 16)
    throw new Error("WORKSPACE_PASSWORD must have at least 16 characters.");
  const origin = new URL(env.APP_ORIGIN || "http://localhost:5173").origin;
  if (env.NODE_ENV === "production" && !origin.startsWith("https://"))
    throw new Error("Production APP_ORIGIN must use HTTPS.");
  const trustProxyHops = Number(env.TRUST_PROXY_HOPS || 0);
  if (
    !Number.isInteger(trustProxyHops) ||
    trustProxyHops < 0 ||
    trustProxyHops > 5
  )
    throw new Error("TRUST_PROXY_HOPS must be an integer between 0 and 5.");
  const price = (key) =>
    env[key]?.trim() &&
    Number.isFinite(Number(env[key])) &&
    Number(env[key]) >= 0
      ? Number(env[key])
      : null;
  return {
    uri: env.MONGODB_URI,
    dbName: env.MONGODB_DB || "dawn",
    password: env.WORKSPACE_PASSWORD,
    origin,
    production: env.NODE_ENV === "production",
    port: Number(env.PORT || 4000),
    host: env.HOST || (env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
    trustProxyHops,
    key: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL || "gpt-6-astra",
    evaluator: env.OPENAI_EVALUATOR_MODEL || "gpt-6-astra",
    inputPrice: price("INPUT_PRICE_PER_MILLION"),
    outputPrice: price("OUTPUT_PRICE_PER_MILLION"),
  };
}
