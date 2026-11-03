import { test, expect } from "@playwright/test";
const names = [
  "Flat",
  "Functional",
  "Divisional",
  "Agile",
  "Matrix",
  "Network",
  "Decentralized",
];
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Sign in to your workspace." }),
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the ecosystems" }).click();
});
test("every structure renders its own diagram and information", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const name of names) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: `${name} ecosystem`, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", {
        name: new RegExp(`${name} organizational diagram`),
      }),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("comparisons and analytics show honest empty states", async ({ page }) => {
  await page
    .getByRole("button", { name: "Top structures", exact: true })
    .click();
  await expect(page.getByText("No performance data yet")).toBeVisible();
  await page.getByRole("slider", { name: "quality weight" }).fill("75");
  await expect(
    page.getByRole("slider", { name: "quality weight" }),
  ).toHaveValue("75");
});
test("unconfigured execution is gated and input remains editable", async ({
  page,
}) => {
  await page.getByLabel("Workflow name").fill("Neighborhood repair service");
  await page
    .getByLabel("Or write your idea")
    .fill("A repair service that connects neighbors.");
  await page.getByText("Or run one ecosystem", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Run through ecosystem" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Compare all 7 structures" }),
  ).toBeDisabled();
  await expect(page.getByText("41 / 80,000 characters")).toBeVisible();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByLabel("Or write your idea")).toHaveValue("");
});
test("desktop and mobile layouts fit their viewport", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "/private/tmp/dawn-dashboard-desktop.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Matrix", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Matrix ecosystem" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/private/tmp/dawn-dashboard-mobile.png",
    fullPage: true,
  });
});

test("ecosystem carousel supports arrows, keyboard and horizontal scrolling with visible advantages", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const carousel = page.getByRole("region", { name: "Ecosystem carousel" });
  await expect(
    carousel.getByRole("button", { name: "Previous ecosystem" }),
  ).toBeDisabled();
  await carousel.getByRole("button", { name: "Next ecosystem" }).click();
  await expect(
    page.getByRole("tab", { name: "Functional", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    carousel.getByRole("heading", { name: "Depth by discipline" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Functional", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Divisional", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(
    page.getByRole("heading", { name: "Decentralized ecosystem", exact: true }),
  ).toBeVisible();
  await expect(
    carousel.getByRole("button", { name: "Next ecosystem" }),
  ).toBeDisabled();
  await page
    .locator(".ecosystem-viewport")
    .evaluate((track) =>
      track.scrollTo({ left: 3 * track.clientWidth, behavior: "instant" }),
    );
  await expect(
    page.getByRole("tab", { name: "Agile", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    carousel.getByRole("heading", { name: "Feedback before commitment" }),
  ).toBeVisible();
  await expect(
    carousel.getByRole("heading", { name: "What this structure gives you" }),
  ).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
