import { test, expect, chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
async function tutor(page: Page) {
  await page.goto('/'); await page.locator('#ui-language').selectOption('en');
  await page.getByLabel('Username', { exact: true }).fill('tutor'); await page.getByLabel('Password', { exact: true }).fill('Tutor mật khẩu 123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.getByRole('link', { name: 'Content library', exact: true }).click();
  await expect(page.getByLabel('Browse tag')).toBeEnabled();
}
async function post(page: Page, url: string, body: unknown) {
  return page.evaluate(async ({ url, body }) => {
    const token = (await (await fetch('/api/v1/auth/csrf')).json()).token;
    const response = await fetch('/api/v1' + url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Setup failed ${response.status}`); return response.status === 204 ? null : response.json();
  }, { url, body });
}
async function makeTag(page: Page, name: string) {
  await page.getByRole('button', { name: 'New tag', exact: true }).click(); await expect(page.getByLabel('Tag name')).toBeFocused();
  await page.getByLabel('Tag name').fill(name); await page.getByRole('button', { name: 'Save tag', exact: true }).click();
  await expect(page.getByText('Tag saved.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Browse tag').locator('option', { hasText: name })).toHaveCount(1);
  return await page.getByLabel('Browse tag').locator('option', { hasText: name }).getAttribute('value') as string;
}
async function addTag(page: Page, id: string) { await page.getByLabel('Choose a tag', { exact: true }).selectOption(id); await page.getByRole('button', { name: 'Add tag', exact: true }).click(); }
const cards = (page: Page) => page.locator('.content-list > li');
test.beforeEach(async ({ request }) => { expect((await request.post('http://127.0.0.1:5080/__test/advance', { headers: { 'X-Test-Control': process.env.KEEMESE_UI_CONTROL! } })).ok()).toBeTruthy(); });

test('catalog and multiple tags save, filter, rename live labels, archive, detach and delete safely', async ({ page }) => {
  await tutor(page); const a = await makeTag(page, 'Tiếng Việt tags lifecycle'); const b = await makeTag(page, 'Practice tags lifecycle');
  await expect(page.getByLabel('Browse tag')).toHaveValue('all');
  await page.getByRole('link', { name: 'New text content', exact: true }).click(); await page.getByLabel('Title', { exact: true }).fill('Tagged lifecycle source');
  await page.getByLabel('Teaching text (optional)').fill('Saved text remains independent'); await addTag(page, a); await addTag(page, b);
  await expect(page.getByLabel('Selected tags')).toContainText('Tiếng Việt tags lifecycle');
  await page.getByRole('button', { name: 'Create content', exact: true }).click(); await expect(page.getByText('Content created.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: '← Content library' }).click(); await page.getByLabel('Browse tag').selectOption(a); await expect(cards(page)).toHaveCount(1);
  await page.locator('#content-search').fill('Tagged lifecycle'); await page.locator('#content-search').press('Enter'); await expect(cards(page)).toHaveCount(1);
  await page.locator('#content-search').fill('unsubmitted query');
  await page.getByRole('button', { name: 'Edit tag', exact: true }).click(); await page.getByLabel('Tag name').fill('Renamed Tiếng Việt'); await page.getByRole('button', { name: 'Save tag', exact: true }).click();
  await expect(page.getByLabel('Browse tag')).toHaveValue(a); await expect(page.locator('.tag-labels')).toContainText('Renamed Tiếng Việt'); await expect(page.locator('#content-search')).toHaveValue('unsubmitted query');
  await page.getByRole('button', { name: 'Edit tag', exact: true }).click(); await page.getByRole('button', { name: 'Delete tag', exact: true }).click(); await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByRole('alert')).toContainText('active and archived'); await expect(page.getByLabel('Tag name')).toHaveValue('Renamed Tiếng Việt'); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('link', { name: 'Tagged lifecycle source', exact: true }).click(); await expect(page.getByLabel('Teaching text (optional)')).toHaveValue('Saved text remains independent');
  await page.getByRole('button', { name: 'Archive content', exact: true }).click(); await page.getByRole('button', { name: 'Confirm archive' }).click();
  await expect(page.locator('.archived-text .tag-labels')).toContainText('Renamed Tiếng Việt'); await expect(page.locator('#content-tag')).toHaveCount(0);
  await page.getByRole('link', { name: '← Content library' }).click(); await page.getByLabel('Browse tag').selectOption(a); await expect(page.getByRole('heading', { name: 'No content with this tag' })).toBeVisible();
  await page.getByRole('button', { name: 'Archived content', exact: true }).click(); await page.getByRole('link', { name: 'Tagged lifecycle source', exact: true }).click();
  await page.getByRole('button', { name: 'Restore content' }).click(); await page.getByRole('button', { name: 'Remove tag “Renamed Tiếng Việt”', exact: true }).click(); await expect(page.getByLabel('Choose a tag', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Save changes' }).click(); await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: '← Content library' }).click(); await page.getByLabel('Browse tag').selectOption(a); await page.getByRole('button', { name: 'Edit tag', exact: true }).click();
  await page.getByRole('button', { name: 'Delete tag', exact: true }).click(); await page.getByRole('button', { name: 'Cancel confirmation' }).click(); await expect(page.getByRole('button', { name: 'Confirm delete' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete tag', exact: true }).click(); await page.getByRole('button', { name: 'Confirm delete' }).click(); await expect(page.getByText('Tag deleted.', { exact: true })).toBeVisible(); await expect(page.getByLabel('Browse tag')).toHaveValue('all'); await expect(page.getByLabel('Browse tag')).toBeFocused();
});

test('failed, stale and missing tag saves preserve bilingual drafts until explicit repair', async ({ page }) => {
  await tutor(page); const id = await makeTag(page, 'Concurrent tags draft');
  await page.getByLabel('Browse tag').selectOption(id); await page.getByRole('button', { name: 'Edit tag', exact: true }).click(); await page.getByLabel('Tag name').fill('Bản nháp chưa lưu');
  await page.route(`**/api/v1/content/tags/${id}`, route => route.abort()); await page.getByRole('button', { name: 'Save tag', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Cannot reach'); await page.unrouteAll({ behavior: 'wait' });
  await expect(page.getByLabel('Tag name')).toHaveValue('Bản nháp chưa lưu'); await post(page, `/content/tags/${id}`, { name: 'Other tag tab', version: 1 });
  await page.getByRole('button', { name: 'Save tag', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Your draft is kept');
  const calls: string[] = []; page.on('request', r => { if (r.url().includes('/api/')) calls.push(r.url()); });
  await page.getByLabel('Tag name').focus(); await page.locator('#ui-language').selectOption('vi'); await expect(page.getByLabel('Tên nhãn')).toBeFocused(); await expect(page.getByLabel('Tên nhãn')).toHaveValue('Bản nháp chưa lưu'); expect(calls).toEqual([]);
  await page.locator('#ui-language').selectOption('en'); await page.getByRole('button', { name: 'Reload tag' }).click(); await page.getByRole('button', { name: 'Cancel confirmation' }).click(); await expect(page.getByLabel('Tag name')).toHaveValue('Bản nháp chưa lưu');
  await page.getByRole('button', { name: 'Reload tag' }).click(); await page.getByRole('button', { name: 'Discard edits and reload' }).click(); await expect(page.getByLabel('Tag name')).toHaveValue('Other tag tab'); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('link', { name: 'New text content', exact: true }).click(); await page.getByLabel('Title', { exact: true }).fill('Text draft retained'); await addTag(page, id);
  await post(page, `/content/tags/${id}/delete`, { version: 2 }); await page.getByRole('button', { name: 'Create content', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Your draft is kept');
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Text draft retained'); await expect(page.getByLabel('Selected tags')).toContainText('Other tag tab');
  await page.getByRole('button', { name: 'Remove tag “Other tag tab”' }).click(); await page.route('**/api/v1/content', route => route.abort()); await page.getByRole('button', { name: 'Create content', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Cannot reach'); await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Text draft retained'); await page.unrouteAll({ behavior: 'wait' });
});

test('pending tag mutation and late filtered responses respect locale, newer filters and account transitions', async ({ page }) => {
  await tutor(page); await post(page, '/content', { title: 'Untagged late-response fixture', description: '', body: '' });
  await page.getByRole('link', { name: 'Students', exact: true }).click(); await page.route('**/api/v1/content/tags', route => route.abort());
  await page.getByRole('link', { name: 'Content library', exact: true }).click(); await expect(page.getByRole('region', { name: 'Tag organization' }).getByRole('alert')).toContainText('Cannot reach');
  await expect(cards(page)).not.toHaveCount(0); await expect(page.getByLabel('Browse tag')).toBeDisabled(); await page.unrouteAll({ behavior: 'wait' });
  await page.getByRole('button', { name: 'Retry tags', exact: true }).click(); await expect(page.getByLabel('Browse tag')).toBeEnabled();
  const id = await makeTag(page, 'Pending tags fixture');
  let release!: () => void; let seen!: () => void; let gate = new Promise<void>(r => { release = r; }); let intercepted = new Promise<void>(r => { seen = r; });
  await page.getByLabel('Browse tag').selectOption(id); await page.getByRole('button', { name: 'Edit tag', exact: true }).click(); await page.getByLabel('Tag name').fill('Pending saved label');
  await page.route(`**/api/v1/content/tags/${id}`, async route => { const response = await route.fetch(); seen(); await gate; await route.fulfill({ response }); });
  await page.getByRole('button', { name: 'Save tag', exact: true }).click(); await intercepted; await page.locator('#ui-language').selectOption('vi'); await expect(page.getByRole('button', { name: 'Đang lưu…', exact: true })).toBeDisabled(); release(); await page.unrouteAll({ behavior: 'wait' }); await expect(page.getByText('Đã lưu nhãn.', { exact: true })).toBeVisible(); await page.locator('#ui-language').selectOption('en');
  for (const failure of [false, true]) {
    gate = new Promise<void>(r => { release = r; }); intercepted = new Promise<void>(r => { seen = r; });
    await page.getByLabel('Browse tag').selectOption('all');
    await page.route('**/api/v1/content?**', async route => { if (new URL(route.request().url()).searchParams.get('tagId') !== id) return route.continue(); const response = await route.fetch(); seen(); await gate; await route.fulfill(failure ? { status: 503, json: { code: 'service_unavailable' } } : { response }); });
    await page.getByLabel('Browse tag').selectOption(id); await intercepted; await page.getByLabel('Browse tag').selectOption('untagged'); await expect(cards(page)).not.toHaveCount(0); release(); await page.unrouteAll({ behavior: 'wait' }); await expect(page.getByLabel('Browse tag')).toHaveValue('untagged'); await expect(page.locator('.notice.error')).toHaveCount(0);
  }
  gate = new Promise<void>(r => { release = r; }); intercepted = new Promise<void>(r => { seen = r; });
  await page.route('**/api/v1/content/tags', async route => { const response = await route.fetch(); seen(); await gate; await route.fulfill({ response }).catch(() => {}); });
  // Remount just the library through normal navigation to issue the independent catalog load.
  await page.getByRole('link', { name: 'Students', exact: true }).click(); await page.getByRole('link', { name: 'Content library', exact: true }).click(); await intercepted;
  await page.getByRole('button', { name: 'Sign out', exact: true }).click(); release(); await page.unrouteAll({ behavior: 'wait' }); await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible(); await expect(page.locator('#tag-filter')).toHaveCount(0);
});

test('tag interfaces stay legible across 96 bilingual cases, keyboard, contrast and actual zoom', async ({ page }) => {
  test.setTimeout(120000); await tutor(page); await mkdir('e2e/artifacts', { recursive: true }); const rows: object[] = [];
  const ids: string[] = []; for (let i = 0; i < 20; i++) ids.push((await post(page, '/content/tags', { name: `Nhãn dài ${i} — ` + 'giao tiếp '.repeat(3) })).id);
  const text = await post(page, '/content', { title: 'Visual tags source', description: 'Twenty labels remain optional and reusable.', body: 'Saved teaching content', tagIds: ids });
  await page.reload(); await expect(page.getByLabel('Browse tag')).toBeEnabled();
  async function snapshot(template: string) {
    for (const locale of ['vi', 'en']) { await page.locator('#ui-language').selectOption(locale); for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 }); const m = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth, unlabeled: [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select')].filter(x => !x.labels?.length).length, small: [...document.querySelectorAll<HTMLElement>('button,input,select')].filter(x => x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().height < 44).length })); expect(m.content).toBeLessThanOrEqual(width); expect(m.unlabeled).toBe(0); expect(m.small).toBe(0); rows.push({ template, locale, ...m });
      if ([320, 1280].includes(width)) await page.screenshot({ path: `e2e/artifacts/tags-${template}-${locale}-${width}.png`, fullPage: true });
    } }
  }
  await page.getByRole('button', { name: 'New tag', exact: true }).click(); await page.getByLabel('Tag name').fill('Nhãn bản nháp'); await snapshot('new'); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByLabel('Browse tag').selectOption(ids[0]); await page.getByRole('button', { name: 'Edit tag', exact: true }).click(); await snapshot('edit');
  await page.route(`**/api/v1/content/tags/${ids[0]}`, route => route.abort()); await page.getByLabel('Tag name').fill('Failure draft'); await page.getByRole('button', { name: 'Save tag', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible(); await snapshot('error'); await page.unrouteAll({ behavior: 'wait' }); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Visual tags source' })).toBeVisible(); await snapshot('results'); await page.getByRole('link', { name: 'Visual tags source' }).click(); await expect(page.getByLabel('Selected tags').locator('li')).toHaveCount(20); await snapshot('editor');
  const contrast = await page.evaluate(() => {
    const lum = (c: string) => { const [r,g,b] = c.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v => { const x=v/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4; }); return .2126*r+.7152*g+.0722*b; };
    return ['.tag-picker legend','.tag-picker .hint','.selected-tags li','.tag-remove'].map(selector=>{const s=getComputedStyle(document.querySelector(selector)!);const a=lum(s.color),b=lum(s.backgroundColor==='rgba(0, 0, 0, 0)'?(selector==='.tag-remove'?'rgb(237,242,249)':'rgb(255,255,255)'):s.backgroundColor);return {selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
  });for (const row of contrast) expect(row.ratio).toBeGreaterThanOrEqual(4.5);
  await page.setViewportSize({ width: 320, height: 320 }); const remove = page.getByRole('button', { name: /^Remove tag/ }).first(); await remove.focus(); await expect(remove).toBeInViewport(); await page.keyboard.press('Enter'); await expect(page.getByLabel('Choose a tag', { exact: true })).toBeFocused();
  await page.getByLabel('Choose a tag', { exact: true }).selectOption(ids[0]); await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Add tag', exact: true })).toBeFocused(); await page.keyboard.press('Enter'); await expect(page.getByRole('button', { name: /^Remove tag/ }).first()).toBeFocused();
  await page.getByRole('button', { name: 'Archive content', exact: true }).click(); await page.getByRole('button', { name: 'Confirm archive' }).click(); await expect(page.getByRole('heading', { name: 'Archived text content', exact: true })).toBeVisible(); await snapshot('archived'); await writeFile('node_modules/.cache/tags-qa.json', JSON.stringify({ rows, contrast }, null, 2));
  const dir = await mkdtemp(path.resolve('node_modules/.cache/zoom-profile-')); const extension = path.resolve('e2e/zoom-extension'); const context = await chromium.launchPersistentContext(dir, { channel: 'chromium', headless: true, viewport: { width: 1280, height: 900 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  try { const zoom = context.pages()[0]; const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker'); await tutor(zoom); await zoom.goto(`/content/${text.id}`); await zoom.getByRole('button', { name: 'Restore content' }).click(); await expect(zoom.getByLabel('Title', { exact: true })).toBeVisible();
    await worker.evaluate(`(async () => { const tabs = await chrome.tabs.query({}); await chrome.tabs.setZoom(tabs.find(t => t.url.startsWith('http://127.0.0.1:5173')).id, 2); })()`); const cdp = await context.newCDPSession(zoom);
    for (const locale of ['vi','en']) { await zoom.locator('#ui-language').selectOption(locale); const metrics = await zoom.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio,content:document.documentElement.scrollWidth})); expect(metrics.dpr).toBe(2);expect(metrics.width).toBe(640);expect(metrics.content).toBeLessThanOrEqual(640); const layout = await cdp.send('Page.getLayoutMetrics'); const shot = await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:Math.ceil(layout.cssContentSize.width*metrics.dpr),height:Math.ceil(layout.cssContentSize.height*metrics.dpr),scale:1}}); await writeFile(`e2e/artifacts/tags-zoom-${locale}.png`,Buffer.from(shot.data,'base64')); }
  } finally { await context.close(); await rm(dir,{recursive:true}); }
});
