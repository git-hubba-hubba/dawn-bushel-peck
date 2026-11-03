import { z } from "zod";
import { structureById } from "../../../shared/structures.js";
export const weightsSchema = z
  .object({
    quality: z.number().min(0).max(100),
    speed: z.number().min(0).max(100),
    efficiency: z.number().min(0).max(100),
  })
  .strict()
  .refine(
    (w) => w.quality + w.speed + w.efficiency > 0,
    "At least one weight must be positive.",
  );
export const projectSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    content: z.string().trim().min(1).max(80000),
  })
  .strict();
export const projectUpdateSchema = z
  .object({
    name: projectSchema.shape.name.optional(),
    selectedStructure: z.enum(Object.keys(structureById)).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0);
export const runSchema = z
  .object({
    projectId: z.string().regex(/^[a-f0-9]{24}$/),
    structures: z
      .array(z.enum(Object.keys(structureById)))
      .min(1)
      .max(7)
      .refine((ids) => new Set(ids).size === ids.length),
    weights: weightsSchema,
  })
  .strict();
export const reportSchema = z
  .object({
    summary: z.string().max(16000),
    deliverable: z.string().max(22000),
    decisions: z.array(z.string().max(2000)).max(20),
    risks: z.array(z.string().max(2000)).max(20),
    nextSteps: z.array(z.string().max(2000)).max(20),
    roadmap: z.lazy(() => roadmapSchema).optional(),
    missingRequirements: z.array(z.string().max(1000)).max(12).optional(),
    actions: z
      .array(
        z
          .object({
            tool: z.string().max(100),
            description: z.string().max(2000),
            payload: z.string().max(5000),
          })
          .strict(),
      )
      .max(10),
  })
  .strict();
export const evaluationSchema = z
  .object({
    quality: z.number().min(0).max(100),
    purposeFit: z.number().min(0).max(100),
    reasoning: z.string().max(8000),
    evidence: z.array(z.string().max(2000)).max(12),
  })
  .strict();
export const outputJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    deliverable: { type: "string" },
    decisions: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    nextSteps: { type: "array", items: { type: "string" } },
    actions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          tool: { type: "string" },
          description: { type: "string" },
          payload: { type: "string" },
        },
        required: ["tool", "description", "payload"],
      },
    },
  },
  required: [
    "summary",
    "deliverable",
    "decisions",
    "risks",
    "nextSteps",
    "actions",
  ],
};
export const evaluationJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    quality: { type: "number" },
    purposeFit: { type: "number" },
    reasoning: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
  },
  required: ["quality", "purposeFit", "reasoning", "evidence"],
};

export const roadmapStepSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,50}$/),
    title: z.string().min(1).max(180),
    action: z.string().min(1).max(2000),
    example: z.string().min(1).max(2000),
    owner: z.string().min(1).max(180),
    startDay: z.number().int().min(1).max(3650),
    endDay: z.number().int().min(1).max(3650),
    dependsOn: z.array(z.string().max(50)).max(20),
    acceptance: z.string().min(1).max(2000),
    sourceEvidence: z.string().min(1).max(2000),
    assumption: z.string().max(2000),
  })
  .strict();
export const roadmapSchema = z
  .array(roadmapStepSchema)
  .max(20)
  .superRefine((steps, ctx) => {
    const ids = new Set(steps.map((step) => step.id));
    if (ids.size !== steps.length)
      ctx.addIssue({ code: "custom", message: "Duplicate roadmap IDs." });
    for (const step of steps) {
      if (step.endDay < step.startDay)
        ctx.addIssue({ code: "custom", message: "Invalid day range." });
      for (const dependency of step.dependsOn) {
        const prior = steps.find((item) => item.id === dependency);
        if (!prior || prior.endDay >= step.startDay)
          ctx.addIssue({
            code: "custom",
            message: "Dependencies must finish before this task starts.",
          });
      }
    }
  });
export const recommendationSchema = z
  .object({
    objective: z.string().min(1).max(2000),
    missingRequirements: z.array(z.string().min(1).max(1000)).max(12),
    recommendations: z
      .array(
        z
          .object({
            structureId: z.enum(Object.keys(structureById)),
            reason: z.string().min(1).max(2000),
            evidence: z.array(z.string().min(1).max(1000)).min(1).max(4),
            tradeoff: z.string().min(1).max(2000),
            firstAction: z.string().min(1).max(2000),
          })
          .strict(),
      )
      .length(3)
      .refine(
        (items) => new Set(items.map((item) => item.structureId)).size === 3,
      ),
  })
  .strict();
export const recommendationJsonSchema = z.toJSONSchema(recommendationSchema);
delete recommendationJsonSchema.$schema;
export const roadmapJsonSchema = z.toJSONSchema(z.array(roadmapStepSchema));
delete roadmapJsonSchema.$schema;
outputJsonSchema.properties.roadmap = roadmapJsonSchema;
outputJsonSchema.properties.missingRequirements = {
  type: "array",
  items: { type: "string" },
};
outputJsonSchema.required.push("roadmap", "missingRequirements");
