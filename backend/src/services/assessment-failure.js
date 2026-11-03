// Only trusted categories and authored guidance cross the API boundary.
// Provider messages can contain request data or credentials and are never shown.
const failure = (code, title, error, nextStep, status = 503) => ({
  status,
  code,
  title,
  error,
  nextStep,
});
export function assessmentFailure(error, phase) {
  const code = error.code || error.error?.code;
  if (error.name?.startsWith("Mongo") || phase === "persistence")
    return failure(
      "database_unavailable",
      "Assessment could not be saved",
      "Dawn could not read or save the workflow in MongoDB.",
      "Ask the server operator to check the MongoDB connection and database permissions, then retry. Adding AI credits will not fix a database error.",
    );
  if (code === "credit_balance_exhausted")
    return failure(
      "provider_credits_empty",
      "AI assessment blocked: API credits exhausted",
      "The AI provider reports that the API organization has no credits remaining.",
      "The API account owner needs to check the credit balance and add credits in OpenAI API billing. Retry after the balance is available; retrying alone will not restore access.",
    );
  if (
    [
      "organization_spend_limit_exceeded",
      "project_spend_limit_exceeded",
    ].includes(code)
  ) {
    const scope =
      code === "project_spend_limit_exceeded" ? "project" : "organization";
    return failure(
      "provider_spend_limit",
      "AI assessment blocked: spending limit reached",
      `The AI provider reports that the API ${scope} has reached its spending limit.`,
      `Ask the API account owner to review the ${scope} spending limit or wait for its reset, then retry. Adding credits alone may not resolve this limit.`,
    );
  }
  if (code === "organization_usage_limit_exceeded")
    return failure(
      "provider_usage_limit",
      "AI assessment blocked: API usage limit reached",
      "The API organization has reached its provider-assigned usage limit.",
      "The API account owner needs to request a higher approved usage limit or wait for the limit to reset before retrying.",
    );
  if (
    code === "insufficient_quota" ||
    error.type === "insufficient_quota" ||
    error.error?.type === "insufficient_quota"
  )
    return failure(
      "provider_quota",
      "AI assessment blocked: API quota unavailable",
      "The AI provider reports insufficient quota. This can involve billing, available credits, or an account usage limit; the response does not identify which one.",
      "The API account owner should check OpenAI API billing, remaining credits, and usage limits. Retry after the account issue is resolved.",
    );
  if (["rate_limit_exceeded", "slow_down"].includes(code))
    return failure(
      "provider_rate_limit",
      "AI assessment paused: too many requests",
      "The AI provider is temporarily limiting the request or token rate. This does not establish that API credits are exhausted.",
      "Wait before retrying and reduce concurrent assessments or runs. Follow the provider's Retry-After delay if one is supplied.",
    );
  if (error.status === 429)
    return failure(
      "provider_limit",
      "AI assessment blocked by a provider limit",
      "The AI provider returned a limit error without a specific cause. Dawn cannot tell whether this is temporary throttling or an account quota problem.",
      "Check API billing and usage limits. If they are available, wait and retry; if it continues, ask the server operator to investigate.",
    );
  if (
    [401, 403].includes(error.status) ||
    ["invalid_api_key", "permission_denied"].includes(code)
  )
    return failure(
      "provider_access",
      "AI assessment blocked: provider access rejected",
      "The AI provider rejected the server's credentials or permissions.",
      "Ask the server operator to verify the API key, its project permissions, and access to the configured model. Restart the API after changing server configuration.",
    );
  if (error.status === 404 || code === "model_not_found")
    return failure(
      "provider_model",
      "AI assessment blocked: model unavailable",
      "The configured AI model could not be found or is not available to this API project.",
      "Ask the server operator to check the configured model and the project's model access, then retry.",
    );
  if (
    error.status === 400 ||
    ["invalid_prompt", "data_residency_mismatch"].includes(code)
  )
    return failure(
      "provider_request",
      "AI assessment blocked: request configuration rejected",
      "The AI provider rejected the assessment request or its configuration.",
      "Ask the server operator to check the configured model's supported request settings and project restrictions before retrying.",
      502,
    );
  if (code === "ungrounded_evidence")
    return failure(
      code,
      "Assessment rejected: evidence could not be verified",
      "The AI response cited a passage that does not belong to your idea. Dawn rejected that recommendation.",
      "Retry the assessment. If this repeats, ask the server operator to investigate the generated evidence references.",
      502,
    );
  if (["invalid_output", "incomplete_response"].includes(code))
    return failure(
      code,
      "Assessment incomplete: no valid recommendation returned",
      "The AI provider did not return a complete response in the required format. Dawn did not accept it as a recommendation.",
      "Retry once. If it fails again, ask the server operator to check the provider response and output configuration.",
      502,
    );
  if (error.name === "APIConnectionTimeoutError")
    return failure(
      "provider_timeout",
      "AI assessment timed out",
      "The AI provider did not respond within the request time limit.",
      "Wait and retry. If timeouts continue, ask the server operator to check provider availability and the server's network connection.",
    );
  if (
    error.name === "APIConnectionError" ||
    error.status >= 500 ||
    ["server_error", "vector_store_timeout", "server_is_overloaded"].includes(
      code,
    )
  )
    return failure(
      "provider_unavailable",
      "AI assessment unavailable: provider connection failed",
      "Dawn could not complete the request because the AI provider was unavailable or the connection failed.",
      "Wait and retry. If it continues, ask the server operator to check provider availability and the server's outbound connection.",
    );
  return failure(
    "assessment_failed",
    "Assessment failed: cause not confirmed",
    "Dawn could not complete the assessment, and the available error does not identify a specific cause. This does not confirm a credit or token shortage.",
    "Retry once. If it fails again, give the server operator the error category below so they can investigate the assessment diagnostics.",
    500,
  );
}
