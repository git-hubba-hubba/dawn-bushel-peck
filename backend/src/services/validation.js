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
