import { test as base, expect, APIRequestContext, Dialog, Page } from '@playwright/test';
import knownBugs from '../data/known-bugs.json';

export const API = 'http://localhost:3000/api';
export const WEB = 'http://localhost:5173';
export const ADMIN = 'http://localhost:5174';
export const ADMIN_ACCOUNT = { email: 'admin@eshop.com', password: 'Admin123!' };

export type TestUser = { id: number; email: string; password: string; token: string };

let seq = 0;

/** Registers a brand-new user so every test (and every browser) owns its data. */
export async function createUser(
  request: APIRequestContext,
  tag: string,
  password = 'Test1234!',
): Promise<TestUser> {
  const email = `hw04-${tag}-${Date.now()}-${++seq}@test.local`.toLowerCase();
  const reg = await request.post(`${API}/register`, {
    data: { name: `HW04 ${tag}`, email, password },
  });
  expect(reg.ok(), 'register test user').toBeTruthy();
  const login = await request.post(`${API}/login`, { data: { email, password } });
  expect(login.ok(), 'login test user').toBeTruthy();
  const body = await login.json();
  return { id: body.user.id, email, password, token: body.token };
}

/**
 * Logs the web app in by seeding localStorage once (no addInitScript, so a
 * test can still log out / clear storage afterwards), then waits until
 * AuthContext has loaded /api/users/me and the header shows "Thoát".
 */
export async function loginWithToken(page: Page, token: string) {
  await page.goto('/');
  await page.evaluate((t) => window.localStorage.setItem('token', t), token);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Thoát' })).toBeVisible();
}

export async function apiLogin(request: APIRequestContext, email: string, password: string) {
  return request.post(`${API}/login`, { data: { email, password } });
}

export async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await apiLogin(request, ADMIN_ACCOUNT.email, ADMIN_ACCOUNT.password);
  expect(res.ok(), 'admin login').toBeTruthy();
  return (await res.json()).token;
}

export async function productCount(request: APIRequestContext): Promise<number> {
  const res = await request.get(`${API}/products`);
  return (await res.json()).length;
}

/**
 * Runs `action` and returns the text of the first alert() it triggers,
 * or null if no dialog shows up within `timeout` ms. The SUT reports most
 * results through window.alert, so this replaces arbitrary sleeps.
 */
export async function captureDialog(
  page: Page,
  action: () => Promise<unknown>,
  opts: { timeout?: number; until?: () => Promise<unknown> } = {},
): Promise<string | null> {
  let message: string | null = null;
  const onDialog = async (d: Dialog) => {
    message = d.message();
    await d.accept().catch(() => {});
  };
  page.on('dialog', onDialog);
  try {
    await action();
    if (message === null) {
      // Stop waiting as soon as a dialog shows up OR the caller's success
      // signal (`until`) is met – no fixed sleeps.
      const waits: Promise<unknown>[] = [page.waitForEvent('dialog', { timeout: opts.timeout ?? 3_000 })];
      if (opts.until) waits.push(opts.until());
      await Promise.race(waits).catch(() => {});
    }
  } finally {
    page.off('dialog', onDialog);
  }
  return message;
}

/**
 * Marks a data row that hits a known SUT defect as an expected failure and
 * links the GitHub issue in the HTML report.
 */
export function markKnownBug(bugIds: string[] | string | undefined) {
  if (!bugIds) return;
  const ids = Array.isArray(bugIds) ? bugIds : [bugIds];
  for (const id of ids) {
    const bug = (knownBugs as Record<string, { title: string; issue: string }>)[id];
    base.info().annotations.push({
      type: 'issue',
      description: bug ? `${id}: ${bug.title} – ${bug.issue}` : id,
    });
  }
  base.fail(true, `Known defect: ${ids.join(', ')}`);
}

type Fixtures = {
  /** A fresh user registered through the API for this test only. */
  user: TestUser;
  /** A web page whose localStorage already carries `user`'s token. */
  userPage: Page;
  /** An admin page (port 5174) already logged in through localStorage. */
  adminPage: Page;
  adminToken: string;
};

export const test = base.extend<Fixtures>({
  user: async ({ request }, use, testInfo) => {
    await use(await createUser(request, testInfo.project.name));
  },
  userPage: async ({ page, user }, use) => {
    await loginWithToken(page, user.token);
    await use(page);
  },
  adminToken: async ({ request }, use) => {
    await use(await adminToken(request));
  },
  adminPage: async ({ page, adminToken }, use) => {
    await page.addInitScript((t) => window.localStorage.setItem('adminToken', t), adminToken);
    await use(page);
  },
});

export { expect };
