import { expect, test } from "@playwright/test";

const legs = [
  ["B5, Plank Meadow"],
  ["B4, Hay Flap", "C4, Mill Turn"],
  [
    "B2, Pike Corner",
    "C2, The Washout",
    "D2, Crook Bend",
    "B3, Stile Field",
    "B3, Stile Field",
    "D3, Owl Copse",
  ],
  ["D1, Scree Stair", "D1, Scree Stair", "D2, Crook Bend", "D2, Crook Bend"],
];

test("join all four trails, walk to the summit and start again", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?e2e");
  await page.waitForFunction(() => !document.getElementById("arrival"), null, { timeout: 90000 });
  await page.getByRole("button", { name: "Skip the guide", exact: true }).click();
  const first = page.getByRole("button", { name: /^B5, Plank Meadow,/ });
  await first.focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("button", { name: /^B4, Hay Flap,/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(first).toBeFocused();
  // Four turns in one event loop must return home, with all four moves counted.
  await first.evaluate((button: HTMLButtonElement) => {
    for (let i = 0; i < 4; i++) button.click();
  });
  await expect(
    page.getByRole("button", { name: "Find a way through first", exact: true }),
  ).toBeDisabled();
  for (const [index, moves] of legs.entries()) {
    await expect(page.getByText(`Leg ${index + 1} of 4`, { exact: true })).toBeVisible();
    for (const [at, move] of moves.entries()) {
      const part = page.getByRole("button", { name: new RegExp(`^${move},`) });
      if (index === 0 || (index === 1 && at === 0)) {
        await part.focus();
        await page.keyboard.press(index === 0 ? "Enter" : "Space");
      } else await part.click();
    }
    const setOff = page.getByRole("button", { name: "Set off along the trail →", exact: true });
    await expect(setOff).toBeEnabled();
    await setOff.evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    if (index < 3)
      await expect(page.getByText(`Leg ${index + 2} of 4`, { exact: true })).toBeVisible();
  }
  const ending = page.getByRole("dialog", { name: "A very small detour", exact: true });
  await expect(ending).toBeVisible();
  await expect(ending).toContainText("4.0 km");
  await expect(ending).toContainText("turned 17 hinges");
  const replay = page.getByRole("button", { name: "Fold the map and start again", exact: true });
  await expect(replay).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(replay).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(replay).toBeFocused();
  await expect(page.locator(".model-host")).toHaveAttribute("inert", "");
  await expect(page.getByLabel("Expedition kit", { exact: true })).toHaveAttribute("inert", "");
  await replay.click();
  await expect(page.getByText("Leg 1 of 4", { exact: true })).toBeVisible();
  await expect(first).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Find a way through first", exact: true }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
});

test("changing reduced motion completes an active opening and walk", async ({ page }) => {
  await page.goto("/?e2e&intro");
  await page.waitForFunction(() => !document.getElementById("arrival"), null, { timeout: 90000 });
  await page.getByRole("button", { name: "Unfold the map", exact: true }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-opening", "glide");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".app-shell")).toHaveAttribute("data-opening", "done", {
    timeout: 1500,
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: /^B5, Plank Meadow,/ }).click();
  await page.getByRole("button", { name: "Set off along the trail →", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByText("Leg 2 of 4", { exact: true })).toBeVisible({ timeout: 1500 });
  await page.getByRole("button", { name: /^B4, Hay Flap,/ }).click();
  await expect(page.getByLabel("Trail guide", { exact: true })).toHaveCount(0);
});

test.describe("touch layouts", () => {
  test.use({ hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 568, height: 320 },
  ]) {
    test(`${viewport.width}x${viewport.height}: unfold, turn and walk`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/?e2e&intro");
      await page.waitForFunction(() => !document.getElementById("arrival"), null, {
        timeout: 90000,
      });
      const begin = page.getByRole("button", { name: "Unfold the map", exact: true });
      await expect(page.locator(".sound-toggle")).toBeHidden();
      await expect(page.locator(".model-host")).toHaveAttribute("inert", "");
      await begin.scrollIntoViewIfNeeded();
      await begin.tap();
      await expect(page.getByLabel("Trail guide", { exact: true })).toBeVisible();
      const guideBox = await page.getByLabel("Trail guide", { exact: true }).boundingBox();
      const soundBox = await page.getByRole("button", { name: "Sound", exact: true }).boundingBox();
      expect(guideBox && soundBox && guideBox.y >= soundBox.y + soundBox.height).toBe(true);
      await page.screenshot({ path: `test-results/guide-${viewport.width}.png` });
      await page.getByRole("button", { name: /^B5, Plank Meadow,/ }).tap();
      await expect(page.getByLabel("Trail guide", { exact: true })).toContainText("2/3");
      await page.getByRole("button", { name: "Set off along the trail →", exact: true }).tap();
      await expect(page.getByText("Leg 2 of 4", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Trail guide", { exact: true })).toContainText("3/3");
      await page.getByRole("button", { name: /^B4, Hay Flap,/ }).tap();
      await expect(page.getByLabel("Trail guide", { exact: true })).toHaveCount(0);
      await page.screenshot({ path: `test-results/touch-${viewport.width}.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
    });
  }
});
