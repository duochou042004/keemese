import { test, expect, chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function tutor(page: Page) {
  await page.goto('/'); await page.locator('#ui-language').selectOption('en');
  await page.getByLabel('Username', { exact: true }).fill('tutor'); await page.getByLabel('Password', { exact: true }).fill('Tutor mật khẩu 123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Students', exact: true })).toBeVisible();
}
async function post(page: Page, url: string, body: unknown) {
  return page.evaluate(async ({ url, body }) => {
    const token = (await (await fetch('/api/v1/auth/csrf')).json()).token;
    const response = await fetch('/api/v1' + url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`Fixture failed ${response.status}`); return response.status === 204 ? null : response.json();
  }, { url, body });
}
const detail = (page: Page, id: string) => page.evaluate(async id => (await fetch('/api/v1/content/' + id)).json(), id);
async function source(page: Page, title = 'Copy source — tiếng Việt') { return post(page, '/content', { title, description: 'Mô tả <b>inert</b>', body: '<script>window.copyExecuted=true</script>\n  nguyên văn 😀  ', folderId: null, tagIds: [] }); }
async function openCopy(page: Page, id: string) {
  await page.goto(`/content/${id}/copy`); await expect(page.getByLabel('Title', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Create copy', exact: true })).toBeEnabled();
}
function gate() { let release!: () => void; let seen!: () => void; return { wait: new Promise<void>(r => { release = r; }), arrived: new Promise<void>(r => { seen = r; }), release: () => release(), seen: () => seen() }; }
test.beforeEach(async ({ request }) => { expect((await request.post('http://127.0.0.1:5080/__test/advance', { headers: { 'X-Test-Control': process.env.KEEMESE_UI_CONTROL! } })).ok()).toBeTruthy(); });

test('active and archived copies use independent create payloads, metadata, search and source integrity', async ({ page }) => {
  await tutor(page);
  const folder = await post(page, '/content/folders', { name: 'Copy lifecycle folder', parentId: null });
  const tag = await post(page, '/content/tags', { name: 'Copy lifecycle tag' });
  const original = await post(page, '/content', { title: 'Independent copy source', description: 'Source description', body: 'Source teaching text', folderId: folder.id, tagIds: [tag.id] });
  for (const archived of [false, true]) {
    const saved = archived ? await post(page, `/content/${original.id}/archive`, { version: original.version }) : original;
    await page.goto(`/content/${original.id}`); await expect(page.getByRole('button', { name: 'Create a copy', exact: true })).toBeEnabled();
    const writes: unknown[] = []; const listener = (r: import('@playwright/test').Request) => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/v1/content') writes.push(r.postDataJSON()); }; page.on('request', listener);
    await page.getByRole('button', { name: 'Create a copy', exact: true }).click(); await expect(page.getByLabel('Title', { exact: true })).toHaveValue(original.title); expect(writes).toEqual([]);
    await expect(page.getByLabel('Folder', { exact: true })).toHaveValue(folder.id); await expect(page.getByLabel('Selected tags')).toContainText(tag.name);
    const name = archived ? 'Archived copy unique' : 'Active copy unique'; await page.getByLabel('Title', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Create copy', exact: true }).click(); await expect(page.getByText('Content created.', { exact: true })).toBeVisible();
    const id = new URL(page.url()).pathname.split('/')[2]; const copy = await detail(page, id);
    expect(id).not.toBe(original.id); expect(copy).toMatchObject({ title: name, body: original.body, description: original.description, folderId: folder.id, tags: original.tags, archived: false, version: 1 });
    expect(new Date(copy.createdAt).getTime()).toBeGreaterThanOrEqual(new Date(original.createdAt).getTime());
    expect(await detail(page, original.id)).toEqual(saved); expect(writes).toEqual([{ title: name, description: original.description, body: original.body, folderId: folder.id, tagIds: [tag.id] }]); page.off('request', listener);
    await page.getByRole('link', { name: '← Content library' }).click(); await page.getByLabel('Browse folder').selectOption(folder.id); await page.getByLabel('Browse tag').selectOption(tag.id); await page.getByLabel('Search content', { exact: true }).fill(name); await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.locator('.content-list > li')).toHaveCount(1); await page.getByRole('link', { name, exact: true }).click();
    await page.getByLabel('Teaching text (optional)').fill('Independent revision'); await page.getByRole('button', { name: `Remove tag “${tag.name}”` }).click(); await page.getByRole('button', { name: 'Save changes' }).click(); await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible();
    expect(await detail(page, original.id)).toEqual(saved); expect(await detail(page, id)).toMatchObject({ body: 'Independent revision', tags: [], version: 2 });
  }
});

test('copy preserves maximum Unicode and inert text without suffixes, and source guards require explicit discard', async ({ page }) => {
  await tutor(page); const title = 'ế'.repeat(200); const body = '<script>window.copyExecuted=true</script>\n' + 'ữ'.repeat(50000 - '<script>window.copyExecuted=true</script>\n'.length); expect(body.length).toBe(50000);
  const original = await post(page, '/content', { title, body, description: '', folderId: null, tagIds: [] });
  await page.goto(`/content/${original.id}`); await page.getByLabel('Title', { exact: true }).fill('Unsaved'); await expect(page.getByRole('button', { name: 'Create a copy', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Reload saved content' }).click(); await expect(page.getByRole('button', { name: 'Create a copy', exact: true })).toBeDisabled(); await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Unsaved'); await page.getByRole('button', { name: 'Reload saved content' }).click(); await page.getByRole('button', { name: 'Discard edits and reload' }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(title); await page.getByRole('button', { name: 'Create a copy', exact: true }).click(); await expect(page.getByLabel('Teaching text (optional)')).toHaveValue(body);
  await page.getByRole('button', { name: 'Create copy', exact: true }).click(); await expect(page.getByText('Content created.', { exact: true })).toBeVisible();
  const copied = await detail(page, new URL(page.url()).pathname.split('/')[2]); expect(copied).toMatchObject({ title, body, folderId: null, tags: [], version: 1 }); expect(await detail(page, original.id)).toEqual(original); expect(await page.evaluate(() => 'copyExecuted' in window)).toBe(false);
  await page.goto(`/content/${original.id}`); await page.getByLabel('Description (optional)').fill('Pending source edit');
  const held = gate(); await page.route(`**/api/v1/content/${original.id}`, async route => { const response = await route.fetch(); held.seen(); await held.wait; await route.fulfill({ response }); });
  await page.getByRole('button', { name: 'Save changes' }).click(); await held.arrived; await expect(page.getByRole('button', { name: 'Create a copy', exact: true })).toBeDisabled(); held.release(); await page.unrouteAll({ behavior: 'wait' }); await expect(page.getByText('Changes saved.', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Create a copy', exact: true })).toBeEnabled();
  await post(page, `/content/${original.id}`, { title, description: 'Other tab source edit', body, version: 2 }); await page.getByLabel('Description (optional)').fill('Stale source draft'); await page.getByRole('button', { name: 'Save changes' }).click(); await expect(page.getByRole('alert')).toContainText('has changed'); await expect(page.getByRole('button', { name: 'Create a copy', exact: true })).toBeDisabled();

});

test('copy cancel is write-free, live translation preserves inputs and focus, and discard returns to source', async ({ page }) => {
  await tutor(page); const original = await source(page); await openCopy(page, original.id);
  const calls: string[] = []; page.on('request', r => { if (r.url().includes('/api/')) calls.push(r.method() + r.url()); });
  await page.getByLabel('Title', { exact: true }).fill('Bản nháp riêng'); await page.getByLabel('Title', { exact: true }).focus(); await page.locator('#ui-language').selectOption('vi'); await expect(page.getByLabel('Tiêu đề', { exact: true })).toBeFocused(); await expect(page.getByLabel('Tiêu đề', { exact: true })).toHaveValue('Bản nháp riêng'); expect(calls).toEqual([]);
  await page.locator('#ui-language').selectOption('en'); await page.getByRole('button', { name: 'Cancel copy' }).click(); await page.getByRole('button', { name: 'Keep editing' }).click(); await expect(page.getByRole('button', { name: 'Cancel copy' })).toBeFocused();
  await page.getByRole('button', { name: 'Cancel copy' }).click(); await page.getByRole('button', { name: 'Discard copy', exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/content/${original.id}$`)); expect(calls.filter(x => x.startsWith('POST'))).toEqual([]);
  await page.getByRole('button', { name: 'Create a copy', exact: true }).click(); await expect(page.getByLabel('Title', { exact: true })).toHaveValue(original.title); await page.getByRole('button', { name: 'Cancel copy' }).click(); await expect(page).toHaveURL(new RegExp(`/content/${original.id}$`));
});

test('read failures cannot create; old source reads and late saves cannot replace newer routes', async ({ page }) => {
  await tutor(page); const a = await source(page, 'Copy route A'); const b = await source(page, 'Copy route B');
  await page.route(`**/api/v1/content/${a.id}`, route => route.fulfill({ status: 404, json: { code: 'content_missing' } }));
  await page.goto(`/content/${a.id}/copy`); await expect(page.getByRole('alert')).toContainText('could not be found'); await expect(page.getByRole('button', { name: 'Create copy', exact: true })).toHaveCount(0); await page.unrouteAll({ behavior: 'wait' });
  await page.getByRole('button', { name: 'Try again', exact: true }).click(); await expect(page.getByLabel('Title', { exact: true })).toHaveValue(a.title);
  for (const failure of [false, true]) {
    await page.getByRole('link', { name: '← Content library' }).click();
    const read = gate(); await page.route(`**/api/v1/content/${a.id}`, async route => { const response = await route.fetch(); read.seen(); await read.wait; await route.fulfill(failure ? { status: 503, json: { code: 'service_unavailable' } } : { response }); });
    // SPA transitions preserve the running old request, exercising route-local ownership.
    await page.evaluate(id => { history.pushState(null, '', `/content/${id}/copy`); dispatchEvent(new PopStateEvent('popstate')); }, a.id); await read.arrived;
    await page.evaluate(id => { history.pushState(null, '', `/content/${id}/copy`); dispatchEvent(new PopStateEvent('popstate')); }, b.id); await expect(page.getByLabel('Title', { exact: true })).toHaveValue(b.title); read.release(); await page.unrouteAll({ behavior: 'wait' }); await expect(page.getByLabel('Title', { exact: true })).toHaveValue(b.title); await expect(page.getByRole('alert')).toHaveCount(0);
  }
  const save = gate(); await page.route('**/api/v1/content', async route => { const response = await route.fetch(); save.seen(); await save.wait; await route.fulfill({ response }); });
  await page.getByRole('button', { name: 'Create copy', exact: true }).click(); await save.arrived; await page.getByRole('link', { name: '← Content library' }).click(); await expect(page.getByRole('heading', { name: 'Content library', exact: true })).toBeVisible(); save.release(); await page.unrouteAll({ behavior: 'wait' }); await expect(page).toHaveURL(/\/content$/);
});

test('copy is a saved snapshot; deleted metadata rejects atomically and requires explicit repair', async ({ page }) => {
  await tutor(page); const folder = await post(page, '/content/folders', { name: 'Copy deleted folder', parentId: null }); const tag = await post(page, '/content/tags', { name: 'Copy deleted tag' });
  const original = await post(page, '/content', { title: 'Snapshot copy source', description: 'Original description', body: 'Snapshot bytes', folderId: folder.id, tagIds: [tag.id] });
  await openCopy(page, original.id);
  const updated = await post(page, `/content/${original.id}`, { title: 'Other tab title', description: '', body: 'Other tab body', folderId: null, tagIds: [], version: original.version });
  await post(page, `/content/${original.id}/archive`, { version: updated.version });
  await post(page, `/content/folders/${folder.id}/delete`, { version: folder.version }); await post(page, `/content/tags/${tag.id}/delete`, { version: tag.version });
  await page.getByRole('button', { name: 'Create copy', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Your draft is kept');
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(original.title); await expect(page.getByRole('button', { name: 'Create copy', exact: true })).toBeDisabled();
  await page.getByLabel('Folder', { exact: true }).selectOption(''); await page.getByRole('button', { name: 'Create copy', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('This tag could not be found'); await expect(page.getByRole('button', { name: 'Create copy', exact: true })).toBeDisabled();
  expect(await page.evaluate(async title => (await (await fetch('/api/v1/content?q=' + encodeURIComponent(title))).json()).items.length, original.title)).toBe(0);
  await page.getByRole('button', { name: `Remove tag “${tag.name}”` }).click(); await page.getByRole('button', { name: 'Create copy', exact: true }).click(); await expect(page.getByText('Content created.', { exact: true })).toBeVisible();
  expect(await detail(page, new URL(page.url()).pathname.split('/')[2])).toMatchObject({ title: original.title, description: original.description, body: original.body, folderId: null, tags: [], version: 1 }); expect(await detail(page, original.id)).toMatchObject({ title: updated.title, archived: true });
});

test('held create blocks synchronous resubmission and locale changes; uncertain committed response never retries itself', async ({ page }) => {
  await tutor(page); const original = await source(page, 'Held copy source'); await openCopy(page, original.id); const held = gate(); const payloads: unknown[] = [];
  await page.route('**/api/v1/content', async route => { payloads.push(route.request().postDataJSON()); const response = await route.fetch(); held.seen(); await held.wait; await route.fulfill({ response }); });
  await page.locator('form[aria-label="Text content"]').evaluate(form => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); await held.arrived;
  await page.locator('#ui-language').focus(); await page.locator('#ui-language').selectOption('vi'); await expect(page.locator('#ui-language')).toBeFocused(); await expect(page.getByRole('button', { name: 'Đang lưu…', exact: true })).toBeDisabled(); expect(payloads).toHaveLength(1); held.release(); await page.unrouteAll({ behavior: 'wait' }); await expect(page.getByText('Đã tạo nội dung.', { exact: true })).toBeVisible();
  await page.locator('#ui-language').selectOption('en'); await openCopy(page, original.id); let writes = 0;
  await page.route('**/api/v1/content', async route => { writes++; await route.fetch(); await route.abort('failed'); }); await page.getByRole('button', { name: 'Create copy', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('may have been saved'); await expect(page.getByLabel('Title', { exact: true })).toHaveValue(original.title); await page.locator('#ui-language').focus(); await page.locator('#ui-language').selectOption('vi'); await expect(page.locator('#ui-language')).toBeFocused(); await expect(page.getByRole('alert')).toContainText('có thể đã được lưu'); expect(writes).toBe(1); await page.unrouteAll({ behavior: 'wait' });
  const copies = await page.evaluate(async title => (await (await fetch('/api/v1/content?q=' + encodeURIComponent(title))).json()).items, original.title); expect(copies).toHaveLength(3);
});

test('expired copy drafts clear on real session rejection and students cannot request copy sources', async ({ page, request }) => {
  await tutor(page); const original = await source(page); await openCopy(page, original.id); await page.getByLabel('Title', { exact: true }).fill('Private ephemeral draft');
  await request.post('http://127.0.0.1:5080/__test/advance', { headers: { 'X-Test-Control': process.env.KEEMESE_UI_CONTROL! } }); await page.getByRole('button', { name: 'Create copy', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible(); await expect(page.locator('#content-title')).toHaveCount(0);
  await tutor(page); await post(page, '/students', { displayName: 'Copy isolated student', username: 'copystudent', temporaryPassword: 'Student temporary 123' }); await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Username', { exact: true }).fill('copystudent'); await page.getByLabel('Password', { exact: true }).fill('Student temporary 123'); await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Current password', { exact: true }).fill('Student temporary 123'); await page.getByLabel('New password', { exact: true }).fill('Student changed 123'); await page.getByLabel('Confirm new password', { exact: true }).fill('Student changed 123'); await page.getByRole('button', { name: 'Save new password' }).click();
  await page.getByLabel('Username', { exact: true }).fill('copystudent'); await page.getByLabel('Password', { exact: true }).fill('Student changed 123'); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(page.getByRole('heading', { name: 'My account', exact: true })).toBeVisible();
  const calls: string[] = []; page.on('request', r => { if (r.url().includes('/api/v1/content')) calls.push(r.url()); }); await page.goto(`/content/${original.id}/copy`); await expect(page.getByRole('heading', { name: 'Unable to open this page' })).toBeVisible(); expect(calls).toEqual([]);
  expect(await page.evaluate(async id => (await fetch('/api/v1/content/' + id)).status, original.id)).toBe(403);
});

test('copy states wrap across 64 bilingual cases, keyboard, contrast and two actual zoom cases', async ({ page }) => {
  test.setTimeout(120000); await tutor(page); await mkdir('e2e/artifacts', { recursive: true });
  const tag = await post(page, '/content/tags', { name: 'Copy geometry label — tiếng Việt' });
  const original = await post(page, '/content', { title: 'Nội dung nguồn dài — '.repeat(9), description: 'A private reusable source.', body: 'Plain teaching text', tagIds: [tag.id], folderId: null });
  await page.goto(`/content/${original.id}`); await expect(page.getByLabel('Title', { exact: true })).toBeVisible(); const rows: object[] = [];
  async function snapshot(template: string) {
    for (const locale of ['vi', 'en']) { await page.locator('#ui-language').selectOption(locale); for (const width of [320,360,390,430,768,1024,1280,1440]) {
      await page.setViewportSize({ width, height: 900 }); const metrics = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth, unlabeled: [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input,select,textarea')].filter(x => !x.labels?.length).length, small: [...document.querySelectorAll<HTMLElement>('button,input,select')].filter(x => x.getBoundingClientRect().width > 0 && x.getBoundingClientRect().height < 44).length }));
      expect(metrics.content).toBeLessThanOrEqual(width); expect(metrics.unlabeled).toBe(0); expect(metrics.small).toBe(0); rows.push({ template, locale, ...metrics }); if ([320,1280].includes(width)) await page.screenshot({ path: `e2e/artifacts/copy-${template}-${locale}-${width}.png`, fullPage: true });
    } }
  }
  await snapshot('source-action'); await page.getByRole('button', { name: 'Create a copy', exact: true }).click(); await expect(page.getByLabel('Title', { exact: true })).toHaveValue(original.title); await snapshot('initialized');
  // Current catalog labels change independently of the already initialized authored fields.
  await post(page, `/content/tags/${tag.id}`, { name: 'Renamed copy label', version: tag.version });
  await page.getByLabel('Title', { exact: true }).fill(''); await page.getByRole('button', { name: 'Create copy', exact: true }).click(); expect(await page.locator('#content-title').evaluate((x: HTMLInputElement) => x.validity.valueMissing)).toBe(true);
  await page.locator('#ui-language').selectOption('vi'); expect(await page.locator('#content-title').evaluate((x: HTMLInputElement) => x.validationMessage)).toContain('tiêu đề'); await page.locator('#ui-language').selectOption('en');
  await page.getByLabel('Title', { exact: true }).fill('Preserved copy validation draft');
  await page.route('**/api/v1/content', route => route.fulfill({ status: 400, json: { code: 'tag_missing' } })); await page.getByRole('button', { name: 'Create copy', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible(); await expect(page.getByLabel('Selected tags')).toContainText('Renamed copy label'); await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Preserved copy validation draft'); await snapshot('metadata-error'); await page.unrouteAll({ behavior: 'wait' });
  await page.getByRole('button', { name: 'Cancel copy' }).click(); await snapshot('discard');
  const contrast = await page.evaluate(() => {
    const lum = (c: string) => { const [r,g,b] = c.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v => { const x=v/255; return x<=.04045?x/12.92:((x+.055)/1.055)**2.4; }); return .2126*r+.7152*g+.0722*b; };
    return ['.copy-context .intro','.copy-context p + p','.confirmation p'].map(selector => { const s=getComputedStyle(document.querySelector(selector)!); const bg=selector.startsWith('.copy-context')?'rgb(247,249,252)':'rgb(255,243,244)'; const a=lum(s.color),b=lum(bg); return { selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05) }; });
  }); for (const row of contrast) expect(row.ratio).toBeGreaterThanOrEqual(4.5);
  for (const locale of ['vi','en']) { await page.locator('#ui-language').selectOption(locale); await page.setViewportSize({ width: 320, height: 320 }); const keep=page.getByRole('button', { name: locale==='vi'?'Tiếp tục chỉnh sửa':'Keep editing', exact:true }); await keep.focus(); await expect(keep).toBeInViewport(); await page.keyboard.press('Enter'); await expect(page.getByRole('button',{name:locale==='vi'?'Hủy bản sao':'Cancel copy',exact:true})).toBeFocused(); if(locale==='vi') await page.getByRole('button',{name:'Hủy bản sao',exact:true}).click(); }
  await writeFile('node_modules/.cache/copy-qa.json',JSON.stringify({rows,contrast},null,2));
  const directory=await mkdtemp(path.resolve('node_modules/.cache/zoom-profile-'));const extension=path.resolve('e2e/zoom-extension');const context=await chromium.launchPersistentContext(directory,{channel:'chromium',headless:true,viewport:{width:1280,height:900},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  try { const zoom=context.pages()[0]; const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');await tutor(zoom);await openCopy(zoom,original.id);
    await worker.evaluate(`(async()=>{const tabs=await chrome.tabs.query({});await chrome.tabs.setZoom(tabs.find(t=>t.url.startsWith('http://127.0.0.1:5173')).id,2);})()`);const cdp=await context.newCDPSession(zoom);const zoomRows:object[]=[];
    for(const locale of ['vi','en']){await zoom.locator('#ui-language').selectOption(locale);const m=await zoom.evaluate(()=>({width:innerWidth,dpr:devicePixelRatio,content:document.documentElement.scrollWidth}));expect(m.dpr).toBe(2);expect(m.width).toBe(640);expect(m.content).toBeLessThanOrEqual(640);zoomRows.push({locale,...m});const layout=await cdp.send('Page.getLayoutMetrics');const shot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:Math.ceil(layout.cssContentSize.width*m.dpr),height:Math.ceil(layout.cssContentSize.height*m.dpr),scale:1}});await writeFile(`e2e/artifacts/copy-zoom-${locale}.png`,Buffer.from(shot.data,'base64'));}
    await writeFile('node_modules/.cache/copy-zoom.json',JSON.stringify(zoomRows,null,2));
  }finally{await context.close();await rm(directory,{recursive:true});}
});
