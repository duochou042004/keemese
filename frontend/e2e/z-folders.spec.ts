import { test, expect, chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function tutor(page: Page) {
  await page.goto('/'); await page.locator('#ui-language').selectOption('en');
  await page.getByLabel('Username', { exact: true }).fill('tutor'); await page.getByLabel('Password', { exact: true }).fill('Tutor mật khẩu 123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.getByRole('link', { name: 'Content library', exact: true }).click();
  await expect(page.getByLabel('Browse folder')).toBeVisible();
}
async function createFolder(page: Page, name: string, parent = '') {
  await page.getByRole('button', { name: 'New folder', exact: true }).click(); await page.getByLabel('Folder name').fill(name);
  await page.getByLabel('Parent folder').selectOption(parent); await page.getByRole('button', { name: 'Save folder', exact: true }).click();
  await expect(page.getByText('Folder saved.', { exact: true })).toBeVisible(); return await page.getByLabel('Browse folder').inputValue();
}
async function post(page: Page, url: string, body: unknown) {
  return page.evaluate(async ({ url, body }) => {
    const token = (await (await fetch('/api/v1/auth/csrf')).json()).token;
    const response = await fetch('/api/v1' + url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token }, body: JSON.stringify(body) });
    return response.status;
  }, { url, body });
}
test.beforeEach(async ({ request }) => {
  expect((await request.post('http://127.0.0.1:5080/__test/advance', { headers: { 'X-Test-Control': process.env.KEEMESE_UI_CONTROL! } })).ok()).toBeTruthy();
});

test('nested folders organize texts, preserve archived ownership and delete only empty folders', async ({ page }) => {
  await tutor(page); const root = await createFolder(page, 'Tiếng Việt tổ chức'); const child = await createFolder(page, 'Bài học con', root);
  await page.getByRole('link', { name: 'New text content', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill('Folder-owned text'); await page.getByLabel('Teaching text (optional)').fill('Giữ nguyên nội dung');
  await page.getByLabel('Folder', { exact: true }).selectOption(child); await page.getByRole('button', { name: 'Create content', exact: true }).click();
  await expect(page.getByLabel('Folder', { exact: true })).toHaveValue(child);
  await page.getByRole('button', { name: 'Archive content', exact: true }).click(); await page.getByRole('button', { name: 'Confirm archive' }).click();
  await page.getByRole('link', { name: '← Content library' }).click(); await page.getByLabel('Browse folder').selectOption(child);
  await expect(page.getByRole('link', { name: 'Folder-owned text' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Archived content', exact: true }).click(); await expect(page.getByRole('link', { name: 'Folder-owned text' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit folder', exact: true }).click(); await page.getByRole('button', { name: 'Delete folder', exact: true }).click(); await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByRole('alert')).toContainText('active or archived content'); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('link', { name: 'Folder-owned text' }).click(); await page.getByRole('button', { name: 'Restore content' }).click();
  await page.getByLabel('Folder', { exact: true }).selectOption(''); await page.getByRole('button', { name: 'Save changes' }).click(); await expect(page.getByRole('status')).toContainText('Changes saved');
  await page.getByRole('link', { name: '← Content library' }).click(); await page.getByLabel('Browse folder').selectOption(child); await page.getByRole('button', { name: 'Edit folder', exact: true }).click();
  await page.getByLabel('Folder name').fill('Renamed child'); await page.getByLabel('Parent folder').selectOption(''); await page.getByRole('button', { name: 'Save folder', exact: true }).click();
  await expect(page.getByLabel('Browse folder')).toContainText('Renamed child');
  await page.getByRole('button', { name: 'Edit folder', exact: true }).click(); await page.getByRole('button', { name: 'Delete folder', exact: true }).click(); await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByText('Folder deleted.', { exact: true })).toBeVisible();
  await page.getByLabel('Browse folder').selectOption(root); await page.getByRole('button', { name: 'Edit folder', exact: true }).click(); await page.getByRole('button', { name: 'Delete folder', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel confirmation' }).click(); await expect(page.getByRole('button', { name: 'Confirm delete' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete folder', exact: true }).click(); await page.getByRole('button', { name: 'Confirm delete' }).click();
  await page.getByLabel('Browse folder').selectOption('unfiled'); await expect(page.getByRole('link', { name: 'Folder-owned text' })).toBeVisible();
});

test('folder failures and stale updates keep bilingual drafts until explicit reload; editor assignment is preserved', async ({ page }) => {
  await tutor(page); const id = await createFolder(page, 'Concurrent folder');
  await page.getByRole('button', { name: 'Edit folder', exact: true }).click(); await page.getByLabel('Folder name').fill('Unsaved Vietnamese bản nháp');
  await page.route(`**/api/v1/content/folders/${id}`, route => route.abort()); await page.getByRole('button', { name: 'Save folder', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Cannot reach'); await expect(page.getByLabel('Folder name')).toHaveValue('Unsaved Vietnamese bản nháp'); await page.unrouteAll({ behavior: 'wait' });
  expect(await post(page, `/content/folders/${id}`, { name: 'Other tab', parentId: null, version: 1 })).toBe(200);
  await page.getByRole('button', { name: 'Save folder', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Your draft is kept');
  const calls: string[] = []; page.on('request', request => { if (request.url().includes('/api/')) calls.push(request.url()); });
  await page.locator('#ui-language').selectOption('vi'); await expect(page.getByRole('alert')).toContainText('Bản nháp'); await expect(page.getByLabel('Tên thư mục')).toHaveValue('Unsaved Vietnamese bản nháp'); expect(calls).toEqual([]);
  await page.locator('#ui-language').selectOption('en'); await page.getByRole('button', { name: 'Reload folder', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel confirmation' }).click(); await expect(page.getByLabel('Folder name')).toHaveValue('Unsaved Vietnamese bản nháp');
  await page.getByRole('button', { name: 'Reload folder', exact: true }).click(); await page.getByRole('button', { name: 'Discard edits and reload' }).click(); await expect(page.getByLabel('Folder name')).toHaveValue('Other tab');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('link', { name: 'New text content', exact: true }).click(); await page.getByLabel('Title', { exact: true }).fill('Draft with folder'); await page.getByLabel('Folder', { exact: true }).selectOption(id);
  await page.route('**/api/v1/content', route => route.abort()); await page.getByRole('button', { name: 'Create content', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Cannot reach'); await expect(page.getByLabel('Folder', { exact: true })).toHaveValue(id); await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Draft with folder');
  await page.locator('#ui-language').selectOption('vi'); await expect(page.getByLabel('Thư mục', { exact: true })).toHaveValue(id); await page.unrouteAll({ behavior: 'wait' });
});

test('folder forms fit eight widths in both languages and actual 200 percent browser zoom', async ({ page }) => {
  test.setTimeout(120000); await tutor(page); const id = await createFolder(page, 'Thư mục ' + 'dài '.repeat(20)); await mkdir('e2e/artifacts', { recursive: true });
  const rows: object[] = [];
  for (const mode of ['new', 'edit']) {
    await page.getByRole('button', { name: mode === 'new' ? 'New folder' : 'Edit folder', exact: true }).click();
    if (mode === 'new') await page.getByLabel('Folder name').fill('Bản nháp giữ nguyên');
    for (const locale of ['vi', 'en']) {
      await page.locator('#ui-language').selectOption(locale);
      for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const metrics = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth, unlabeled: [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select')].filter(x => !x.labels?.length).length,
          small: [...document.querySelectorAll<HTMLElement>('input,select,button')].filter(x => x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().height < 44).length }));
        expect(metrics.content).toBeLessThanOrEqual(width); expect(metrics.unlabeled).toBe(0); expect(metrics.small).toBe(0); rows.push({ mode, locale, ...metrics });
        await page.screenshot({ path: `e2e/artifacts/folder-${mode}-${locale}-${width}.png`, fullPage: true });
      }
    }
    await page.getByLabel('Folder name').focus(); await page.keyboard.press('Tab'); await expect(page.getByLabel('Parent folder')).toBeFocused();
    await page.setViewportSize({ width: 320, height: 568 }); await page.getByRole('button', { name: 'Cancel', exact: true }).focus(); await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport(); await page.keyboard.press('Enter');
  }
  await writeFile('node_modules/.cache/folder-qa.json', JSON.stringify({ rows }, null, 2));
  const directory = await mkdtemp(path.resolve('node_modules/.cache/zoom-profile-')); const extension = path.resolve('e2e/zoom-extension');
  const context = await chromium.launchPersistentContext(directory, { channel: 'chromium', headless: true, viewport: { width: 1280, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const zoom = context.pages()[0]; const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker'); await tutor(zoom); await zoom.getByLabel('Browse folder').selectOption(id);
    await worker.evaluate(`(async () => { const tabs = await chrome.tabs.query({}); await chrome.tabs.setZoom(tabs.find(t => t.url.startsWith('http://127.0.0.1:5173')).id, 2); })()`);
    const cdp = await context.newCDPSession(zoom);
    for (const locale of ['vi', 'en']) {
      await zoom.locator('#ui-language').selectOption(locale); await zoom.getByRole('button', { name: locale === 'en' ? 'Edit folder' : 'Chỉnh sửa thư mục', exact: true }).click();
      const metrics = await zoom.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio, content: document.documentElement.scrollWidth })); expect(metrics.dpr).toBe(2); expect(metrics.width).toBe(640); expect(metrics.content).toBeLessThanOrEqual(640);
      const layout = await cdp.send('Page.getLayoutMetrics');
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: Math.ceil(layout.cssContentSize.width * metrics.dpr), height: Math.ceil(layout.cssContentSize.height * metrics.dpr), scale: 1 } });
      await writeFile(`e2e/artifacts/folder-zoom-${locale}.png`, Buffer.from(shot.data, 'base64')); await zoom.getByRole('button', { name: locale === 'en' ? 'Cancel' : 'Hủy', exact: true }).click();
    }
  } finally { await context.close(); await rm(directory, { recursive: true }); }
});
