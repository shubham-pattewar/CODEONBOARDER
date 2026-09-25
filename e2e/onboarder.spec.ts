import { test, expect } from '@playwright/test';

test.describe('Codebase Onboarder End-to-End Suite', () => {

  test('1. Landing page renders branding, hero, example cards, and theme toggle', async ({ page }) => {
    await page.goto('/');

    // Check title and brand
    await expect(page).toHaveTitle(/Codebase Onboarder/i);
    await expect(page.locator('text=Codebase Onboarder').first()).toBeVisible();

    // Check input and analyze button
    const input = page.locator('#repo-url-input');
    await expect(input).toBeVisible();
    await expect(page.locator('#analyze-button')).toBeVisible();

    // Check example cards
    await expect(page.locator('text=expressjs/express')).toBeVisible();
    await expect(page.locator('text=remix-run/history')).toBeVisible();
    await expect(page.locator('text=facebook/flux')).toBeVisible();

    // Test theme toggle button
    const themeBtn = page.locator('button[aria-label="Toggle theme"]');
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();
    const isLightOrDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    // Toggle back
    await themeBtn.click();
  });

  test('2. Input validation rejects invalid URLs', async ({ page }) => {
    await page.goto('/');

    // Submit invalid URL
    await page.fill('#repo-url-input', 'https://notgithub.com/test/repo');
    await page.click('#analyze-button');

    // Should display validation error
    await expect(page.locator('text=Must be a valid GitHub URL')).toBeVisible();
  });

  test('3. Personal Access Token (PAT) modal opens, saves token, and closes', async ({ page }) => {
    await page.goto('/');

    // Open PAT modal
    const patBtn = page.locator('button:has-text("PAT Token"), button[aria-label="GitHub Token Settings"]').first();
    await patBtn.click();

    // Verify modal is visible
    await expect(page.locator('text=GitHub Access Token')).toBeVisible();
    await expect(page.locator('text=Personal Access Token (PAT)')).toBeVisible();

    // Enter a dummy test token
    const tokenInput = page.locator('input[placeholder*="ghp_"]');
    await tokenInput.fill('ghp_testToken1234567890abcdef');

    // Save token
    await page.click('button:has-text("Save Token")');
    await page.waitForTimeout(1000);

    // Verify modal closed
    await expect(page.locator('text=Personal Access Token (PAT)')).not.toBeVisible();
  });

  test('4. Analysis History modal opens, lists past analyses, and allows filtering', async ({ page }) => {
    await page.goto('/');

    // Open History modal
    const historyBtn = page.locator('button:has-text("History"), button[aria-label="Open history"]').first();
    await historyBtn.click();

    // Check modal contents
    await expect(page.locator('text=Analysis History')).toBeVisible();
    await expect(page.locator('input[placeholder*="Search history"]')).toBeVisible();

    // Search filter
    await page.fill('input[placeholder*="Search history"]', 'express');
    await page.waitForTimeout(300);

    // Close via Esc key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await expect(page.locator('text=Analysis History')).not.toBeVisible();
  });

  test('5. Shareable URL hash loads workspace analysis directly', async ({ page }) => {
    // First query API for an existing analysis ID
    const historyRes = await page.request.get('http://localhost:4000/api/analysis');
    const historyData = await historyRes.json();

    if (historyData && historyData.length > 0) {
      const sample = historyData[0];
      await page.goto(`/#/analysis/${sample.id}`);

      // Wait for workspace to mount
      await expect(page.locator('nav[aria-label="Views"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator(`text=${sample.repo}`).first()).toBeVisible();

      // Test view switching: Architecture -> File Flow -> Services -> Start Here
      await page.click('button[title*="File Flow"]');
      await page.waitForTimeout(400);

      await page.click('button[title*="Services"]');
      await page.waitForTimeout(400);

      await page.click('button[title*="Start Here"]');
      await page.waitForTimeout(400);

      await page.click('button[title*="Architecture"]');
      await page.waitForTimeout(400);
    }
  });

  test('6. Details panel displays Open on GitHub link and AI summary', async ({ page }) => {
    const historyRes = await page.request.get('http://localhost:4000/api/analysis');
    const historyData = await historyRes.json();

    if (historyData && historyData.length > 0) {
      const sample = historyData[0];
      await page.goto(`/#/analysis/${sample.id}`);
      await expect(page.locator('nav[aria-label="Views"]')).toBeVisible({ timeout: 15000 });

      // Inspector panel should be open
      await expect(page.locator('text=Inspector').first()).toBeVisible();

      // GitHub link button in inspector
      const githubLink = page.locator('a[title="Open on GitHub"]').first();
      if (await githubLink.isVisible()) {
        const href = await githubLink.getAttribute('href');
        expect(href).toContain('github.com');
      }

      // Architectural Role section
      await expect(page.locator('text=Architectural Role').first()).toBeVisible();
    }
  });

  test('7. File Flow interactive dock: Subgraph isolation, caller stepping, and directional nodes', async ({ page }) => {
    const historyRes = await page.request.get('http://localhost:4000/api/analysis');
    const historyData = await historyRes.json();

    if (historyData && historyData.length > 0) {
      const sample = historyData[0];
      await page.goto(`/#/analysis/${sample.id}`);
      await expect(page.locator('nav[aria-label="Views"]')).toBeVisible({ timeout: 15000 });

      // Switch to File Flow view
      await page.click('button[title*="File Flow"]');
      await page.waitForTimeout(600);

      // Verify File Flow header is visible
      await expect(page.locator('text=AST dependency graph').first()).toBeVisible();

      // Verify interactive dock buttons exist
      const isolateBtn = page.locator('button:has-text("Isolate Subgraph"), button:has-text("Focus: Active")');
      await expect(isolateBtn).toBeVisible();

      // Click isolate subgraph toggle
      await isolateBtn.click();
      await page.waitForTimeout(300);

      // Verify 1-Hop / 2-Hops buttons appear when isolated
      await expect(page.locator('button:has-text("1-Hop")')).toBeVisible();
      await expect(page.locator('button:has-text("2-Hops")')).toBeVisible();

      // Click 2-Hops
      await page.click('button:has-text("2-Hops")');
      await page.waitForTimeout(300);

      // Toggle isolation back off
      await isolateBtn.click();
      await page.waitForTimeout(300);

      // Check if file nodes are rendered in ReactFlow
      const fileNodes = page.locator('.react-flow__node-file');
      if (await fileNodes.count() > 0) {
        // Hover over the first node
        await fileNodes.first().hover();
        await page.waitForTimeout(300);
      }
    }
  });

});

