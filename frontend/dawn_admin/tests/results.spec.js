import { test, expect } from "@playwright/test";
test("completed run presents outcome and next actions before optional agent detail", async ({
  page,
}) => {
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const run = {
      _id: "run",
      structureId: "flat",
      status: "completed",
      batchId: "batch",
      report: {
        summary: "Pilot scope is ready for review.",
        deliverable: "Implement intake and quote approval.",
        decisions: ["Exclude payments from the pilot."],
        nextSteps: ["Confirm the hosting target."],
        risks: ["Staffing is unresolved."],
      },
      metrics: {
        durationMs: 12000,
        inputTokens: 100,
        outputTokens: 200,
        handoffs: 3,
        costUsd: null,
      },
      evaluation: {
        quality: 80,
        purposeFit: 85,
        reasoning: "The narrow pilot supports direct coordination.",
        evidence: ["One neighborhood."],
      },
      stepState: {
        owner: {
          id: "owner",
          role: "CEO / Owner",
          status: "completed",
          output: {
            summary: "Owner contribution.",
            deliverable: "Review staffing.",
          },
        },
      },
    };
    return route.fulfill({
      json:
        path === "/api/status"
          ? { providerConfigured: false }
          : path === "/api/runs"
            ? [run]
            : [],
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Workflow results" }),
  ).toBeVisible();
  await expect(
    page.getByText("Pilot scope is ready for review."),
  ).toBeVisible();
  await expect(page.getByText("Confirm the hosting target.")).toBeVisible();
  await expect(page.getByText("Owner contribution.")).not.toBeVisible();
  await page.getByText("Read the full deliverable", { exact: true }).click();
  await expect(
    page.getByText("Implement intake and quote approval."),
  ).toBeVisible();
  await page.getByText("Risks & unresolved requirements (1)").click();
  await expect(page.getByText("Staffing is unresolved.")).toBeVisible();
  await page.getByText("Inspect agent contributions & handoffs").click();
  await page.locator(".result-activity .step-list summary").click();
  await expect(page.getByText("Owner contribution.")).toBeVisible();
});
