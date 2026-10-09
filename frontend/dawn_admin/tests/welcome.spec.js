import { test, expect } from "@playwright/test";
test("welcome page provides signup, sign-in, and a responsive sunrise", async ({
  page,
}) => {
  let signedIn = false;
  let signup;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/signup") {
      signup = route.request().postDataJSON();
      signedIn = true;
      return route.fulfill({ status: 201, json: { authenticated: true } });
    }
    if (!signedIn)
      return route.fulfill({
        status: 401,
        json: { error: "Sign in to your workspace." },
      });
    return route.fulfill({
      json: path === "/api/status" ? { providerConfigured: false } : [],
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Give your idea a new dawn." }),
  ).toBeVisible();
  await expect(page.getByRole("img", { name: /Dawn rises/ })).toBeVisible();
  await page.waitForFunction(
    () =>
      Number(getComputedStyle(document.querySelector(".dawn-rise")).opacity) >=
      0.999,
  );
  await page.screenshot({
    path: "/private/tmp/dawn-welcome-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/private/tmp/dawn-welcome-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Create your workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Create your private workspace" }),
  ).toBeVisible();
  await page.getByLabel("Email address").fill("new@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("a-long-private-account-password");
  await page
    .getByRole("button", { name: "Create account & enter workspace" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Choose your ecosystem" }),
  ).toBeVisible();
  expect(signup.email).toBe("new@example.test");
});
test("sign-in errors stay visible and splash keeps orbiting with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 401,
      json: { error: "Invalid email or password." },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email address").fill("new@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("a-long-private-account-password");
  await page
    .getByRole("button", { name: "Sign in", exact: true })
    .last()
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Invalid email or password.",
  );
  expect(
    await page
      .locator(".orbit-arm")
      .first()
      .evaluate((node) => getComputedStyle(node).animationDuration),
  ).toBe("12s");
});

test("entrance is visible and splash continues moving past multiple cycles", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/**", (route) =>
    route.fulfill({ status: 401, json: { error: "Sign in." } }),
  );
  await page.goto("/");
  const word = page.locator(".dawn-rise");
  const entrance = await word.evaluate((node) => {
    const animation = node
      .getAnimations()
      .find((item) => item.animationName === "word-rise");
    animation.pause();
    animation.currentTime = 500;
    return {
      opacity: Number(getComputedStyle(node).opacity),
      transform: getComputedStyle(node).transform,
    };
  });
  expect(entrance.opacity).toBeLessThan(0.5);
  expect(entrance.transform).not.toBe("none");
  const sample = async (time) =>
    page.evaluate((time) => {
      for (const selector of [
        ".dawn-rise",
        ".sunrise-disc",
        ".orbit-arm",
        ".orbit-tool",
      ]) {
        for (const node of document.querySelectorAll(selector)) {
          for (const animation of node.getAnimations()) {
            animation.play();
            animation.currentTime = time;
          }
        }
      }
      return [".dawn-rise", ".sunrise-disc", ".orbit-arm"].map(
        (selector) =>
          getComputedStyle(document.querySelector(selector)).transform,
      );
    }, time);
  const first = await sample(15500);
  const second = await sample(17000);
  first.forEach((transform, index) =>
    expect(transform).not.toBe(second[index]),
  );
  const before = await word.evaluate(
    (node) => getComputedStyle(node).transform,
  );
  await expect
    .poll(() => word.evaluate((node) => getComputedStyle(node).transform))
    .not.toBe(before);
  expect(
    await word.evaluate(
      (node) =>
        node
          .getAnimations()
          .find((item) => item.animationName === "dawn-float")
          .effect.getTiming().iterations,
    ),
  ).toBe(Infinity);
});
