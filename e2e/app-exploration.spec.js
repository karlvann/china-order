import { test, expect } from '@playwright/test';

test.describe('China Order Machine App Exploration', () => {
  test('should load the app and explore all views', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Take a screenshot of the initial state
    await page.screenshot({ path: 'screenshots/01-initial-load.png', fullPage: true });
    console.log('📸 Screenshot 1: Initial load');

    // Check that the page title is correct
    await expect(page).toHaveTitle(/China Order System/);

    // Look for the navigation tabs
    const tabs = await page.locator('button').filter({ hasText: /Builder|Forecast|Calendar/ }).all();
    console.log(`Found ${tabs.length} navigation tabs`);

    // Explore Builder View (should be default)
    console.log('\n🔍 Exploring Builder View...');
    await page.screenshot({ path: 'screenshots/02-builder-view.png', fullPage: true });

    // Look for key sections in Builder view
    const builderSections = [
      'Container Size',
      'Spring Inventory',
      'Component Inventory',
      'Your Order',
      'Export Order'
    ];

    for (const section of builderSections) {
      const heading = page.getByText(section, { exact: false });
      if (await heading.count() > 0) {
        console.log(`  ✓ Found section: ${section}`);
      }
    }

    // Try to expand/interact with Container Size section
    const containerSection = page.getByText('Container Size').first();
    if (await containerSection.isVisible()) {
      await containerSection.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/03-container-size-expanded.png', fullPage: true });
    }

    // Switch to Forecast view if available
    const forecastTab = page.locator('button').filter({ hasText: 'Forecast' }).first();
    if (await forecastTab.count() > 0) {
      console.log('\n🔍 Switching to Forecast View...');
      await forecastTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/04-forecast-view.png', fullPage: true });
      console.log('📸 Screenshot 4: Forecast view');
    }

    // Switch to ForecastV2 view if available
    const forecastV2Tab = page.locator('button').filter({ hasText: /Forecast.*V2|Timeline/ }).first();
    if (await forecastV2Tab.count() > 0) {
      console.log('\n🔍 Switching to Forecast V2 View...');
      await forecastV2Tab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/05-forecast-v2-view.png', fullPage: true });
      console.log('📸 Screenshot 5: Forecast V2 view');
    }

    // Switch to Calendar view if available
    const calendarTab = page.locator('button').filter({ hasText: 'Calendar' }).first();
    if (await calendarTab.count() > 0) {
      console.log('\n🔍 Switching to Calendar View...');
      await calendarTab.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/06-calendar-view.png', fullPage: true });
      console.log('📸 Screenshot 6: Calendar view');
    }

    // Go back to Builder view
    const builderTab = page.locator('button').filter({ hasText: 'Builder' }).first();
    if (await builderTab.count() > 0) {
      console.log('\n🔍 Back to Builder View...');
      await builderTab.click();
      await page.waitForTimeout(500);
    }

    // Try to interact with Spring Inventory table
    console.log('\n🔍 Exploring Spring Inventory...');
    const springInventoryHeading = page.getByText('Spring Inventory').first();
    if (await springInventoryHeading.isVisible()) {
      await springInventoryHeading.click();
      await page.waitForTimeout(500);

      // Look for input fields
      const inputs = await page.locator('input[type="number"]').all();
      console.log(`  Found ${inputs.length} number inputs in inventory table`);

      if (inputs.length > 0) {
        // Fill in a sample inventory value
        await inputs[0].fill('50');
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'screenshots/07-inventory-filled.png', fullPage: true });
        console.log('📸 Screenshot 7: Inventory with sample data');
      }
    }

    // Check for Your Order section
    console.log('\n🔍 Checking Your Order section...');
    const yourOrderHeading = page.getByText('Your Order').first();
    if (await yourOrderHeading.isVisible()) {
      await yourOrderHeading.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/08-your-order.png', fullPage: true });
      console.log('📸 Screenshot 8: Your Order section');
    }

    // Final screenshot
    await page.screenshot({ path: 'screenshots/09-final-state.png', fullPage: true });
    console.log('📸 Screenshot 9: Final state');

    console.log('\n✅ Exploration complete! Check the screenshots/ directory for images.');
  });

  test('should check responsive layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/mobile-view.png', fullPage: true });
    console.log('📱 Mobile viewport screenshot taken');

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/tablet-view.png', fullPage: true });
    console.log('📱 Tablet viewport screenshot taken');

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/desktop-view.png', fullPage: true });
    console.log('🖥️  Desktop viewport screenshot taken');
  });
});
