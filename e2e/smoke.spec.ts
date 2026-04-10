import { test, expect } from "@playwright/test";

test.describe("public site", () => {
  test("home page shows hero and primary CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Break Everything/i);
    await expect(
      page.getByRole("heading", { name: /Break Everything/i })
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Browse Tools" })
    ).toBeVisible();
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Tools" })
    ).toBeVisible();
  });

  test("header navigates between Home and Tools", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "Tools" }).click();
    await expect(page).toHaveURL(/\/tools$/);
    await expect(page.getByRole("heading", { name: "All Tools" })).toBeVisible();
    await page.getByRole("navigation").getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("tools page loads seeded tools from API", async ({ page }) => {
    await page.goto("/tools");
    await expect(page.getByRole("heading", { name: "All Tools" })).toBeVisible();
    await expect(page.getByText("PDF Forge").first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("tool detail page shows seeded tool", async ({ page }) => {
    await page.goto("/tools/pdf-forge");
    await expect(page.locator("h1").filter({ hasText: "PDF Forge" })).toBeVisible();
    await expect(page.getByText("About this tool")).toBeVisible();
  });

  test("unknown tool slug returns 404", async ({ page }) => {
    const response = await page.goto("/tools/this-slug-does-not-exist-xyz");
    expect(response?.status()).toBe(404);
  });
});

test.describe("admin", () => {
  test("admin shows login when unauthenticated", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Admin Access" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByPlaceholder("Password")).toBeVisible();
  });

  test("admin login shows dashboard", async ({ page }) => {
    await page.goto("/admin");
    await page.getByPlaceholder("Password").fill("e2e-admin-password");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible({
      timeout: 25_000,
    });
  });
});
