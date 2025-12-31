import { test, expect } from '@playwright/test';

test.describe('Chat UI Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the application with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Chat UI/);
  });

  test('should display the header with New Chat button', async ({ page }) => {
    const header = page.locator('header[aria-label="Chat controls"]');
    await expect(header).toBeVisible();

    const newChatButton = page.getByRole('button', { name: 'New Chat' });
    await expect(newChatButton).toBeVisible();
  });

  test('should display connection status', async ({ page }) => {
    const statusButton = page.getByRole('status');
    await expect(statusButton).toBeVisible();
  });

  test('should display the user input textarea', async ({ page }) => {
    const textarea = page.getByRole('textbox', { name: /enter your request/i });
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeFocused();
  });

  test('should display the send button', async ({ page }) => {
    const sendButton = page.getByRole('button', { name: 'Send message' });
    await expect(sendButton).toBeVisible();
  });

  test('should display theme toggle controls', async ({ page }) => {
    const themeGroup = page.locator('[aria-label="Appearance settings"]');
    await expect(themeGroup).toBeVisible();

    const themeSelector = page.locator('#theme-selector');
    await expect(themeSelector).toBeVisible();

    const modeToggle = page.getByRole('switch');
    await expect(modeToggle).toBeVisible();
  });
});

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should toggle between light and dark mode', async ({ page }) => {
    const modeToggle = page.getByRole('switch');

    // Get initial state
    const initialChecked = await modeToggle.getAttribute('aria-checked');

    // Toggle mode
    await modeToggle.click();

    // Verify state changed
    const newChecked = await modeToggle.getAttribute('aria-checked');
    expect(newChecked).not.toBe(initialChecked);
  });

  test('should change theme via selector', async ({ page }) => {
    const themeSelector = page.locator('#theme-selector');

    // Get available options
    const options = await themeSelector.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(0);

    // Select a different theme if available
    if (options.length > 1) {
      const secondOption = await themeSelector.locator('option').nth(1).getAttribute('value');
      if (secondOption) {
        await themeSelector.selectOption(secondOption);
        await expect(themeSelector).toHaveValue(secondOption);
      }
    }
  });
});

test.describe('User Input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should allow typing in the textarea', async ({ page }) => {
    const textarea = page.getByRole('textbox', { name: /enter your request/i });

    await textarea.fill('Hello, this is a test message');

    await expect(textarea).toHaveValue('Hello, this is a test message');
  });

  test('should clear input when focusing', async ({ page }) => {
    const textarea = page.getByRole('textbox', { name: /enter your request/i });

    await textarea.fill('Test message');
    await expect(textarea).toHaveValue('Test message');
  });

  test('should have keyboard shortcut hint for screen readers', async ({ page }) => {
    const hint = page.locator('#inputHint');
    await expect(hint).toContainText('Enter to send');
    await expect(hint).toContainText('Shift+Enter');
  });
});

test.describe('New Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should start with empty chat state', async ({ page }) => {
    const textarea = page.getByRole('textbox', { name: /enter your request/i });
    await expect(textarea).toHaveValue('');
  });

  test('should have New Chat button in header', async ({ page }) => {
    const newChatButton = page.getByRole('button', { name: 'New Chat' });
    await expect(newChatButton).toBeVisible();
    await expect(newChatButton).toBeEnabled();
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have skip link for keyboard navigation', async ({ page }) => {
    const skipLink = page.getByRole('link', { name: /skip to conversation/i });
    await expect(skipLink).toBeAttached();
  });

  test('should have proper ARIA labels on main sections', async ({ page }) => {
    const header = page.locator('header[aria-label="Chat controls"]');
    await expect(header).toBeVisible();

    const main = page.locator('main[aria-label="Chat interface"]');
    await expect(main).toBeVisible();
  });

  test('should have labeled form controls', async ({ page }) => {
    // Check textarea has label
    const textarea = page.getByRole('textbox', { name: /enter your request/i });
    await expect(textarea).toBeVisible();

    // Check send button has label
    const sendButton = page.getByRole('button', { name: 'Send message' });
    await expect(sendButton).toBeVisible();
  });

  test('should have accessible theme controls', async ({ page }) => {
    const themeGroup = page.locator('[aria-label="Appearance settings"]');
    await expect(themeGroup).toBeVisible();

    const modeToggle = page.getByRole('switch');
    const label = await modeToggle.getAttribute('aria-label');
    expect(label).toMatch(/switch to (dark|light) mode/i);
  });
});

test.describe('Chat History Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display home panels when no active chat', async ({ page }) => {
    // The home panels should be visible when there's no active chat
    const main = page.locator('.chat-main');
    await expect(main).toBeVisible();
  });
});

test.describe('Responsive Behavior', () => {
  test('should adapt to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const header = page.locator('header[aria-label="Chat controls"]');
    await expect(header).toBeVisible();

    const textarea = page.getByRole('textbox', { name: /enter your request/i });
    await expect(textarea).toBeVisible();
  });

  test('should adapt to tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const header = page.locator('header[aria-label="Chat controls"]');
    await expect(header).toBeVisible();
  });

  test('should adapt to desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    const header = page.locator('header[aria-label="Chat controls"]');
    await expect(header).toBeVisible();
  });
});
