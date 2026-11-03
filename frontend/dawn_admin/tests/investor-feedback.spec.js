import { test, expect } from "@playwright/test";
const projectId = "d".repeat(24);
const recommendations = {
  objective: "Repair service pilot",
  missingRequirements: [],
  recommendations: ["agile", "flat", "functional"].map((structureId) => ({
    structureId,
    reason: "Small pilot",
    evidence: ["repair service"],
    tradeoff: "Confirm staffing",
    firstAction: "Define intake fields",
  })),
};

test("studio sign-in preserves the idea and opens the account form directly", async ({
  page,
}) => {
  let authenticated = false;
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/signin") authenticated = true;
    if (!authenticated)
      return route.fulfill({ status: 401, json: { error: "Sign in first." } });
    return route.fulfill({
      json:
        path === "/api/status"
          ? { providerConfigured: false, database: "connected" }
          : [],
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the ecosystems" }).click();
  await page.getByLabel("Or write your idea").fill("My repair service");
  const suggest = page.getByRole("button", {
    name: "Suggest ecosystems for my idea",
  });
  await expect(suggest).toBeDisabled();
  await expect(suggest).toHaveAttribute("aria-describedby", /assessment-help/);
  await expect(
    page.getByRole("button", { name: "Compare all 7 structures" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Create account / Sign in" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Email address").fill("member@example.test");
  await dialog
    .getByLabel("Password", { exact: true })
    .fill("a-long-private-password");
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel("Or write your idea")).toHaveValue(
    "My repair service",
  );
});

test("failed assessment stays visible through polling and recovers on explicit retry", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/recommendations")) {
      calls++;
      return calls === 1
        ? route.fulfill({
            status: 503,
            json: {
              code: "provider_access",
              error: "The AI provider rejected access.",
            },
          })
        : route.fulfill({ json: recommendations });
    }
    return route.fulfill({
      json:
        path === "/api/status"
          ? { providerConfigured: true, database: "connected" }
          : path === "/api/projects" && route.request().method() === "POST"
            ? { _id: projectId }
            : [],
    });
  });
  await page.goto("/");
  await expect(page.locator(".sidebar-bottom")).toContainText("unverified");
  await page.getByLabel("Or write your idea").fill("A repair service");
  const result = page.getByRole("region", {
    name: "Suggested ecosystems before selection",
  });
  await expect(result.getByRole("alert")).toContainText("provider access");
  await expect(page.locator(".sidebar-bottom")).toContainText(
    "Latest assessment failed",
  );
  await page.waitForTimeout(4300);
  expect(calls).toBe(1);
  await expect(page.locator(".sidebar-bottom")).toContainText(
    "Latest assessment failed",
  );
  await result.getByRole("button", { name: "Retry assessment here" }).click();
  await expect(result).toContainText("Repair service pilot");
  await expect(page.locator(".sidebar-bottom")).toContainText(
    "Latest assessment succeeded",
  );
});

test("rename and ecosystem agreement update the existing saved workflow", async ({
  page,
}) => {
  const project = {
    _id: projectId,
    name: "Untitled workflow",
    content: "A repair service",
    recommendations,
  };
  const updates = [];
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === "PATCH") {
      const change = route.request().postDataJSON();
      updates.push(change);
      Object.assign(project, change);
      return route.fulfill({ json: change });
    }
    return route.fulfill({
      json:
        path === "/api/status"
          ? { providerConfigured: true, database: "connected" }
          : path === "/api/projects"
            ? [project]
            : path === `/api/projects/${projectId}`
              ? project
              : path.endsWith("/recommendations")
                ? recommendations
                : [],
    });
  });
  await page.goto("/");
  await page.getByLabel("Saved workflows").selectOption(projectId);
  await page.getByLabel("Workflow name").fill("Neighborhood repair");
  await page.getByRole("button", { name: "Save workflow name" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Workflow renamed." }),
  ).toBeVisible();
  expect(updates[0]).toEqual({ name: "Neighborhood repair" });
  await page
    .getByRole("button", { name: "Choose this ecosystem" })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Selected ecosystem" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("status").filter({ hasText: "Selected: Agile ecosystem." }),
  ).toBeVisible();
  expect(updates[1]).toEqual({ selectedStructure: "agile" });
  await page.reload();
  await page.getByLabel("Saved workflows").selectOption(projectId);
  await expect(page.getByLabel("Workflow name")).toHaveValue(
    "Neighborhood repair",
  );
  await expect(
    page.getByRole("tab", { name: "Agile", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("a failed workspace refresh removes the previous connected status", async ({
  page,
}) => {
  let offline = false;
  await page.route("**/api/**", (route) => {
    if (offline) return route.abort();
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({
      json:
        path === "/api/status"
          ? { providerConfigured: true, database: "connected" }
          : [],
    });
  });
  await page.goto("/");
  await expect(page.locator(".sidebar-bottom")).toContainText(
    "MongoDB ping succeeded",
  );
  offline = true;
  await expect(page.locator(".sidebar-bottom")).toContainText(
    "Workspace connection interrupted",
    { timeout: 7000 },
  );
  await expect(page.locator(".sidebar-bottom")).not.toContainText(
    "MongoDB ping succeeded",
  );
  offline = false;
  await expect(page.locator(".sidebar-bottom")).toContainText(
    "MongoDB ping succeeded",
    { timeout: 7000 },
  );
});

test("assessment failure explains exhausted credits and the action needed before retry", async ({
  page,
}) => {
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/recommendations"))
      return route.fulfill({
        status: 503,
        json: {
          code: "provider_credits_empty",
          title: "AI assessment blocked: API credits exhausted",
          error:
            "The AI provider reports that the API organization has no credits remaining.",
          nextStep:
            "The API account owner needs to check the credit balance and add credits in OpenAI API billing. Retry after the balance is available; retrying alone will not restore access.",
        },
      });
    return route.fulfill({
      json:
        path === "/api/status"
          ? { providerConfigured: true, database: "connected" }
          : path === "/api/projects" && route.request().method() === "POST"
            ? { _id: projectId }
            : [],
    });
  });
  await page.goto("/");
  await page.getByLabel("Or write your idea").fill("A repair service");
  const failure = page
    .getByRole("region", { name: "Suggested ecosystems before selection" })
    .getByRole("alert");
  await expect(failure.getByRole("heading")).toHaveText(
    "AI assessment blocked: API credits exhausted",
  );
  await expect(failure).toContainText("Why it failed:");
  await expect(failure).toContainText("no credits remaining");
  await expect(failure).toContainText("What to do:");
  await expect(failure).toContainText("add credits in OpenAI API billing");
  await expect(failure).toContainText("retrying alone will not restore access");
  await expect(
    failure.getByRole("button", { name: "Retry assessment here" }),
  ).toBeEnabled();
});
