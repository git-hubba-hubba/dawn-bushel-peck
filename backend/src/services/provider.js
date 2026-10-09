import OpenAI from "openai";
import {
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
    signal,
    onProgress,
  }) => {
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
            name: evaluate ? "evaluation" : "agent_report",
            strict: true,
            schema: evaluate ? evaluationJsonSchema : outputJsonSchema,
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
      throw new Error("Provider did not complete a structured response.");
    const output = (evaluate ? evaluationSchema : reportSchema).parse(
      JSON.parse(result.output_text),
    );
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
