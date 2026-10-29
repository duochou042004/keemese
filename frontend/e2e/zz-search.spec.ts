import { test, expect, chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function tutor(page: Page) {
  await page.goto('/'); await page.locator('#ui-language').selectOption('en');
  await page.getByLabel('Username', { exact: true }).fill('tutor'); await page.getByLabel('Password', { exact: true }).fill('Tutor mật khẩu 123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.getByRole('link', { name: 'Content library', exact: true }).click();
  await expect(page.locator('#content-search')).toBeVisible(); await expect(page.getByText('Loading content…', { exact: true })).toHaveCount(0);
}
async function post(page: Page, url: string, body: unknown) {
  return page.evaluate(async ({ url, body }) => {
    const token = (await (await fetch('/api/v1/auth/csrf')).json()).token;
    const response = await fetch('/api/v1' + url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Synthetic setup failed ${response.status}`); return response.json();
  }, { url, body });
}
async function search(page: Page, q: string) {
  await page.locator('#content-search').fill(q); await page.locator('#content-search').press('Enter');
  await expect(page.getByText('Loading content…', { exact: true })).toHaveCount(0);
}
const list = (page: Page) => page.locator('.content-list');
test.beforeEach(async ({ request }) => {
  expect((await request.post('http://127.0.0.1:5080/__test/advance', { headers: { 'X-Test-Control': process.env.KEEMESE_UI_CONTROL! } })).ok()).toBeTruthy();
});

test('search submission, filters, paging, body hits and clear preserve bilingual input', async ({ page }) => {
  await tutor(page);
  const folder = await post(page, '/content/folders', { name: 'Search packet folder', parentId: null });
  const archived = await post(page, '/content', { title: 'Search packet archived', description: '', body: 'Tiếng bí mật', folderId: folder.id });
  await post(page, `/content/${archived.id}/archive`, { version: 1 });
  for (let i = 0; i < 27; i++) await post(page, '/content', { title: `Search packet ${i}`, description: '', body: 'Tiếng bí mật 😀 %_\\', folderId: folder.id });
  await page.reload(); await expect(page.getByLabel('Browse folder').locator(`option[value="${folder.id}"]`)).toHaveCount(1);
  const calls: string[] = []; page.on('request', r => { if (/\/api\/v1\/content\?/.test(r.url())) calls.push(r.url()); });
  await expect(page.getByText('Loading content…', { exact: true })).toHaveCount(0);
  await page.locator('#content-search').fill('TIẾNG BÍ MẬT'); expect(calls).toEqual([]);
  await page.locator('#content-search').evaluate(el => el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })));
  await page.locator('#content-search').press('Enter'); expect(calls).toEqual([]);
  await page.locator('#content-search').evaluate(el => el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));
  await page.locator('#content-search').press('Enter'); await expect(list(page).locator('li')).toHaveCount(25); await expect(page.locator('#content-search')).toBeFocused();
  const first = await list(page).getByRole('link').first().getAttribute('href');
  await page.getByRole('button', { name: 'Next page', exact: true }).click(); await expect(list(page).locator('li')).toHaveCount(2);
  expect(new URL(calls.at(-1)!).searchParams.get('q')).toBe('TIẾNG BÍ MẬT');
  await page.route('**/api/v1/content?**', async route => {
    if (new URL(route.request().url()).searchParams.get('page') === '2') await route.fulfill({ status: 200, json: { items: [], nextPage: null } }); else await route.continue();
  });
  await page.getByRole('button', { name: 'Previous page', exact: true }).click(); await expect(list(page).locator('li')).toHaveCount(25);
  await page.getByRole('button', { name: 'Next page', exact: true }).click(); await expect(page.getByRole('heading', { name: 'No results on this page' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous page', exact: true })).toBeEnabled(); await page.unrouteAll({ behavior: 'wait' });
  await page.locator('#content-search').fill('not submitted'); const beforeLocale = calls.length;
  await page.locator('#content-search').evaluate((el: HTMLInputElement) => { el.focus(); el.setSelectionRange(2, 6); });
  await page.locator('#ui-language').selectOption('vi'); await expect(page.locator('#content-search')).toBeFocused(); expect(await page.locator('#content-search').evaluate((el: HTMLInputElement) => [el.selectionStart, el.selectionEnd])).toEqual([2, 6]);
  await expect(page.locator('.applied-query')).toContainText('TIẾNG BÍ MẬT'); expect(calls).toHaveLength(beforeLocale);
  await page.locator('#ui-language').selectOption('en');
  await page.getByLabel('Browse folder').selectOption('unfiled'); await expect(page.getByRole('heading', { name: 'No matching content' })).toBeVisible();
  await expect(page.locator('#content-search')).toHaveValue('not submitted');
  await page.getByLabel('Browse folder').selectOption(folder.id); await expect(list(page).locator('li')).toHaveCount(25);
  await page.getByRole('button', { name: 'Archived content', exact: true }).click(); await expect(list(page).getByRole('link')).toHaveText('Search packet archived');
  await page.getByRole('button', { name: 'Clear search', exact: true }).click(); await expect(page.locator('#content-search')).toBeFocused(); await expect(page.locator('#content-search')).toHaveValue('');
  await expect(page.getByLabel('Browse folder')).toHaveValue(folder.id); await expect(page.getByRole('button', { name: 'Archived content', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Active content', exact: true }).click(); await search(page, 'tiếng bí mật');
  await page.locator(`a[href="${first}"]`).click();
  await expect(page.getByLabel('Teaching text (optional)')).toHaveValue('Tiếng bí mật 😀 %_\\');
  await page.getByLabel('Title', { exact: true }).fill('Editor draft stays'); await page.locator('#ui-language').selectOption('vi'); await expect(page.getByLabel('Tiêu đề', { exact: true })).toHaveValue('Editor draft stays');
  await page.getByRole('link', { name: '← Thư viện nội dung' }).click(); await expect(page.locator('#content-search')).toHaveValue('');
});

test('late success and error cannot replace newer search; pending locale, retry and validation keep focus', async ({ page }) => {
  await tutor(page);
  await post(page, '/content', { title: 'Search race fresh', description: '', body: 'freshneedle' });
  const calls: string[] = []; page.on('request', r => { if (/\/api\/v1\/content\?/.test(r.url())) calls.push(r.url()); });
  for (const failure of [false, true]) {
    let seen!: () => void; let release!: () => void; const intercepted = new Promise<void>(r => { seen = r; }); const gate = new Promise<void>(r => { release = r; });
    await page.route('**/api/v1/content?**', async route => {
      if (new URL(route.request().url()).searchParams.get('q') !== 'heldneedle') { await route.continue(); return; }
      const response = await route.fetch(); seen(); await gate;
      if (failure) await route.fulfill({ status: 503, json: { code: 'service_unavailable' } }); else await route.fulfill({ response });
    });
    await page.locator('#content-search').fill('heldneedle'); await page.locator('#content-search').press('Enter'); await intercepted;
    const count = calls.length; await page.locator('#content-search').press('Enter'); expect(calls).toHaveLength(count);
    await page.locator('#content-search').fill('draft during request'); await page.locator('#content-search').evaluate((el: HTMLInputElement) => { el.focus(); el.setSelectionRange(1, 4); });
    await page.locator('#ui-language').selectOption('vi'); await expect(page.locator('#content-search')).toBeFocused(); await expect(page.getByText('Đang tải nội dung…', { exact: true })).toBeVisible(); expect(calls).toHaveLength(count);
    await page.locator('#ui-language').selectOption('en'); await search(page, 'freshneedle'); await expect(list(page)).toContainText('Search race fresh');
    release(); await page.unrouteAll({ behavior: 'wait' }); await expect(list(page)).toContainText('Search race fresh'); await expect(page.locator('.notice.error')).toHaveCount(0);
  }
  await page.route('**/api/v1/content?**', route => route.abort()); await page.locator('#content-search').press('Enter');
  await expect(page.getByRole('alert')).toContainText('Cannot reach'); await expect(page.locator('#content-search')).toBeFocused();
  const failedCount = calls.length; await page.locator('#ui-language').selectOption('vi'); await expect(page.getByRole('alert')).toContainText('Không kết nối'); expect(calls).toHaveLength(failedCount);
  await page.locator('#ui-language').selectOption('en'); await page.unrouteAll({ behavior: 'wait' }); await page.getByRole('button', { name: 'Try again', exact: true }).click(); await expect(list(page)).toContainText('Search race fresh'); expect(calls).toHaveLength(failedCount + 1);
  await page.locator('#content-search').evaluate((el: HTMLInputElement) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!; setter.call(el, 'x'.repeat(201)); el.dispatchEvent(new Event('input', { bubbles: true })); });
  const before = calls.length; await page.getByRole('button', { name: 'Search', exact: true }).click(); await expect(page.locator('#content-search')).toBeFocused(); await expect(page.locator('#content-search-error')).toBeVisible(); expect(calls).toHaveLength(before);
  await page.locator('#ui-language').selectOption('vi'); await expect(page.locator('#content-search-error')).toContainText('200 ký tự'); await expect(page.locator('#content-search')).toBeFocused();
});

test('account transition discards a late search response', async ({ page }) => {
  await tutor(page); let seen!: () => void; let release!: () => void; const intercepted = new Promise<void>(r => { seen = r; }); const gate = new Promise<void>(r => { release = r; });
  await page.route('**/api/v1/content?**', async route => { const response = await route.fetch(); seen(); await gate; await route.fulfill({ response }).catch(() => {}); });
  await page.locator('#content-search').fill('Search packet'); await page.locator('#content-search').press('Enter'); await intercepted;
  await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  release(); await page.unrouteAll({ behavior: 'wait' }); await expect(page.locator('.content-list')).toHaveCount(0); await expect(page.locator('#content-search')).toHaveCount(0);
});

test('search form and five states fit both languages, keyboard, contrast and actual browser zoom', async ({ page }) => {
  test.setTimeout(120000); await tutor(page); await mkdir('e2e/artifacts', { recursive: true }); const rows: object[] = [];
  let release!: () => void; let seen!: () => void; const gate = new Promise<void>(r => { release = r; }); const intercepted = new Promise<void>(r => { seen = r; });
  for (const state of ['form', 'results', 'empty', 'error', 'loading']) {
    if (state === 'results') { await search(page, 'Search packet'); await expect(list(page)).toBeVisible(); }
    if (state === 'empty') { await search(page, 'absent search fixture'); await expect(page.getByRole('heading', { name: 'No matching content' })).toBeVisible(); }
    if (state === 'error') { await page.route('**/api/v1/content?**', route => route.abort()); await search(page, 'failure'); await expect(page.getByRole('alert')).toBeVisible(); await page.unrouteAll({ behavior: 'wait' }); }
    if (state === 'loading') { await page.route('**/api/v1/content?**', async route => { const response = await route.fetch(); seen(); await gate; await route.fulfill({ response }); }); await page.locator('#content-search').fill('loading fixture'); await page.locator('#content-search').press('Enter'); await intercepted; }
    for (const locale of ['vi', 'en']) {
      await page.locator('#ui-language').selectOption(locale);
      for (const width of [320, 375, 390, 768, 1024, 1280, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        const metrics = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth, unlabeled: [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select')].filter(x => !x.labels?.length).length, small: [...document.querySelectorAll<HTMLElement>('input,select,button')].filter(x => x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().height < 44).length }));
        expect(metrics.content).toBeLessThanOrEqual(width); expect(metrics.unlabeled).toBe(0); expect(metrics.small).toBe(0); rows.push({ state, locale, ...metrics });
        if ([320, 1280].includes(width)) await page.screenshot({ path: `e2e/artifacts/search-${state}-${locale}-${width}.png`, fullPage: true });
      }
    }
  }
  release(); await page.unrouteAll({ behavior: 'wait' }); await page.setViewportSize({ width: 320, height: 320 });
  await page.locator('#content-search').focus(); await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeFocused(); await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Clear search', exact: true })).toBeFocused(); await expect(page.getByRole('button', { name: 'Clear search', exact: true })).toBeInViewport(); await page.keyboard.press('Enter'); await expect(page.locator('#content-search')).toBeFocused();
  const contrast = await page.evaluate(() => {
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(v => { const x = v / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
    const lum = (c: string) => { const [r, g, b] = rgb(c); return .2126 * r + .7152 * g + .0722 * b; };
    return ['#content-search', '#content-search-hint', '.library-search label', '.library-search .primary', '.library-search .secondary'].map(selector => { const style = getComputedStyle(document.querySelector(selector)!); const bg = style.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'rgb(255,255,255)' : style.backgroundColor; const a = lum(style.color), b = lum(bg); return { selector, ratio: (Math.max(a,b)+.05)/(Math.min(a,b)+.05) }; });
  });
  for (const row of contrast) expect(row.ratio).toBeGreaterThanOrEqual(4.5);
  await writeFile('node_modules/.cache/search-qa.json', JSON.stringify({ rows, contrast }, null, 2));
  const directory = await mkdtemp(path.resolve('node_modules/.cache/zoom-profile-')); const extension = path.resolve('e2e/zoom-extension');
  const context = await chromium.launchPersistentContext(directory, { channel: 'chromium', headless: true, viewport: { width: 1280, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try {
    const zoom = context.pages()[0]; const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker'); await tutor(zoom);
    await worker.evaluate(`(async () => { const tabs = await chrome.tabs.query({}); await chrome.tabs.setZoom(tabs.find(t => t.url.startsWith('http://127.0.0.1:5173')).id, 2); })()`);
    const cdp = await context.newCDPSession(zoom);
    for (const locale of ['vi', 'en']) {
      await zoom.locator('#ui-language').selectOption(locale); const metrics = await zoom.evaluate(() => ({ width: innerWidth, dpr: devicePixelRatio, content: document.documentElement.scrollWidth })); expect(metrics.dpr).toBe(2); expect(metrics.width).toBe(640); expect(metrics.content).toBeLessThanOrEqual(640);
      const layout = await cdp.send('Page.getLayoutMetrics'); const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: Math.ceil(layout.cssContentSize.width * metrics.dpr), height: Math.ceil(layout.cssContentSize.height * metrics.dpr), scale: 1 } });
      await writeFile(`e2e/artifacts/search-zoom-${locale}.png`, Buffer.from(shot.data, 'base64'));
    }
  } finally { await context.close(); await rm(directory, { recursive: true }); }
});
