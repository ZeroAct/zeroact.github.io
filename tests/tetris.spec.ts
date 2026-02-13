import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";

function ensureOutputDir() {
  fs.mkdirSync("output/playwright", { recursive: true });
}

async function expectNoHorizontalScroll(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth > el.clientWidth + 1;
  });
  expect(hasOverflow).toBeFalsy();
}

test.describe("Tetris", () => {
  test("layout is sane", async ({ page }) => {
    await page.goto("/tetris/");
    await page.waitForLoadState("networkidle");

    await expectNoHorizontalScroll(page);

    const boardWrap = page.locator('[data-testid="tetris-board-wrap"]');
    const aside = page.locator('[data-testid="tetris-aside"]');
    const nextPreview = page.locator('[data-testid="tetris-next"]');

    await expect(boardWrap).toBeVisible();
    await expect(aside).toBeVisible();
    await expect(nextPreview).toBeVisible();

    // Ensure sidebar doesn't exceed board height (it should scroll internally).
    const [boardBox, asideBox] = await Promise.all([
      boardWrap.boundingBox(),
      aside.boundingBox(),
    ]);
    expect(boardBox).not.toBeNull();
    expect(asideBox).not.toBeNull();

    if (boardBox && asideBox) {
      expect(asideBox.height).toBeLessThanOrEqual(boardBox.height + 2);
    }

    ensureOutputDir();
    await page.screenshot({ path: "output/playwright/tetris.png", fullPage: true });
  });

  test("home has Tetris card", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expectNoHorizontalScroll(page);
    await expect(page.getByRole("link", { name: /tetris sprint/i })).toBeVisible();

    ensureOutputDir();
    await page.screenshot({ path: "output/playwright/home.png", fullPage: true });
  });
});

test.describe("Requests", () => {
  test("requests page loads", async ({ page }) => {
    await page.goto("/requests/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /requests/i })).toBeVisible();
    await page.screenshot({ path: "output/playwright/requests.png", fullPage: true });
  });
});
