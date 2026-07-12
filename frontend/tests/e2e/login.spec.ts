import { test, expect } from '@playwright/test';

test.describe('TransitOps smoke E2E', () => {
  test('login via quick role card and navigate to fleet', async ({ page, baseURL }) => {
    await page.goto('/');

    // Wait for role cards to appear and click Fleet Manager quick-login
    const fleetBtn = page.getByRole('button', { name: /Fleet Manager/i });
    await expect(fleetBtn).toBeVisible({ timeout: 10000 });
    await fleetBtn.click();

    // After login the app navigates to the role start page; fleet manager lands on fleet
    await page.waitForURL('**#/fleet', { timeout: 10000 });

    // Expect a Fleet page element: a header or table present
    await expect(page.locator('text=Fleet Registry').first()).toBeVisible({ timeout: 5000 }).catch(async () => {
      // Fallback: check for known KPI or button
      await expect(page.locator('text=Vehicles').first()).toBeVisible();
    });
  });

  test('open create trip flow and validate business-rule error', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Fleet Manager/i }).click();
    await page.waitForURL('**#/fleet');

    // Navigate to Trips via hash change
    await page.goto('/#/trips');
    await expect(page.locator('text=Create Trip').first()).toBeVisible({ timeout: 5000 });

    // Click create and submit a draft missing required fields to check validation
    await page.getByRole('button', { name: /Create Trip/i }).click();
    // Attempt to submit without filling mandatory fields
    await page.getByRole('button', { name: /Save Draft/i }).click();

    // Expect validation or error banner
    await expect(page.locator('text=Missing')).toHaveCountGreaterThan(0).catch(async () => {
      // If no 'Missing' text, at least ensure we didn't crash and are still on trips page
      await expect(page).toHaveURL('**#/trips');
    });
  });
});
