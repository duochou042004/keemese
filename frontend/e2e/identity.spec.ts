import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';

const tutorPassword = 'Tutor mật khẩu 123';
const temporary = 'Student tạm thời 456';
const changed = 'Student mới mật khẩu 789';
const reset = 'Student reset mật khẩu 012';
const longName = 'Nguyễn Hoàng Bảo An — Học sinh luyện giao tiếp tiếng Anh và chuẩn bị cho hành trình học tập mới';
const artifact = 'e2e/artifacts';

test.beforeEach(async ({ request }) => {
  const response = await request.post('http://127.0.0.1:5080/__test/advance', { headers: { 'X-Test-Control': process.env.KEEMESE_UI_CONTROL! } });
  expect(response.ok()).toBeTruthy();
});
async function login(page: Page, username = 'tutor', password = tutorPassword) {
  await expect(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await page.getByLabel('Tên đăng nhập', { exact: true }).fill(username);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  const response = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await response; await expect(page.getByRole('button', { name: 'Đang đăng nhập…' })).toHaveCount(0);
}
async function logout(page: Page) {
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
}
async function create(page: Page, username: string, name = 'Học sinh ' + username) {
  await page.getByRole('link', { name: 'Thêm học sinh', exact: true }).click();
  await page.getByLabel('Họ và tên', { exact: true }).fill(name);
  await page.getByLabel('Tên đăng nhập', { exact: true }).fill(username);
  await page.getByLabel('Mật khẩu tạm thời', { exact: true }).fill(temporary);
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  return new URL(page.url()).pathname;
}
async function rotate(page: Page, current = temporary, next = changed) {
  await expect(page.getByRole('heading', { name: 'Đổi mật khẩu', exact: true })).toBeVisible();
  await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(current);
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill(next);
  await page.getByLabel('Nhập lại mật khẩu mới', { exact: true }).fill(next);
  await page.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
}
async function seedRotatedStudent(page: Page, username: string) {
  await page.goto('/'); await login(page);
  const detail = await create(page, username); await logout(page);
  await login(page, username, temporary); await rotate(page); await login(page, username, changed);
  await expect(page.getByRole('heading', { name: 'Tài khoản của tôi', exact: true })).toBeVisible();
  return detail;
}

test('real tutor provisions two students; first login, safe own account and logout', async ({ page }) => {
  const pageErrors: string[] = []; page.on('pageerror', e => pageErrors.push(e.message));
  await page.goto('/'); await login(page, 'tutor', 'incorrect');
  await expect(page.getByRole('alert')).toContainText('không đúng');
  await expect(page.getByRole('alert')).toBeFocused();
  await mkdir(artifact, { recursive: true }); await page.screenshot({ path: `${artifact}/state-login-error.png`, fullPage: true });
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Tên đăng nhập', { exact: true })).toHaveValue('tutor');
  await login(page); await expect(page.getByRole('heading', { name: 'Chưa có học sinh' })).toBeVisible();
  await page.screenshot({ path: `${artifact}/state-empty-list.png`, fullPage: true });
  await create(page, 'ana', longName);
  await expect(page.getByRole('status')).toContainText('Đã tạo tài khoản');
  await page.getByRole('link', { name: '← Danh sách học sinh' }).click();
  await create(page, 'bao', 'Trần Gia Bảo'); await logout(page);
  const rosterRequests: string[] = [];
  page.on('request', r => { if (r.url().includes('/api/v1/students')) rosterRequests.push(r.url()); });
  await login(page, 'ana', temporary); await rotate(page, temporary, temporary);
  await expect(page.getByRole('alert')).toContainText('khác mật khẩu');
  await expect(page.getByLabel('Mật khẩu hiện tại')).toHaveValue('');
  await rotate(page); await expect(page.getByRole('status')).toContainText('Đã đổi mật khẩu');
  await login(page, 'ana', temporary); await expect(page.getByRole('alert')).toContainText('không đúng');
  await login(page, 'ana', changed); await expect(page.getByText(longName, { exact: true })).toBeVisible();
  await expect(page.getByText('Trần Gia Bảo', { exact: true })).toHaveCount(0);
  await page.goto('/students'); await expect(page.getByRole('heading', { name: 'Không thể mở trang này' })).toBeVisible();
  expect(rosterRequests).toHaveLength(0);
  await page.getByRole('link', { name: 'Quay về tài khoản' }).click(); await logout(page);
  await login(page, 'bao', temporary); await rotate(page); await login(page, 'bao', changed);
  await expect(page.getByText('Trần Gia Bảo', { exact: true })).toBeVisible();
  await expect(page.getByText(longName, { exact: true })).toHaveCount(0);
  await logout(page); expect(pageErrors).toEqual([]);
});

test('tutor reset and deactivation revoke an already open student browser on focus', async ({ page, browser }) => {
  const detail = await seedRotatedStudent(page, 'revoke');
  const tutorContext = await browser.newContext(); const tutor = await tutorContext.newPage();
  await tutor.goto('/'); await login(tutor); await tutor.goto(detail);
  await tutor.getByLabel('Mật khẩu tạm thời mới').fill(reset);
  await tutor.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
  await expect(tutor.getByRole('status')).toContainText('Đã đặt lại');
  await tutor.screenshot({ path: `${artifact}/state-reset-success.png`, fullPage: true });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await expect(page.getByText('Học sinh revoke', { exact: true })).toHaveCount(0);
  await login(page, 'revoke', changed); await expect(page.getByRole('alert')).toContainText('không đúng');
  await login(page, 'revoke', reset); await expect(page.getByRole('heading', { name: 'Đổi mật khẩu', exact: true })).toBeVisible();
  await rotate(page, reset, changed); await login(page, 'revoke', changed);
  await expect(page.getByText('Học sinh revoke', { exact: true })).toBeVisible();
  await tutor.getByRole('button', { name: 'Ngừng hoạt động', exact: true }).click();
  await tutor.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(tutor.getByRole('button', { name: 'Xác nhận ngừng hoạt động' })).toHaveCount(0);
  await tutor.getByRole('button', { name: 'Ngừng hoạt động', exact: true }).click();
  await tutor.getByRole('button', { name: 'Xác nhận ngừng hoạt động' }).click();
  await expect(tutor.getByRole('status')).toContainText('Đã ngừng hoạt động');
  await tutor.screenshot({ path: `${artifact}/state-inactive.png`, fullPage: true });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await login(page, 'revoke', changed); await expect(page.getByRole('alert')).toContainText('không đúng');
  await tutorContext.close();
});

test('duplicate/invalid form, slow and failed roster, stale mutation, expired session and failed logout recover safely', async ({ page, request }) => {
  await page.goto('/'); await login(page); const detail = await create(page, 'duplicate');
  await page.getByRole('link', { name: '← Danh sách học sinh' }).click();
  await page.getByRole('link', { name: 'Thêm học sinh', exact: true }).click();
  await page.getByLabel('Họ và tên', { exact: true }).fill('Giữ lại tên này');
  await page.getByLabel('Tên đăng nhập', { exact: true }).fill('duplicate');
  await page.getByLabel('Mật khẩu tạm thời', { exact: true }).fill('short');
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.getByLabel('Mật khẩu tạm thời', { exact: true })).toBeFocused();
  await page.getByLabel('Mật khẩu tạm thời', { exact: true }).fill(temporary);
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await expect(page.getByRole('alert')).toContainText('đã được sử dụng');
  await page.screenshot({ path: `${artifact}/state-duplicate.png`, fullPage: true });
  await expect(page.getByLabel('Họ và tên', { exact: true })).toHaveValue('Giữ lại tên này');
  await expect(page.getByLabel('Mật khẩu tạm thời', { exact: true })).toHaveValue('');
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/v1/students?page=*', async route => { await gate; await route.continue(); });
  await page.getByRole('link', { name: '← Danh sách học sinh' }).click();
  await expect(page.getByRole('status')).toContainText('Đang tải'); await page.screenshot({ path: `${artifact}/state-loading.png`, fullPage: true }); release(); await page.unrouteAll({ behavior: 'wait' });
  await expect(page.getByRole('list', { name: 'Danh sách học sinh' })).toBeVisible();
  await page.route('**/api/v1/students?page=*', route => route.abort());
  await page.goto('/students'); await expect(page.getByRole('alert')).toContainText('Không kết nối');
  await page.screenshot({ path: `${artifact}/state-network-error.png`, fullPage: true });
  await page.unroute('**/api/v1/students?page=*'); await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Danh sách học sinh' })).toBeVisible();
  await page.goto(detail);
  await page.route('**/credentials/reset', route => route.fulfill({ status: 409, contentType: 'application/problem+json', body: JSON.stringify({ code: 'stale_version' }) }));
  await page.getByLabel('Mật khẩu tạm thời mới').fill(reset); await page.getByRole('button', { name: 'Đặt lại mật khẩu', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('đã thay đổi'); await page.unroute('**/credentials/reset');
  await page.getByRole('button', { name: 'Tải lại hồ sơ' }).click(); await expect(page.getByRole('heading', { name: 'Học sinh duplicate' })).toBeVisible();
  await page.route('**/api/v1/auth/logout', route => route.abort());
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Chưa thể đăng xuất' })).toBeVisible();
  await page.screenshot({ path: `${artifact}/state-logout-error.png`, fullPage: true });
  await expect(page.getByText('Học sinh duplicate', { exact: true })).toHaveCount(0);
  await page.unroute('**/api/v1/auth/logout'); await page.getByRole('button', { name: 'Thử đăng xuất lại' }).click();
  await login(page);
  await request.post('http://127.0.0.1:5080/__test/advance', { headers: { 'X-Test-Control': process.env.KEEMESE_UI_CONTROL! } });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Danh sách học sinh' })).toHaveCount(0);
});

test('user switch cancels late private bytes and clears storage; cross-tab switch revalidates', async ({ page, context }) => {
  await page.goto('/'); await login(page); await create(page, 'switch-a');
  await page.getByRole('link', { name: '← Danh sách học sinh' }).click(); await create(page, 'switch-b');
  await logout(page); await login(page, 'switch-a', temporary); await rotate(page); await login(page, 'switch-a', changed);
  await expect(page.getByText('Học sinh switch-a', { exact: true })).toBeVisible();
  let intercepted!: () => void; const seen = new Promise<void>(resolve => { intercepted = resolve; });
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/v1/me/profile', async route => {
    const response = await route.fetch(); intercepted(); await gate;
    await route.fulfill({ response }).catch(() => {});
  });
  await page.goto('/me/account'); await seen; await expect(page.getByRole('status')).toContainText('Đang tải');
  await logout(page); await login(page, 'switch-b', temporary); await rotate(page); await page.unroute('**/api/v1/me/profile');
  await login(page, 'switch-b', changed); await expect(page.getByText('Học sinh switch-b', { exact: true })).toBeVisible();
  release(); await expect(page.getByText('Học sinh switch-a', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => ({ local: Object.keys(localStorage).filter(key => key !== 'keemese.uiLanguage').length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
  const tab = await context.newPage(); await tab.goto('/me/account'); await expect(tab.getByText('Học sinh switch-b', { exact: true })).toBeVisible();
  await logout(page); await expect(tab.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
});

test('eight-width visual, keyboard, contrast, short-height and 200-percent text zoom matrix', async ({ page, browserName }) => {
  test.setTimeout(120000); await mkdir(artifact, { recursive: true });
  const consoleErrors: string[] = []; const exceptions: string[] = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); }); page.on('pageerror', e => exceptions.push(e.message));
  const rows: object[] = [];
  const widths = [320, 360, 390, 430, 768, 1024, 1280, 1440];
  async function snapshot(template: string) {
    for (const language of ['en', 'vi'] as const) {
      await page.locator('#ui-language').selectOption(language);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const metrics = await page.evaluate(() => {
        const controls = [...document.querySelectorAll<HTMLElement>('input,button,select')].filter(e => e.getBoundingClientRect().width > 0);
        return { viewport: innerWidth, content: document.documentElement.scrollWidth,
          smallControls: controls.filter(e => e.getBoundingClientRect().height < 44).map(e => e.tagName),
          unlabeledInputs: [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select')].filter(e => !e.labels?.length).length };
      });
      expect(metrics.content).toBeLessThanOrEqual(metrics.viewport); expect(metrics.smallControls).toEqual([]); expect(metrics.unlabeledInputs).toBe(0);
      const file = `${artifact}/${template}-${language}-${width}.png`; await page.screenshot({ path: file, fullPage: true });
      rows.push({ template, language, route: new URL(page.url()).pathname, width, height: 900, scenario: 'synthetic long Vietnamese names; secret fields empty', file, metrics, result: 'passed' });
    }
    }
  }
  await page.goto('/'); await snapshot('login');
  await page.locator('#ui-language').focus(); await page.keyboard.press('Tab'); await expect(page.getByLabel('Tên đăng nhập', { exact: true })).toBeFocused();
  const focus = await page.getByLabel('Tên đăng nhập', { exact: true }).evaluate(e => ({ style: getComputedStyle(e).outlineStyle, width: getComputedStyle(e).outlineWidth }));
  expect(focus).toEqual({ style: 'solid', width: '3px' });
  await page.screenshot({ path: `${artifact}/keyboard-focus.png`, fullPage: true });
  await page.keyboard.type('tutor'); await page.keyboard.press('Tab'); await page.keyboard.type(tutorPassword); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Học sinh', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Danh sách học sinh' })).toBeVisible();
  await snapshot('list');
  await page.getByRole('link', { name: 'Thêm học sinh', exact: true }).click(); await snapshot('create');
  await page.getByLabel('Họ và tên', { exact: true }).fill(longName);
  await page.getByLabel('Tên đăng nhập', { exact: true }).fill('visual'); await page.getByLabel('Mật khẩu tạm thời', { exact: true }).fill(temporary);
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click(); await expect(page.getByRole('heading', { name: longName, exact: true })).toBeVisible();
  await snapshot('detail');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: 'Ngừng hoạt động', exact: true }).click();
  const cancel = page.getByRole('button', { name: 'Hủy', exact: true }); await cancel.focus(); await expect(cancel).toBeInViewport();
  await page.locator('#ui-language').selectOption('en');
  await page.getByRole('button', { name: 'Cancel', exact: true }).focus();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport();
  await page.screenshot({ path: `${artifact}/short-height-confirmation-en.png`, fullPage: true });
  await page.locator('#ui-language').selectOption('vi'); await cancel.focus();
  await page.screenshot({ path: `${artifact}/short-height-confirmation.png`, fullPage: true }); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Xác nhận ngừng hoạt động' })).toHaveCount(0);
  await logout(page); await login(page, 'visual', temporary); await snapshot('password');
  await rotate(page); await login(page, 'visual', changed); await expect(page.getByText(longName, { exact: true })).toBeVisible(); await snapshot('account');
  // Additional 200% text-size stress test. Actual browser zoom is a separate test below.
  await page.setViewportSize({ width: 640, height: 568 });
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('32px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: `${artifact}/account-text-zoom-200.png`, fullPage: true });
  await page.evaluate(() => document.documentElement.style.fontSize = '');
  // Measure browser-computed styles, so a CSS change cannot silently keep old palette results.
  const palette = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const rows = [{ name: 'body', foreground: root.color, background: root.backgroundColor }];
    for (const [name, tag, className] of [['muted', 'p', 'hint'], ['primary', 'button', 'primary'], ['error', 'div', 'notice error'], ['status', 'div', 'notice'], ['danger', 'button', 'danger'], ['inactive', 'span', 'badge inactive'], ['active', 'span', 'badge'], ['secondary', 'button', 'secondary'], ['danger-outline', 'button', 'danger-outline'], ['link', 'a', '']]) {
      const element = document.createElement(tag); element.className = className; document.body.append(element);
      const style = getComputedStyle(element); rows.push({ name, foreground: style.color, background: style.backgroundColor === 'rgba(0, 0, 0, 0)' ? root.backgroundColor : style.backgroundColor }); element.remove();
    }
    return rows;
  });
  const luminance = (color: string) => {
    const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(x => Number(x) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
  };
  const contrast = palette.map(({ name, foreground, background }) => {
    const a = luminance(foreground); const b = luminance(background); const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05); expect(ratio).toBeGreaterThanOrEqual(4.5); return { name, foreground, background, ratio };
  });
  expect(exceptions).toEqual([]);
  await writeFile(`${artifact}/qa.json`, JSON.stringify({ browserName, rows, contrast, focus, consoleErrors, exceptions, shortHeight: 'passed: keyboard cancel reachable at 320×568', textZoom: '200% root text at 640×568, screenshot; browser UI zoom separately verified', result: 'automated measurements passed; screenshots need human-agent visual inspection' }, null, 2));
});


test('actual Chromium browser zoom at 200 percent preserves all identity templates', async () => {
  test.setTimeout(90000);
  const directory = await mkdtemp(path.resolve('node_modules/.cache/zoom-profile-'));
  const extension = path.resolve('e2e/zoom-extension');
  const context = await chromium.launchPersistentContext(directory, {
    channel: 'chromium', headless: true, viewport: { width: 1280, height: 900 }, locale: 'vi-VN',
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const rows: object[] = [];
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    const page = context.pages()[0]; const cdp = await context.newCDPSession(page); await page.goto('http://127.0.0.1:5173');
    await expect(page.getByRole('heading', { name: 'Đăng nhập', exact: true })).toBeVisible();
    await worker.evaluate(`(async () => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find(t => t.url.startsWith('http://127.0.0.1:5173'));
      await chrome.tabs.setZoom(tab.id, 2);
    })()`);
    async function snap(template: string) {
      for (const language of ['en', 'vi'] as const) {
      await page.locator('#ui-language').selectOption(language);
      const metrics = await page.evaluate(() => ({ innerWidth, dpr: devicePixelRatio, rootText: getComputedStyle(document.documentElement).fontSize, content: document.documentElement.scrollWidth }));
      expect(metrics.dpr).toBe(2); expect(metrics.innerWidth).toBe(640); expect(metrics.content).toBeLessThanOrEqual(metrics.innerWidth);
      // Playwright's CSS-size screenshot clip is cropped under actual browser zoom.
      // Capture using browser protocol physical layout coordinates instead.
      const layout = await cdp.send('Page.getLayoutMetrics');
      const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: Math.ceil(layout.cssContentSize.width * metrics.dpr), height: Math.ceil(layout.cssContentSize.height * metrics.dpr), scale: 1 } });
      await writeFile(`${artifact}/browser-zoom-${template}-${language}-200.png`, Buffer.from(screenshot.data, 'base64'));
      rows.push({ template, language, ...metrics, result: 'passed' });
      }
    }
    await snap('login'); await login(page); await expect(page.getByRole('heading', { name: 'Học sinh', exact: true })).toBeVisible(); await snap('list');
    await page.getByRole('link', { name: 'Thêm học sinh', exact: true }).click(); await snap('create');
    await page.getByLabel('Họ và tên', { exact: true }).fill(longName); await page.getByLabel('Tên đăng nhập', { exact: true }).fill('zoom');
    await page.getByLabel('Mật khẩu tạm thời', { exact: true }).fill(temporary); await page.getByRole('button', { name: 'Tạo tài khoản' }).click();
    await expect(page.getByRole('heading', { name: longName, exact: true })).toBeVisible(); await snap('detail'); await logout(page);
    await login(page, 'zoom', temporary); await expect(page.getByRole('heading', { name: 'Đổi mật khẩu', exact: true })).toBeVisible(); await snap('password');
    await rotate(page); await login(page, 'zoom', changed); await expect(page.getByText(longName, { exact: true })).toBeVisible(); await snap('account');
    await writeFile(`${artifact}/browser-zoom.json`, JSON.stringify({ mechanism: 'chrome.tabs.setZoom(2) in a test-only disposable browser profile', physicalViewport: [1280, 900], rows }, null, 2));
  } finally { await context.close(); await rm(directory, { recursive: true }); }
});

test('typed dictionaries have identical complete keys and template parameters', async () => {
  const { en, vi } = await import('../src/i18n/messages');
  expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
  for (const key of Object.keys(vi) as (keyof typeof vi)[]) {
    expect(en[key].trim()).not.toBe(''); expect(vi[key].trim()).not.toBe('');
    expect(en[key].match(/\{\w+\}/g)).toEqual(vi[key].match(/\{\w+\}/g));
  }
});

async function switchLanguage(page: Page, language: 'vi' | 'en') {
  const selector = page.locator('#ui-language');
  await selector.focus(); await selector.selectOption(language);
  await expect(selector).toBeFocused(); await expect(page.locator('html')).toHaveAttribute('lang', language);
}

test('live language switching preserves forms, validation, error focus, pending requests and preference', async ({ page, context }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Đăng nhập · Keemese');
  await page.getByLabel('Tên đăng nhập', { exact: true }).fill('tutor');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('preserved secret');
  const requests: string[] = []; page.on('request', r => { if (r.url().includes('/api/')) requests.push(r.method() + new URL(r.url()).pathname); });
  await switchLanguage(page, 'en');
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue('tutor');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('preserved secret');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main');
  await expect(page).toHaveTitle('Sign in · Keemese'); expect(requests).toEqual([]);
  // Existing native custom validity changes in place, without reportValidity/focus movement.
  await page.getByLabel('Password', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  expect(await page.locator('#password').evaluate((e: HTMLInputElement) => e.validationMessage)).toBe('Please enter password.');
  await switchLanguage(page, 'vi');
  expect(await page.locator('#password').evaluate((e: HTMLInputElement) => e.validationMessage)).toBe('Vui lòng nhập mật khẩu.');
  await login(page, 'tutor', 'incorrect'); await expect(page.getByRole('alert')).toBeFocused();
  const count = requests.length;
  await switchLanguage(page, 'en'); await expect(page.getByRole('alert')).toContainText('incorrect'); expect(requests).toHaveLength(count);
  await switchLanguage(page, 'vi'); await expect(page.getByRole('alert')).toContainText('không đúng');
  // Hold the real login response while switching: one mutation, no revalidation, current-language result.
  let release!: () => void; let seen!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }); const intercepted = new Promise<void>(resolve => { seen = resolve; });
  await page.route('**/api/v1/auth/login', async route => { const response = await route.fetch(); seen(); await gate; await route.fulfill({ response }); });
  await page.getByLabel('Mật khẩu', { exact: true }).fill(tutorPassword);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click(); await intercepted;
  const pendingCount = requests.length;
  await switchLanguage(page, 'en'); await expect(page.getByRole('button', { name: 'Signing in…' })).toBeDisabled(); expect(requests).toHaveLength(pendingCount);
  release(); await page.unrouteAll({ behavior: 'wait' });
  await expect(page.getByRole('heading', { name: 'Students', exact: true })).toBeVisible();
  expect(requests.filter(x => x === 'POST/api/v1/auth/login')).toHaveLength(2);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('signed out safely');
  await switchLanguage(page, 'vi'); await expect(page.getByRole('status')).toContainText('Đã đăng xuất');
  await switchLanguage(page, 'en'); await page.reload(); await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('keemese.uiLanguage'))).toBe('en');
  const other = await context.newPage(); await other.goto('/'); await expect(other.locator('html')).toHaveAttribute('lang', 'en'); await other.close();
  await page.evaluate(() => localStorage.setItem('keemese.uiLanguage', 'invalid')); await page.reload(); await expect(page.locator('#ui-language')).toHaveValue('vi');
});

test('unavailable browser storage keeps an in-memory language and error-state selector', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await page.route('**/api/v1/auth/me', route => route.abort());
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Chưa thể kết nối' })).toBeVisible();
  await switchLanguage(page, 'en'); await expect(page.getByRole('heading', { name: 'Unable to connect' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Cannot reach the server');
  await page.reload(); await expect(page.locator('#ui-language')).toHaveValue('vi');
});

test('English tutor and student journey preserves names, typed forms, success notices and confirmation', async ({ page }) => {
  await page.goto('/'); await switchLanguage(page, 'en');
  async function englishLogin(username: string, password: string) {
    await page.getByLabel('Username', { exact: true }).fill(username); await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  }
  await englishLogin('tutor', tutorPassword); await page.getByRole('link', { name: 'Add student', exact: true }).click();
  await page.getByLabel('Full name', { exact: true }).fill(longName); await page.getByLabel('Username', { exact: true }).fill('bilingual');
  await page.getByLabel('Temporary password', { exact: true }).fill(temporary);
  const requests: string[] = []; page.on('request', r => { if (r.url().includes('/api/')) requests.push(r.url()); });
  await switchLanguage(page, 'vi'); await expect(page.getByLabel('Họ và tên')).toHaveValue(longName); await expect(page.getByLabel('Mật khẩu tạm thời', { exact: true })).toHaveValue(temporary);
  await switchLanguage(page, 'en'); expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: longName, exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Account created');
  const n = requests.length; await switchLanguage(page, 'vi'); await expect(page.getByRole('status')).toContainText('Đã tạo tài khoản'); await switchLanguage(page, 'en'); expect(requests).toHaveLength(n);
  await page.getByRole('button', { name: 'Deactivate', exact: true }).click();
  await switchLanguage(page, 'vi'); await expect(page.locator('#deactivate-question')).toHaveText(`Ngừng hoạt động tài khoản của ${longName}?`);
  await switchLanguage(page, 'en'); await expect(page.locator('#deactivate-question')).toHaveText(`Deactivate the account for ${longName}?`);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByLabel('New temporary password').fill(reset); await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Password reset'); await switchLanguage(page, 'vi'); await expect(page.getByRole('status')).toContainText('Đã đặt lại'); await switchLanguage(page, 'en');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click(); await englishLogin('bilingual', reset);
  await expect(page.getByRole('heading', { name: 'Change password', exact: true })).toBeVisible(); await expect(page).toHaveTitle('Change password · Keemese');
  await page.getByLabel('Current password', { exact: true }).fill(reset); await page.getByLabel('New password', { exact: true }).fill(changed); await page.getByLabel('Confirm new password', { exact: true }).fill(temporary);
  await switchLanguage(page, 'vi'); await expect(page.getByLabel('Mật khẩu hiện tại')).toHaveValue(reset); await switchLanguage(page, 'en');
  await page.getByRole('button', { name: 'Save new password' }).click(); await expect(page.getByRole('alert')).toContainText('do not match');
  await switchLanguage(page, 'vi'); await expect(page.getByRole('alert')).toContainText('chưa khớp'); await switchLanguage(page, 'en');
  await page.getByLabel('Current password', { exact: true }).fill(reset); await page.getByLabel('New password', { exact: true }).fill(changed); await page.getByLabel('Confirm new password', { exact: true }).fill(changed);
  await page.getByRole('button', { name: 'Save new password' }).click(); await expect(page.getByRole('status')).toContainText('Password changed');
  await englishLogin('bilingual', changed); await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible();
  await expect(page.getByText(longName, { exact: true })).toBeVisible(); await expect(page.getByText('bilingual', { exact: true })).toBeVisible();
  await page.goto('/students'); await expect(page.getByRole('heading', { name: 'Unable to open this page' })).toBeVisible();
  await switchLanguage(page, 'vi'); await expect(page.getByRole('heading', { name: 'Không thể mở trang này' })).toBeVisible();
});
