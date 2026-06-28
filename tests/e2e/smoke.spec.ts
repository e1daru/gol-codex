import { expect, test } from "@playwright/test";

test("display renders the Life canvas and QR panel", async ({ page }) => {
  await page.goto("/display");

  await expect(page.getByLabel("Conway's Game of Life display")).toBeVisible();
  await expect(page.getByLabel("Submission QR code")).toBeVisible();
});

test("submit route renders the name form on mobile", async ({ page }) => {
  await page.goto("/submit");

  await expect(page.getByRole("heading", { name: "Join the wall" })).toBeVisible();
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
});
