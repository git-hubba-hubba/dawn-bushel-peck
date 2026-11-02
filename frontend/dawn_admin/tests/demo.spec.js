import { test, expect } from "@playwright/test";
test("Demo_Dawn guides a visitor through a workflow without API execution", async ({
  page,
}) => {
  const mutations = [];
  await page.route("**/api/**", (route) => {
    if (route.request().method() !== "GET")
      mutations.push(route.request().url());
    return route.fulfill({ status: 401, json: { error: "Sign in." } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Demo_Dawn", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Neighborhood Repair — pilot launch" }),
  ).toBeVisible();
  const response = await page.request.get("/demo-workflow.md");
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("customer must approve the quote");
  await page.getByRole("button", { name: "Next step" }).click();
  for (const name of [
    "Flat",
    "Functional",
    "Divisional",
    "Agile",
    "Matrix",
    "Network",
    "Decentralized",
  ]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(
      page.getByRole("img", {
        name: new RegExp(`${name} organizational diagram`),
      }),
    ).toBeVisible();
  }
  await page.getByRole("tab", { name: "Flat", exact: true }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.getByRole("button", { name: "Start agent replay" }).click();
  await expect(page.locator(".demo-agent-dot.running")).toHaveCount(3);
  await expect(page.getByRole("status")).toContainText("3 / 4", {
    timeout: 5000,
  });
  await expect(page.getByRole("status")).toContainText("4 / 4", {
    timeout: 5000,
  });
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(
    page.getByRole("heading", { name: "A production-readiness package" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Three illustrative structure recommendations",
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Finish tutorial" }).click();
  await expect(
    page.getByRole("button", { name: "Create your workspace" }),
  ).toBeVisible();
  expect(mutations).toEqual([]);
});

test("demo results separate benefits, deliverables, recommendation evidence and next steps", async ({
  page,
}) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 401, json: { error: "Sign in." } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Demo_Dawn", exact: true }).click();
  await page.getByRole("button", { name: "4. Review results" }).click();
  await expect(
    page.getByRole("region", { name: "Why Dawn is useful" }),
  ).toBeVisible();
  await expect(page.locator(".deliverable-card")).toHaveCount(5);
  await expect(page.locator(".structure-result")).toHaveCount(3);
  await page.getByText("Define what to build", { exact: true }).click();
  await expect(page.getByText(/Request states: submitted/)).toBeVisible();
  await page.screenshot({
    path: "/private/tmp/dawn-demo-results-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/private/tmp/dawn-demo-results-mobile.png",
    fullPage: true,
  });
});

test("virtual walkthrough advances, pauses, replays agent handoffs, and restarts without mutations", async ({
  page,
}) => {
  const mutations = [];
  await page.route("**/api/**", (route) => {
    if (route.request().method() !== "GET")
      mutations.push(route.request().url());
    return route.fulfill({ status: 401, json: { error: "Sign in." } });
  });
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Demo_Dawn", exact: true }).click();
  const tour = page.getByRole("region", {
    name: "Animated virtual walkthrough",
  });
  await tour.getByRole("button", { name: "Play virtual walkthrough" }).click();
  await page.clock.runFor(4000);
  await tour.getByRole("button", { name: "Pause walkthrough" }).click();
  await page.clock.runFor(15000);
  await expect(
    page.getByRole("button", { name: "1. Sample workflow" }),
  ).toHaveAttribute("aria-current", "step");
  await tour.getByRole("button", { name: "Resume walkthrough" }).click();
  async function advanceToChapter(name) {
    await expect
      .poll(
        async () => {
          await page.clock.runFor(1000);
          return page
            .getByRole("button", { name, exact: true })
            .getAttribute("aria-current");
        },
        { intervals: [10], timeout: 10000 },
      )
      .toBe("step");
  }
  await advanceToChapter("2. Choose a structure");
  await expect(tour.locator(".tour-structure-tile")).toHaveCount(7);
  await advanceToChapter("3. Follow agents");
  await expect(tour.locator(".tour-flow-node.running")).not.toHaveCount(0);
  await page.clock.runFor(1800);
  await expect(tour.locator(".tour-flow-node.done")).not.toHaveCount(0);
  await tour.getByRole("button", { name: "Pause walkthrough" }).click();
  const completed = await tour.locator(".tour-flow-node.done").count();
  await page.clock.runFor(5000);
  await expect(tour.locator(".tour-flow-node.done")).toHaveCount(completed);
  await tour.getByRole("button", { name: "Resume walkthrough" }).click();
  await advanceToChapter("4. Review results");
  await page.clock.runFor(13000);
  await expect(
    tour.getByRole("heading", { name: "Agile ecosystem" }),
  ).toBeVisible();
  await expect(
    tour.getByRole("button", { name: "Replay walkthrough" }),
  ).toBeVisible();
  await tour.getByRole("button", { name: "Restart tour" }).click();
  await expect(
    page.getByRole("button", { name: "1. Sample workflow" }),
  ).toHaveAttribute("aria-current", "step");
  await expect(
    tour.getByRole("button", { name: "Pause walkthrough" }),
  ).toBeVisible();
  expect(mutations).toEqual([]);
});

test("walkthrough respects reduced motion and fits mobile in every chapter", async ({
  page,
}) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 401, json: { error: "Sign in." } }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Demo_Dawn", exact: true }).click();
  const tour = page.getByRole("region", {
    name: "Animated virtual walkthrough",
  });
  await expect(tour.locator(".tour-idea-icon")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.screenshot({
    path: "/private/tmp/dawn-walkthrough-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of [
    "1. Sample workflow",
    "2. Choose a structure",
    "3. Follow agents",
    "4. Review results",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "/private/tmp/dawn-walkthrough-mobile.png",
    fullPage: true,
  });
});
