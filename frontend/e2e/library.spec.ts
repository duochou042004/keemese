import { test, expect, chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';

const artifact = 'e2e/artifacts';
const title = 'Bài học dùng lại — Nguyễn Hoàng Bảo An và hành trình luyện giao tiếp tiếng Anh';
const body = "  Giữ nguyên tiếng Việt và khoảng trắng.\n<script>window.contentExecuted = true</script>\nSecond line 😀\n ";
async function tutor(page: Page) {
  await page.goto('/'); await page.getByLabel('Tên đăng nhập', { exact: true }).fill('tutor');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Tutor mật khẩu 123'); await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Học sinh', exact: true })).toBeVisible();
  await page.locator('#ui-language').selectOption('en');
  await page.getByRole('link', { name: 'Content library', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Content library', exact: true })).toBeVisible();
}
async function language(page: Page, locale: 'en' | 'vi') {
  await page.locator('#ui-language').focus(); await page.locator('#ui-language').selectOption(locale); await expect(page.locator('#ui-language')).toBeFocused();
}
async function create(page: Page, name: string) {
  await page.getByRole('link', { name: 'New text content', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill(name); await page.getByLabel('Description (optional)').fill('  Mô tả riêng\nSecond paragraph  ');
  await page.getByLabel('Teaching text (optional)').fill(body); await page.getByRole('button', { name: 'Create content', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Content created.'); await expect(page.getByLabel('Title', { exact: true })).toHaveValue(name);
}

test.beforeEach(async ({ request }) => {
  expect((await request.post('http://127.0.0.1:5080/__test/advance', { headers: { 'X-Test-Control': process.env.KEEMESE_UI_CONTROL! } })).ok()).toBeTruthy();
});

test('bilingual reusable text lifecycle keeps draft, handles failure/stale saves, archives and restores inert text', async ({ page }) => {
  const exceptions: string[] = []; page.on('pageerror', e => exceptions.push(e.message));
  await tutor(page); await expect(page.getByRole('heading', { name: 'Your library is empty' })).toBeVisible();
  await create(page, title); const id = new URL(page.url()).pathname.split('/')[2];
  const draft = body + '\nUnsaved draft'; await page.getByLabel('Teaching text (optional)').fill(draft);
  const calls: string[] = []; page.on('request', r => { if (r.url().includes('/api/')) calls.push(r.method() + r.url()); });
  await language(page, 'vi'); await expect(page.getByLabel('Nội dung giảng dạy (không bắt buộc)')).toHaveValue(draft);
  await expect(page.getByLabel('Tiêu đề', { exact: true })).toHaveValue(title); await language(page, 'en'); expect(calls).toEqual([]);
  await page.route(`**/api/v1/content/${id}`, async route => { if (route.request().method() === 'POST') await route.abort(); else await route.continue(); });
  await page.getByRole('button', { name: 'Save changes' }).click(); await expect(page.getByRole('alert')).toContainText('Cannot reach');
  await page.screenshot({ path: `${artifact}/content-network-error.png`, fullPage: true });
  await expect(page.getByLabel('Teaching text (optional)')).toHaveValue(draft); await page.unrouteAll({ behavior: 'wait' });
  // Simulate another tutor tab saving via the real API without focusing/revalidating the editor.
  const changed = await page.evaluate(async ({ id }) => {
    const headers = { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': (await (await fetch('/api/v1/auth/csrf')).json()).token };
    const response = await fetch(`/api/v1/content/${id}`, { method: 'POST', headers, body: JSON.stringify({ title: 'Other tab', description: '', body: 'Server version', version: 1 }) });
    return response.status;
  }, { id }); expect(changed).toBe(200);
  await page.getByRole('button', { name: 'Save changes' }).click(); await expect(page.getByRole('alert')).toContainText('Your draft is kept');
  await expect(page.getByLabel('Teaching text (optional)')).toHaveValue(draft);
  await page.screenshot({ path: `${artifact}/content-stale-draft.png`, fullPage: true });
  await language(page, 'vi'); await expect(page.getByRole('alert')).toContainText('Bản nháp'); await language(page, 'en');
  await page.getByRole('button', { name: 'Reload saved content' }).click(); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Teaching text (optional)')).toHaveValue(draft);
  await page.getByRole('button', { name: 'Reload saved content' }).click(); await page.getByRole('button', { name: 'Discard edits and reload' }).click();
  await expect(page.getByLabel('Teaching text (optional)')).toHaveValue('Server version');
  await page.getByLabel('Title', { exact: true }).fill(title); await page.getByLabel('Teaching text (optional)').fill(body);
  let release!: () => void; let seen!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }); const intercepted = new Promise<void>(resolve => { seen = resolve; });
  await page.route(`**/api/v1/content/${id}`, async route => { const response = await route.fetch(); seen(); await gate; await route.fulfill({ response }); });
  await page.getByRole('button', { name: 'Save changes' }).click(); await intercepted; const pendingCalls = calls.length;
  await language(page, 'vi'); await expect(page.getByRole('button', { name: 'Đang lưu…', exact: true })).toBeDisabled(); expect(calls).toHaveLength(pendingCalls);
  release(); await page.unrouteAll({ behavior: 'wait' }); await expect(page.getByRole('status')).toContainText('Đã lưu thay đổi');
  await language(page, 'en'); await expect(page.getByRole('status')).toContainText('Changes saved');
  await language(page, 'vi'); await expect(page.getByRole('status')).toContainText('Đã lưu thay đổi'); await language(page, 'en');
  await page.getByRole('button', { name: 'Archive content', exact: true }).click(); await expect(page.locator('#archive-question')).toContainText(title);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await page.getByRole('button', { name: 'Archive content', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm archive' }).click(); await expect(page.getByRole('heading', { name: 'Archived text content' })).toBeVisible();
  await expect(page.locator('.archived-text script')).toHaveCount(0); expect(await page.evaluate(() => 'contentExecuted' in window)).toBe(false);
  expect(await page.locator('.archived-text .content-text').textContent()).toBe(body);
  await page.getByRole('link', { name: '← Content library' }).click(); await expect(page.getByRole('link', { name: title, exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Archived content', exact: true }).click(); await page.getByRole('link', { name: title, exact: true }).click();
  await page.getByRole('button', { name: 'Restore content' }).click(); await expect(page.getByRole('status')).toContainText('Content restored');
  await expect(page.getByLabel('Teaching text (optional)')).toHaveValue(body); expect(exceptions).toEqual([]);
});

test('student navigation denies reusable content without fetching library bytes', async ({ page }) => {
  await tutor(page); await page.getByRole('link', { name: 'Students', exact: true }).click();
  await page.getByRole('link', { name: 'Add student', exact: true }).click();
  await page.getByLabel('Full name').fill('Student library isolation'); await page.getByLabel('Username', { exact: true }).fill('library-student');
  await page.getByLabel('Temporary password', { exact: true }).fill('Student tạm thời 456'); await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Student library isolation' })).toBeVisible(); await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Username', { exact: true }).fill('library-student'); await page.getByLabel('Password', { exact: true }).fill('Student tạm thời 456'); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Current password', { exact: true }).fill('Student tạm thời 456'); await page.getByLabel('New password', { exact: true }).fill('Student mới mật khẩu 789'); await page.getByLabel('Confirm new password', { exact: true }).fill('Student mới mật khẩu 789');
  await page.getByRole('button', { name: 'Save new password' }).click(); await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await page.getByLabel('Username', { exact: true }).fill('library-student'); await page.getByLabel('Password', { exact: true }).fill('Student mới mật khẩu 789'); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
  const source: string[] = []; page.on('request', r => { if (r.url().includes('/api/v1/content')) source.push(r.url()); });
  for (const url of ['/content', '/content/new', '/content/00000000-0000-0000-0000-000000000001']) {
    await page.goto(url); await expect(page.getByRole('heading', { name: 'Unable to open this page' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Content library', exact: true })).toHaveCount(0);
  }
  expect(source).toEqual([]);
});

test('library/editor/archive layouts in both languages at eight widths, keyboard, confirmation and true zoom', async ({ page }) => {
  test.setTimeout(120000); await mkdir(artifact, { recursive: true }); await tutor(page);
  const rows: object[] = [];
  async function snapshot(template: string) {
    for (const locale of ['vi', 'en'] as const) {
      await language(page, locale);
      for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const metrics = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth,
          small: [...document.querySelectorAll<HTMLElement>('input,textarea,select,button')].filter(e => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height < 44).map(e => e.tagName),
          unlabeled: [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input,textarea,select')].filter(e => !e.labels?.length).length }));
        expect(metrics.content).toBeLessThanOrEqual(width); expect(metrics.small).toEqual([]); expect(metrics.unlabeled).toBe(0);
        const file = `${artifact}/content-${template}-${locale}-${width}.png`; await page.screenshot({ path: file, fullPage: true }); rows.push({ template, locale, width, metrics, file });
      }
    }
  }
  await snapshot('library'); await page.getByRole('link', { name: 'New text content', exact: true }).click(); await snapshot('new');
  await page.getByLabel('Title', { exact: true }).fill('Tài liệu ' + 'x'.repeat(190)); await page.keyboard.press('Tab'); await expect(page.getByLabel('Folder', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByLabel('Description (optional)')).toBeFocused();
  await page.getByLabel('Description (optional)').fill('Một mô tả dài giữ nguyên tiếng Việt khi đổi ngôn ngữ.');
  await page.getByLabel('Teaching text (optional)').fill(body); await page.getByRole('button', { name: 'Create content', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Content created.'); await snapshot('edit');
  await page.setViewportSize({ width: 320, height: 568 }); await page.getByRole('button', { name: 'Archive content', exact: true }).click();
  for (const locale of ['vi', 'en'] as const) {
    await language(page, locale); const cancel = page.getByRole('button', { name: locale === 'en' ? 'Cancel' : 'Hủy', exact: true });
    await cancel.focus(); await expect(cancel).toBeInViewport(); await page.screenshot({ path: `${artifact}/content-confirm-${locale}.png`, fullPage: true });
  }
  await page.keyboard.press('Enter'); await expect(page.getByRole('button', { name: 'Confirm archive' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Archive content', exact: true }).click(); await page.getByRole('button', { name: 'Confirm archive' }).click();
  await expect(page.getByRole('heading', { name: 'Archived text content' })).toBeVisible(); await snapshot('archived');
  await writeFile(`${artifact}/content-qa.json`, JSON.stringify({ rows, shortHeight: 'both-language keyboard cancel passed', result: '64 geometry/label/target cases passed; screenshot review separate' }, null, 2));
  // Same disposable extension/profile mechanism as the identity suite.
  const directory = await mkdtemp(path.resolve('node_modules/.cache/zoom-profile-')); const extension = path.resolve('e2e/zoom-extension');
  const context = await chromium.launchPersistentContext(directory, { channel: 'chromium', headless: true, viewport: { width: 1280, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  const zoomRows: object[] = [];
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker'); const zoom = context.pages()[0]; await tutor(zoom);
    await worker.evaluate(`(async () => { const tabs = await chrome.tabs.query({}); await chrome.tabs.setZoom(tabs.find(t => t.url.startsWith('http://127.0.0.1:5173')).id, 2); })()`);
    const cdp = await context.newCDPSession(zoom);
    for (const template of ['library', 'new', 'edit', 'archived']) {
      if (template === 'new') await zoom.getByRole('link', { name: 'New text content', exact: true }).click();
      if (template === 'edit') {
        await zoom.getByLabel('Title', { exact: true }).fill('Zoom ' + title); await zoom.getByLabel('Teaching text (optional)').fill(body);
        await zoom.getByRole('button', { name: 'Create content', exact: true }).click(); await expect(zoom.getByRole('status')).toContainText('Content created.');
      }
      if (template === 'archived') { await zoom.getByRole('button', { name: 'Archive content', exact: true }).click(); await zoom.getByRole('button', { name: 'Confirm archive' }).click(); await expect(zoom.getByRole('heading', { name: 'Archived text content' })).toBeVisible(); }
      for (const locale of ['vi', 'en'] as const) {
        await language(zoom, locale); const metrics = await zoom.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio, content: document.documentElement.scrollWidth }));
        expect(metrics.dpr).toBe(2); expect(metrics.width).toBe(640); expect(metrics.content).toBeLessThanOrEqual(640);
        const layout = await cdp.send('Page.getLayoutMetrics'); const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: Math.ceil(layout.cssContentSize.width * metrics.dpr), height: Math.ceil(layout.cssContentSize.height * metrics.dpr), scale: 1 } });
        await writeFile(`${artifact}/content-zoom-${template}-${locale}.png`, Buffer.from(shot.data, 'base64')); zoomRows.push({ template, locale, ...metrics });
      }
    }
    await writeFile(`${artifact}/content-zoom.json`, JSON.stringify({ mechanism: 'chrome.tabs.setZoom(2) in disposable profile', rows: zoomRows }, null, 2));
  } finally { await context.close(); await rm(directory, { recursive: true }); }
});
