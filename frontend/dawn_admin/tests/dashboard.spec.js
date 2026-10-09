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
  await page.getByLabel("Concept name").fill("Neighborhood repair service");
  await page
    .getByLabel("Or write your idea")
    .fill("A repair service that connects neighbors.");
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
