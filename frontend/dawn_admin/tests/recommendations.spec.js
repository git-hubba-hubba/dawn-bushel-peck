import { test, expect } from "@playwright/test";
test("suggestions use the saved idea, appear before choice, and clear after edits", async ({
  page,
}) => {
  const projectId = "a".repeat(24);
  const assessment = {
    objective: "A repair pilot with approved quotes",
    missingRequirements: ["Confirm operator capacity"],
    recommendations: ["agile", "flat", "functional"].map((structureId) => ({
      structureId,
      reason: "Pilot feedback informs delivery.",
      evidence: ["repair pilot"],
      tradeoff: "Keep privacy requirements stable.",
      firstAction: "Confirm required intake fields.",
    })),
  };
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({
      json: path.endsWith("/recommendations")
        ? assessment
        : path === "/api/projects" && route.request().method() === "POST"
          ? { _id: projectId }
          : path === "/api/status"
            ? { providerConfigured: true }
            : [],
    });
  });
  await page.goto("/");
  await page.getByLabel("Or write your idea").fill("A repair pilot");
  await page
    .getByRole("button", { name: "Suggest ecosystems for my idea" })
    .click();
  const suggestions = page.getByRole("region", {
    name: "Suggested ecosystems before selection",
  });
  await expect(
    suggestions.getByText("A repair pilot with approved quotes", {
      exact: true,
    }),
  ).toBeVisible();
  const suggestionsBox = await suggestions.boundingBox();
  const tabsBox = await page
    .getByRole("tablist", { name: "Organizational structures" })
    .boundingBox();
  expect(suggestionsBox.y).toBeLessThan(tabsBox.y);
  await suggestions
    .getByRole("button", { name: "Choose this ecosystem" })
    .first()
    .click();
  await expect(
    page.getByRole("tab", { name: "Agile", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Or write your idea").fill("A tutoring service");
  await expect(
    suggestions.getByText("A repair pilot with approved quotes", {
      exact: true,
    }),
  ).not.toBeVisible();
});

test("assessment runs automatically after typing pauses and ignores a stale response", async ({
  page,
}) => {
  const assessed = [];
  let releaseFirst;
  const held = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/recommendations")) {
      assessed.push(path);
      if (assessed.length === 1) await held;
      return route.fulfill({
        json: {
          objective:
            assessed.length === 1
              ? "Old repair assessment"
              : "New tutoring assessment",
          missingRequirements: [],
          recommendations: ["agile", "flat", "functional"].map(
            (structureId) => ({
              structureId,
              reason: "Source-specific plan",
              evidence: ["Source text"],
              tradeoff: "Review staffing",
              firstAction: "Confirm the intake requirements",
            }),
          ),
        },
      });
    }
    return route.fulfill({
      json:
        path === "/api/projects" && route.request().method() === "POST"
          ? { _id: "a".repeat(24) }
          : path === "/api/status"
            ? { providerConfigured: true }
            : [],
    });
  });
  await page.goto("/");
  await page.getByLabel("Or write your idea").fill("A repair service pilot");
  await expect.poll(() => assessed.length).toBe(1);
  await expect(page.getByLabel("Or write your idea")).toBeEnabled();
  await page.getByLabel("Or write your idea").fill("A tutoring service pilot");
  releaseFirst();
  await expect.poll(() => assessed.length).toBe(2);
  await expect(
    page.getByText("New tutoring assessment", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Old repair assessment", { exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Top structures", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ecosystem studio", exact: true })
    .click();
  expect(assessed.length).toBe(2);
});
test("automatic assessment exposes a distinct failure and retries only when requested", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/recommendations")) {
      calls++;
      return route.fulfill({
        status: 503,
        json: {
          code: "provider_access",
          error: "The AI provider rejected access.",
        },
      });
    }
    return route.fulfill({
      json:
        path === "/api/projects" && route.request().method() === "POST"
          ? { _id: "a".repeat(24) }
          : path === "/api/status"
            ? { providerConfigured: true }
            : [],
    });
  });
  await page.goto("/");
  await page.getByLabel("Or write your idea").fill("A repair service pilot");
  await expect(page.getByRole("alert")).toContainText("provider access");
  expect(calls).toBe(1);
  await page
    .getByRole("button", { name: "Retry ecosystem assessment" })
    .click();
  await expect.poll(() => calls).toBe(2);
});

test("evidence guide suggests idea-specific details and reassesses only user-entered facts", async ({
  page,
}) => {
  const saved = [];
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/projects" && route.request().method() === "POST") {
      saved.push(route.request().postDataJSON());
      return route.fulfill({ json: { _id: "a".repeat(24) } });
    }
    if (path.endsWith("/recommendations"))
      return route.fulfill({
        json: {
          objective: "Repair pilot",
          missingRequirements: ["Confirm who operates the repair queue."],
          recommendations: ["agile", "flat", "functional"].map(
            (structureId) => ({
              structureId,
              reason: "Pilot scope",
              evidence: ["A repair pilot"],
              tradeoff: "Review staffing",
              firstAction: "Confirm intake",
            }),
          ),
        },
      });
    return route.fulfill({
      json: path === "/api/status" ? { providerConfigured: true } : [],
    });
  });
  await page.goto("/");
  await page.getByLabel("Or write your idea").fill("A repair pilot");
  const guide = page.getByRole("region", {
    name: "Grounded evidence suggestions",
  });
  await expect(
    guide.getByRole("heading", { name: "What counts as grounded evidence?" }),
  ).toBeVisible();
  await expect(
    guide.getByText("Confirm who operates the repair queue.", { exact: true }),
  ).toBeVisible();
  await guide.getByText("Passages used from your idea (1)").click();
  await expect(guide.locator("blockquote")).toHaveText("A repair pilot");
  await guide.getByRole("button", { name: "Add evidence to my idea" }).click();
  await guide
    .getByLabel("Available resources", { exact: true })
    .fill("One operator is available; the hosting provider is unknown.");
  await guide.getByRole("button", { name: "Add details & reassess" }).click();
  await expect.poll(() => saved.length).toBe(2);
  expect(saved[1].content).toContain(
    "One operator is available; the hosting provider is unknown.",
  );
  expect(saved[1].content).not.toContain("Example only:");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("studio priorities carry through to all seven executions and the complete ranking", async ({
  page,
}) => {
  const ids = [
    "flat",
    "functional",
    "divisional",
    "agile",
    "matrix",
    "network",
    "decentralized",
  ];
  const projectId = "b".repeat(24),
    batchId = "c".repeat(24);
  let submitted;
  const runs = ids.map((structureId, index) => ({
    _id: String(index),
    projectId,
    batchId,
    structureId,
    status: "completed",
  }));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    let json = [];
    if (path === "/api/status") json = { providerConfigured: true };
    if (path === "/api/projects" && route.request().method() === "POST")
      json = { _id: projectId };
    if (path.endsWith("/recommendations"))
      json = {
        objective: "A neighborhood repair service",
        missingRequirements: [],
        recommendations: ids
          .slice(0, 3)
          .map((structureId) => ({
            structureId,
            reason: "A fit for the saved brief",
            evidence: ["neighborhood"],
            tradeoff: "Confirm capacity",
            firstAction: "Define the pilot",
          })),
      };
    if (path === "/api/runs" && route.request().method() === "POST") {
      submitted = route.request().postDataJSON();
      json = { batchId };
    } else if (path === "/api/runs") json = submitted ? runs : [];
    if (path === "/api/analytics")
      json = {
        completed: 7,
        total: 7,
        method: "Test fixture: measured usage and AI evaluation are separate.",
        rankings: ids.map((structureId, index) => ({
          id: String(index),
          structureId,
          score: 90 - index,
          quality: 80,
          purposeFit: 85,
          reasoning: "Fit for the pilot",
          evidence: [],
          metrics: {
            durationMs: 1000 + index,
            inputTokens: 100,
            outputTokens: 50,
          },
        })),
      };
    return route.fulfill({ json });
  });
  await page.goto("/");
  await page.getByRole("slider", { name: "quality weight" }).fill("75");
  await page
    .getByLabel("Or write your idea")
    .fill("A neighborhood repair service");
  await expect(
    page.getByRole("heading", { name: "Flat ecosystem", exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Compare all 7 structures", exact: true })
    .click();
  await expect
    .poll(() => submitted)
    .toEqual({
      projectId,
      structures: ids,
      weights: { quality: 75, speed: 50, efficiency: 50 },
    });
  await page.getByRole("button", { name: "View comparison results" }).click();
  const table = page.getByRole("table", {
    name: "All completed structure rankings",
  });
  await expect(table.getByRole("row")).toHaveCount(8);
  await expect(
    table.getByRole("rowheader", { name: "7. Decentralized" }),
  ).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "quality weight" }),
  ).toHaveValue("75");
});
