import OpenAI from "openai";
import {
  recommendationSchema,
  recommendationJsonSchema,
  reportSchema,
  evaluationSchema,
  outputJsonSchema,
  evaluationJsonSchema,
} from "./validation.js";
export function createProvider(config) {
  const client = new OpenAI({
    apiKey: config.key,
    timeout: 180000,
    maxRetries: 1,
  });
  return async ({
    instructions,
    input,
    evaluate = false,
    recommend = false,
    evidenceIds,
    signal,
    onProgress,
  }) => {
    const assessmentSchema = structuredClone(recommendationJsonSchema);
    if (evidenceIds?.length)
      assessmentSchema.properties.recommendations.items.properties.evidence.items.enum =
        evidenceIds;
    const stream = client.responses.stream(
      {
        model: evaluate ? config.evaluator : config.model,
        store: false,
        instructions,
        input,
        reasoning: { effort: "high" },
        max_output_tokens: 16000,
        text: {
          format: {
            type: "json_schema",
            name: recommend
              ? "structure_recommendations"
              : evaluate
                ? "evaluation"
                : "agent_report",
            strict: true,
            schema: recommend
              ? assessmentSchema
              : evaluate
                ? evaluationJsonSchema
                : outputJsonSchema,
          },
        },
      },
      { signal },
    );
    let preview = "",
      lastUpdate = 0;
    for await (const event of stream) {
      if (event.type === "response.output_text.delta" && onProgress) {
        preview = (preview + event.delta).slice(0, 24000);
        if (Date.now() - lastUpdate >= 1000) {
          await onProgress(preview);
          lastUpdate = Date.now();
        }
      }
    }
    const result = await stream.finalResponse();
    if (result.status !== "completed" || !result.output_text)
      throw Object.assign(
        new Error("Provider did not complete a structured response."),
        { code: "incomplete_response" },
      );
    let output;
    try {
      output = (
        recommend
          ? recommendationSchema
          : evaluate
            ? evaluationSchema
            : reportSchema
      ).parse(JSON.parse(result.output_text));
    } catch {
      throw Object.assign(new Error("Provider output failed validation."), {
        code: "invalid_output",
      });
    }
    return {
      output,
      usage: {
        inputTokens: result.usage?.input_tokens || 0,
        outputTokens: result.usage?.output_tokens || 0,
      },
      model: result.model,
    };
  };
}
