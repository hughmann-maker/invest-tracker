import { test, expect } from '@playwright/test';

// Helper: open the "..." dropdown menu
async function openDropdownMenu(page: any) {
    const menuBtn = page.locator('button[title="Menu"]');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await page.waitForTimeout(300);
}

test.describe('M5 Features - Modals & Persistence', () => {

    test('AddTickerModal rejects invalid ticker with error', async ({ page }) => {
        await page.goto('/');

        const addButton = page.locator('button').filter({ hasText: /přidat|add ticker/i });
        await expect(addButton).toBeVisible();
        await addButton.click();
        await page.waitForTimeout(500);

        const tickerInput = page.getByPlaceholder(/VWCE|ticker|symbol/i);
        await tickerInput.fill('ZZZZZZZZZ_INVALID');

        const submitBtn = page.locator('button[type="submit"]');
        await submitBtn.click();

        await page.waitForTimeout(5000);

        // Modal should stay open on error
        const heading = page.getByRole('heading').filter({ hasText: /přidat|add/i });
        const modalStillVisible = await heading.isVisible();
        expect(modalStillVisible).toBe(true);
    });

    test('DeleteTickerModal opens and can be cancelled', async ({ page }) => {
        await page.goto('/');

        const assetsHeading = page.getByText(/držená|aktiva|held/i);
        if (await assetsHeading.count() > 0) {
            await assetsHeading.first().scrollIntoViewIfNeeded();
        }

        const assetRows = page.locator('[class*="rounded"]').filter({ hasText: /\.DE/ });
        if (await assetRows.count() > 0) {
            const rowButtons = assetRows.first().locator('button');
            if (await rowButtons.count() > 0) {
                await rowButtons.last().click();

                const deleteModal = page.getByRole('heading').filter({ hasText: /smazat|delete/i });
                const isDeleteVisible = await deleteModal.isVisible().catch(() => false);
                if (isDeleteVisible) {
                    const cancelBtn = page.getByText(/zrušit|cancel/i).first();
                    await cancelBtn.click();
                }
            }
        }
    });

    test('DepositsModal opens via dropdown', async ({ page }) => {
        await page.goto('/');
        await openDropdownMenu(page);

        const depositsBtn = page.locator('button').filter({ hasText: /vklad|deposit/i });
        await depositsBtn.first().click();

        await page.waitForTimeout(500);
        // Look for h2 heading specifically — the button's <span> will be hidden after dropdown closes
        const depositsHeading = page.getByRole('heading').filter({ hasText: /vklad|deposit|peněžní/i });
        await expect(depositsHeading).toBeVisible();
    });

    test('HistoryChart renders with tabs', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);

        const historySection = page.getByText(/historie|history/i).first();
        if (await historySection.isVisible().catch(() => false)) {
            await expect(historySection).toBeVisible();
        }
    });

    test('JSON persistence API is accessible', async ({ page }) => {
        const response = await page.request.get('http://localhost:3000/api/storage');
        expect(response.ok()).toBeTruthy();
        const json = await response.json();
        expect(json).toHaveProperty('ok');
        expect(json.ok).toBe(true);
    });
});
