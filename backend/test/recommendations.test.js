import { test } from "node:test";
import assert from "node:assert/strict";
import { recommendStructures } from "../src/services/recommendations.js";
import {
  recommendationSchema,
  roadmapSchema,
} from "../src/services/validation.js";
import {
  demoRoadmap,
  demoWorkflow,
} from "../../frontend/dawn_admin/src/demo/workflow.js";
const output = {
  objective: "Repair pilot",
  missingRequirements: ["Staffing"],
  recommendations: ["agile", "flat", "functional"].map((structureId) => ({
    structureId,
    reason: "A narrow pilot.",
    evidence: ["repair pilot"],
    tradeoff: "Coordination",
    firstAction: "Confirm intake fields.",
  })),
};
test("pre-selection recommendations require evidence from this idea", async () => {
  const provider = async () => ({
    output,
    model: "test",
    usage: { inputTokens: 1, outputTokens: 2 },
  });
  const result = await recommendStructures({
    content: "A repair pilot",
    weights: { quality: 50, speed: 50, efficiency: 50 },
    provider,
  });
  assert.equal(result.recommendations.length, 3);
  await assert.rejects(
    recommendStructures({
      content: "A school tutoring concept",
      weights: {},
      provider,
    }),
    /evidence/,
  );
  assert.equal(
    recommendationSchema.safeParse({
      ...output,
      recommendations: [
        output.recommendations[0],
        output.recommendations[0],
        output.recommendations[2],
      ],
    }).success,
    false,
  );
});
test("roadmaps allow parallel work but reject impossible dependency schedules", () => {
  assert.equal(roadmapSchema.safeParse(demoRoadmap).success, true);
  assert.ok(
    demoRoadmap.every((task) =>
      demoWorkflow.content.includes(task.sourceEvidence),
    ),
  );
  const invalid = structuredClone(demoRoadmap);
  invalid[1].startDay = 1;
  assert.equal(roadmapSchema.safeParse(invalid).success, false);
  const cycle = structuredClone(demoRoadmap);
  cycle[0].dependsOn = [cycle.at(-1).id];
  assert.equal(roadmapSchema.safeParse(cycle).success, false);
});

test("source references resolve to original text and reject invented passage IDs", async () => {
  const { evidenceSources } =
    await import("../src/services/recommendations.js");
  const content =
    "A repair pilot\nwith customer approval and private contact details. ".repeat(
      30,
    );
  assert.equal(
    evidenceSources(content)
      .map((source) => source.text)
      .join(""),
    content,
  );
  const provider = async ({ input, evidenceIds }) => {
    const sources = JSON.parse(input).evidenceSources;
    assert.deepEqual(
      evidenceIds,
      sources.map((source) => source.id),
    );
    return {
      output: {
        ...output,
        recommendations: output.recommendations.map((item) => ({
          ...item,
          evidence: ["S2"],
        })),
      },
      usage: {},
      model: "test",
    };
  };
  const result = await recommendStructures({ content, weights: {}, provider });
  assert.equal(
    result.recommendations[0].evidence[0],
    evidenceSources(content)[1].text,
  );
  await assert.rejects(
    recommendStructures({
      content,
      weights: {},
      provider: async () => ({
        output: {
          ...output,
          recommendations: output.recommendations.map((item) => ({
            ...item,
            evidence: ["S999"],
          })),
        },
      }),
    }),
    (error) => error.code === "ungrounded_evidence",
  );
});
test("assessment errors distinguish provider access from grounding without leaking provider messages", async () => {
  const { assessmentFailure } =
    await import("../src/services/recommendations.js");
  for (const [status, code] of [
    [401, "provider_access"],
    [403, "provider_access"],
    [429, "provider_limit"],
    [404, "provider_model"],
    [400, "provider_request"],
    [500, "provider_unavailable"],
  ]) {
    const failure = assessmentFailure({
      status,
      message: "sensitive-provider-message",
    });
    assert.equal(failure.code, code);
    assert.ok(!failure.error.includes("sensitive-provider-message"));
  }
  assert.equal(
    assessmentFailure({ code: "ungrounded_evidence" }).code,
    "ungrounded_evidence",
  );
  assert.equal(
    assessmentFailure({ code: "invalid_output" }).code,
    "invalid_output",
  );
  assert.equal(
    assessmentFailure(new Error("database details")).code,
    "assessment_failed",
  );
});
