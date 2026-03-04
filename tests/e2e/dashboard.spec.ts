import { test, expect } from '@playwright/test';

test.describe('Dashboard UI flow', () => {
    test('renders main dashboard heading', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/Investio/i);
        await expect(page.locator('h1').filter({ hasText: 'Přehled' })).toBeVisible();
    });

    test('can interact with the asset input form', async ({ page }) => {
        await page.goto('/');

        // The input type was changed to "text" to handle custom formatting
        const inputs = page.locator('input[type="text"]');
        await expect(inputs.first()).toBeVisible();

        await inputs.first().fill('100');
        await expect(inputs.first()).toHaveValue('100');
    });

    test('can trigger the Add Ticker modal and add an asset', async ({ page }) => {
        await page.goto('/');

        // Locate the Add Ticker button
        const addButton = page.locator('button').filter({ hasText: /přidat ticker/i });

        // Wait for it to be visible before clicking
        await expect(addButton).toBeVisible();
        await addButton.click();

        // Modal should appear
        const modalHeading = page.getByRole('heading', { name: 'Přidat Ticker' });
        await expect(modalHeading).toBeVisible();

        // Fill in the ticker
        await page.getByPlaceholder('např. VWCE.DE nebo AAPL').fill('AAPL');

        // Wait for submit inside modal
        const submitBtn = page.locator('button[type="submit"]');
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();

        // AAPL should appear on the page (timeout extended for API fetch)
        await expect(page.getByText('AAPL').first()).toBeVisible({ timeout: 10000 });
    });

    test('can toggle dark mode', async ({ page }) => {
        await page.goto('/');

        // Find the toggle button
        const toggleButton = page.locator('button[aria-label="Toggle Theme"]');
        await expect(toggleButton).toBeVisible();

        // Initial state should be light mode (or at least we toggle it once to force a mode)
        await toggleButton.click();

        // Body or html should have class 'dark' and dark styles must apply
        const htmlElement = page.locator('html');
        await expect(htmlElement).toHaveClass(/dark/);

        // Verify visual change inside dashboard (e.g. background color change)
        // Wait for visual test or check styles. DashboardLayout has bg-zinc-950 in dark mode
        const layoutDiv = page.locator('div.min-h-screen').first();
        await expect(layoutDiv).toHaveCSS('background-color', /lab\(2\.5.*|rgb\(9,\s*9,\s*11\)/);
    });
});
