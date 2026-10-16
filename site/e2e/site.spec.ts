import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The expectations come from the generated index, so the tests follow whatever plugins the repo has.
const index = JSON.parse(readFileSync('public/index.json', 'utf8'));
const arts: { id: string; type: string; name: string; plugin: string; description: string; installCommand: string }[] = index.artifacts;
const plugin = arts.find((a) => a.type === 'plugin');
const child = arts.find((a) => a.type !== 'plugin');

test.skip(!plugin, 'no plugins in the repo yet');

test('home shows the real catalog and no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Plugins, skills and agents');
  const cards = page.locator('ul.cards article.card');
  await expect(cards).toHaveCount(arts.length);
  for (const a of arts) await expect(page.getByRole('link', { name: a.name, exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('search narrows results and is stored in the URL', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('ul.cards article.card').first()).toBeVisible();
  const word = plugin!.description.split(/\s+/).find((w) => w.length > 5) ?? plugin!.name;
  await page.getByRole('searchbox', { name: 'Search the marketplace' }).fill(word);
  await expect(page).toHaveURL(/#\/\?q=/);
  await expect(page.locator('ul.cards article.card').first()).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search the marketplace' }).fill('zzzqqqxxx');
  await expect(page.getByRole('heading', { name: /No results for/ })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(page.locator('ul.cards article.card')).toHaveCount(arts.length);
});

test('slash focuses search and Ctrl+K opens the palette', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox', { name: 'Search the marketplace' })).toBeFocused();
  await page.locator('body').click({ position: { x: 5, y: 300 } });
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  await page.keyboard.type(plugin!.name);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`#/(plugin|${plugin!.type})/`));
  await expect(dialog).toBeHidden();
});

test('copy install puts the real command on the clipboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: `Copy install command for ${plugin!.name}`, exact: true }).click();
  await expect(page.getByText('✓ Copied').first()).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(plugin!.installCommand);
});

test('plugin detail shows tabs, includes and permissions', async ({ page }) => {
  await page.goto(`/#/plugin/${encodeURIComponent(plugin!.name)}`);
  await expect(page.getByRole('heading', { level: 1, name: plugin!.name })).toBeVisible();
  await expect(page.locator('code.install-code')).toHaveText(plugin!.installCommand);
  await page.getByRole('tab', { name: /What it includes/ }).click();
  const kids = arts.filter((a) => a.plugin === plugin!.name && a.type !== 'plugin');
  await expect(page.locator('.include-row')).toHaveCount(kids.length);
  await page.getByRole('tab', { name: 'Permissions' }).click();
  await expect(page.getByText('Plugins run with your permissions')).toBeVisible();
  await page.getByRole('tab', { name: 'Compatibility' }).click();
  await expect(page.getByText('Claude Code', { exact: true }).first()).toBeVisible();
});

test('child artifact page links back to its plugin', async ({ page }) => {
  test.skip(!child, 'plugin has no skills, agents or commands yet');
  await page.goto(`/#/${child!.type}/${encodeURIComponent(child!.plugin)}/${encodeURIComponent(child!.name)}`);
  await expect(page.getByRole('heading', { level: 1, name: child!.name })).toBeVisible();
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: child!.plugin }).click();
  await expect(page).toHaveURL(new RegExp(`#/plugin/${child!.plugin}$`));
});

test('unknown address shows the 404 page', async ({ page }) => {
  await page.goto('/#/plugin/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Nothing at this address' })).toBeVisible();
});

test('What\'s new and Get started use the real repo', async ({ page }) => {
  await page.goto('/#/new');
  await expect(page.getByRole('heading', { name: "What's new" }).first()).toBeVisible();
  await page.goto('/#/start');
  await expect(page.getByText(`/plugin marketplace add ${index.marketplace.repo}`)).toBeVisible();
});

test('theme toggle switches and persists', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Switch to light theme/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('narrow screens get a filter sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: /^Filters/ }).click();
  await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Filters' })).toBeHidden();
});
