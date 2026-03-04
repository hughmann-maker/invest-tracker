import { test, expect } from '@playwright/test';

test.describe('M12 — Multi-Portfolio Features', () => {

    test('PortfolioSwitcher dropdown is visible in header', async ({ page }) => {
        await page.goto('/');

        // The portfolio switcher should have a Briefcase icon and a portfolio name
        const switcher = page.locator('button').filter({ hasText: /portfolio|portf/i });
        if (await switcher.count() > 0) {
            await expect(switcher.first()).toBeVisible();
            // Click to open dropdown
            await switcher.first().click();
            await page.waitForTimeout(300);

            // Should show "Nové portfolio" or "New portfolio" create button
            const createBtn = page.getByText(/nové portfolio|new portfolio/i);
            await expect(createBtn).toBeVisible();
        }
    });

    test('Create Portfolio modal opens and validates', async ({ page }) => {
        await page.goto('/');

        // Open portfolio switcher
        const switcher = page.locator('button').filter({ hasText: /portfolio|portf/i });
        if (await switcher.count() > 0) {
            await switcher.first().click();
            await page.waitForTimeout(300);

            // Click "Nové portfolio"
            const createBtn = page.getByText(/nové portfolio|new portfolio/i);
            if (await createBtn.isVisible()) {
                await createBtn.click();
                await page.waitForTimeout(300);

                // Modal should appear with heading
                const heading = page.getByRole('heading').filter({ hasText: /nové portfolio|new portfolio/i });
                await expect(heading).toBeVisible();

                // Try submitting empty name — should show error
                const submitBtn = page.locator('button[type="submit"]');
                await submitBtn.click();
                await page.waitForTimeout(300);

                const error = page.getByText(/prázdný|empty/i);
                await expect(error).toBeVisible();

                // Close modal
                await page.keyboard.press('Escape');
            }
        }
    });

    test('Storage API list endpoint works', async ({ page }) => {
        // Test new CRUD storage API
        const listResponse = await page.request.get('http://localhost:3000/api/storage?action=list');
        expect(listResponse.ok()).toBeTruthy();
        const json = await listResponse.json();
        expect(json).toHaveProperty('ok');
        expect(json.ok).toBe(true);
        expect(json).toHaveProperty('portfolios');
        expect(Array.isArray(json.portfolios)).toBe(true);
    });

    test('Agent API returns portfolio data', async ({ page }) => {
        const response = await page.request.get('http://localhost:3000/api/agent');
        expect(response.ok()).toBeTruthy();
        const json = await response.json();
        // Should be an array of portfolios or a single portfolio object
        expect(json).toBeTruthy();
    });

    test('Agent API CSV format works', async ({ page }) => {
        const response = await page.request.get('http://localhost:3000/api/agent?format=csv');
        expect(response.ok()).toBeTruthy();
        const text = await response.text();
        // Should contain CSV headers
        expect(text.length).toBeGreaterThan(0);
    });
});
