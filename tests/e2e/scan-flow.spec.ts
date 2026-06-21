import { test, expect } from "@playwright/test";

test.describe("BitePrint Coach E2E Flow", () => {
  test("should load home page and navigate to scan page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Scan Your Meal. Understand Your Impact.");
    
    // Find the CTA and click it
    const startButton = page.locator("a", { hasText: "Scan Your Meal" }).first();
    await expect(startButton).toBeVisible();
    await startButton.click();
    await page.waitForURL("**/scan");
    await expect(page.locator("h1")).toContainText("Scan Your Meal");
  });

  test("should complete full scan pipeline: upload -> validate -> result -> dashboard", async ({ page }) => {
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

    // 1. Intercept /api/vision POST
    await page.route("**/api/vision", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          foods: ["Beef (cattle)", "Potato"],
          confidence: 0.95,
        }),
      });
    });

    // 2. Intercept /api/scan POST
    await page.route("**/api/scan", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          scanId: "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
          foods: [
            {
              name: "Beef (cattle)",
              confidence: 1.0,
              portionGrams: 150,
              rawLabel: "Beef (cattle)",
              datasetId: "beef-cattle",
            },
            {
              name: "Potato",
              confidence: 1.0,
              portionGrams: 150,
              rawLabel: "Potato",
              datasetId: "potato",
            },
            {
              name: "Oats",
              confidence: 1.0,
              portionGrams: 50,
              rawLabel: "Oats",
              datasetId: "oats",
            },
          ],
          carbonResult: {
            totalCo2eKg: 9.15,
            totalWaterLiters: 2372,
            grade: "F",
            impactLevel: "high",
            primarySource: "Beef (cattle)",
            reductionPotentialPct: 62,
            breakdown: [
              {
                foodId: "beef-cattle",
                name: "Beef (cattle)",
                co2eKg: 9.0,
                waterLiters: 2310,
                portionKg: 0.15,
                impactLevel: "high",
                source: "Poore & Nemecek (2018)",
              },
              {
                foodId: "potato",
                name: "Potato",
                co2eKg: 0.08,
                waterLiters: 43,
                portionKg: 0.15,
                impactLevel: "low",
                source: "Poore & Nemecek (2018)",
              },
              {
                foodId: "oats",
                name: "Oats",
                co2eKg: 0.07,
                waterLiters: 19,
                portionKg: 0.05,
                impactLevel: "low",
                source: "Poore & Nemecek (2018)",
              },
            ],
            datasetVersion: "1.0.0",
          },
          recommendations: [
            {
              rank: 1,
              swap: {
                fromFoodId: "beef-cattle",
                fromFood: "Beef (cattle)",
                toFoodId: "lentils",
                toFood: "Lentils",
                co2eSavedKg: 8.86,
                waterSavedLiters: 1428,
                reductionPct: 98,
              },
              coachingMessage: "Swap Beef for Lentils to reduce your meal footprint by 98%!",
              monthlyProjectionKg: 265.8,
            },
          ],
          meta: {
            processingMs: 120,
            visionModel: "validated-checklist",
            datasetVersion: "1.0.0",
            timestamp: Date.now(),
          },
        }),
      });
    });

    // 3. Intercept /api/coach POST
    await page.route("**/api/coach", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Great effort scanning! Swapping beef for lentils will dramatically improve your carbon score.",
        }),
      });
    });

    // Go to scan page
    await page.goto("/scan");

    // Upload / drop a fake image file
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.locator("[aria-label='Drop meal photo here or press Enter to browse files']").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "meal.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-jpeg-data"),
    });

    // Check checklist page renders detected foods
    await expect(page.locator("text=Confirm Detected Foods")).toBeVisible();
    await expect(page.locator("text=Beef (cattle)")).toBeVisible();
    await expect(page.locator("text=Potato")).toBeVisible();

    // Add a new food item
    const newInput = page.locator("#new-food-input");
    await newInput.fill("Oats");
    await page.locator("button:has-text('Add')").click();

    // Click "Analyze" to run scoring
    await page.locator("button:has-text('Analyze')").click();

    // Verify Nutrition Label is rendered
    await expect(page.locator("text=Environmental")).toBeVisible();
    await expect(page.locator("text=Nutrition Facts")).toBeVisible();
    await expect(page.locator("text=9.15")).toBeVisible(); // Carbon Footprint
    await expect(page.locator("text=2,372")).toBeVisible(); // Water Footprint
    await expect(page.locator("text=Beef (cattle)").first()).toBeVisible(); // Swap from food
    await expect(page.locator("text=Lentils").first()).toBeVisible(); // Swap to food
    await expect(page.locator("text=Great effort scanning!")).toBeVisible(); // AI coach message

    // Navigate to Dashboard via Navbar link
    await page.locator("nav a:has-text('Dashboard')").click();
    await page.waitForURL("**/dashboard");

    // Verify Dashboard displays scans
    await expect(page.locator("h1")).toContainText("Dashboard");
    await expect(page.locator("text=Recent Meals")).toBeVisible();
    await expect(page.locator("text=Beef (cattle), Potato, Oats")).toBeVisible();
  });
});
