import { test, expect, markKnownBug, apiLogin, createUser, API } from '../fixtures/test-fixtures';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import data from '../data/fr03-forgot-password.json';

type PasswordSpec = string | { pad: string; fill: string; length: number };
const msg = data.messages as Record<string, string>;

function buildPassword(p: PasswordSpec): string {
  return typeof p === 'string' ? p : p.pad + p.fill.repeat(p.length - p.pad.length);
}

function buildOtp(issued: string, otp: { mode: string; value?: string }): string {
  switch (otp.mode) {
    case 'issued':
      return issued;
    case 'truncate':
      return issued.slice(0, issued.length - 1);
    case 'append':
      return issued + (otp.value ?? '0');
    default:
      return otp.value ?? '';
  }
}

test.describe('FR-03 Forgot password – step 1 (request OTP)', () => {
  for (const tc of data.requestOtp) {
    test(`${tc.id} [${tc.technique}] ${tc.title}`, async ({ page }) => {
      markKnownBug((tc as { bugs?: string[] }).bugs);
      const fp = new ForgotPasswordPage(page);
      await fp.goto();

      const dialog = await fp.requestOtp(tc.email);

      if (tc.expect.dialog) expect(dialog).toBe(msg[tc.expect.dialog]);
      if (tc.expect.valueMissing) {
        expect(dialog).toBeNull();
        await expect(fp.emailInput).toHaveJSProperty('validity.valueMissing', true);
      }
      await expect(fp.otpMessage).toHaveCount(tc.expect.otpShown ? 1 : 0);
      await expect(fp.requestOtpButton).toBeVisible();
    });
  }
});

test.describe('FR-03 Forgot password – step 2 (reset with OTP)', () => {
  for (const tc of data.resetPassword) {
    test(`${tc.id} [${tc.technique}] ${tc.title}`, async ({ page, request, user }) => {
      markKnownBug((tc as { bugs?: string[] }).bugs);
      const fp = new ForgotPasswordPage(page);
      const newPassword = buildPassword(tc.password as PasswordSpec);
      await fp.goto();

      expect(await fp.requestOtp(user.email)).toBeNull();
      await expect(fp.otpMessage).toBeVisible();
      const otp = buildOtp(await fp.issuedOtp(), tc.otp);

      const dialog = await fp.reset(otp, newPassword);

      if (tc.expect.otpValueMissing) {
        expect(dialog).toBeNull();
        await expect(fp.otpInput).toHaveJSProperty('validity.valueMissing', true);
      } else {
        expect(dialog ?? '').toContain(msg[tc.expect.dialog!]);
      }
      if (tc.expect.url) await expect(page).toHaveURL(new RegExp(`${tc.expect.url}$`));

      // Server-side truth: can the account log in with the new password?
      const login = await apiLogin(request, user.email, newPassword);
      expect(login.ok(), 'login with new password').toBe(tc.expect.changed);
    });
  }

  const sweep = data.specialCharSweep;
  test(`${sweep.id} [${sweep.technique}] ${sweep.title}`, async ({ page, request }) => {
    markKnownBug((sweep as { bugs?: string[] }).bugs);
    for (const c of sweep.chars) {
      const user = await createUser(request, `sweep`);
      const password = sweep.template.replace('{c}', c);
      const fp = new ForgotPasswordPage(page);
      await fp.goto();
      await fp.requestOtp(user.email);
      const dialog = await fp.reset(await fp.issuedOtp(), password);
      expect.soft(dialog, `password "${password}"`).toBe(msg.success);
    }
  });
});

test.describe('FR-03 Forgot password – UI requirements', () => {
  for (const tc of data.uiChecks) {
    test(`${tc.id} [${tc.technique}] ${tc.title}`, async ({ page, user }) => {
      markKnownBug((tc as { bugs?: string[] }).bugs);
      const fp = new ForgotPasswordPage(page);
      await fp.goto();

      if (tc.check === 'stepIndicator') {
        await expect(fp.stepIndicator).toContainText(/1\s*\/\s*2/);
      }
      await fp.requestOtp(user.email);
      await expect(fp.otpMessage).toBeVisible();

      switch (tc.check) {
        case 'confirmField':
          await expect(fp.passwordInputs).toHaveCount(2);
          break;
        case 'stepIndicator':
          await expect(fp.stepIndicator).toContainText(/2\s*\/\s*2/);
          break;
        case 'backToLogin':
          // Assert first: click() on a missing element burns the whole 30 s test timeout.
          await expect(fp.backToLogin).toBeVisible();
          await fp.backToLogin.click();
          await expect(page).toHaveURL(/\/login$/);
          break;
        case 'passwordMasked':
          await expect(fp.newPasswordInput).toHaveAttribute('type', 'password');
          break;
        case 'otpWidth':
          expect(await fp.issuedOtp()).toMatch(/^\d{6}$/);
          break;
      }
    });
  }
});

test.describe('FR-03 Forgot password – API level', () => {
  const requestOtp = async (request: any, email: string) => {
    const res = await request.post(`${API}/forgot-password`, { data: { email } });
    expect(res.ok()).toBeTruthy();
    return (await res.json()).resetToken as string;
  };
  const reset = (request: any, email: string, resetToken: string, newPassword: string) =>
    request.post(`${API}/reset-password`, { data: { email, resetToken, newPassword } });

  for (const tc of data.api) {
    test(`${tc.id} [${tc.technique}] ${tc.title}`, async ({ request, user }) => {
      markKnownBug((tc as { bugs?: string[] }).bugs);
      switch (tc.scenario) {
        case 'crossAccount': {
          const other = await createUser(request, 'victim');
          const otpA = await requestOtp(request, user.email);
          await requestOtp(request, other.email);
          const res = await reset(request, other.email, otpA, 'Hacked@2026');
          // Guard against the 1-in-9000 chance that both OTPs collide.
          expect(res.status()).toBe(tc.expectStatus);
          expect((await apiLogin(request, other.email, other.password)).ok()).toBe(true);
          break;
        }
        case 'otpSample': {
          const widths = new Set<number>();
          for (let i = 0; i < tc.samples!; i++) {
            const otp = await requestOtp(request, user.email);
            widths.add(otp.length);
            expect.soft(otp, `sample #${i + 1}`).toMatch(/^\d{6}$/);
          }
          test.info().annotations.push({ type: 'observed widths', description: [...widths].join(',') });
          break;
        }
        case 'reuse': {
          const otp = await requestOtp(request, user.email);
          expect((await reset(request, user.email, otp, 'First@2026')).status()).toBe(200);
          expect((await reset(request, user.email, otp, 'Second@2026')).status()).toBe(tc.expectStatus);
          break;
        }
        case 'stale': {
          const first = await requestOtp(request, user.email);
          const second = await requestOtp(request, user.email);
          test.skip(first === second, 'both random OTPs happened to be equal');
          expect((await reset(request, user.email, first, 'Stale@2026')).status()).toBe(tc.expectStatus);
          break;
        }
        case 'weakPasswordApi': {
          const otp = await requestOtp(request, user.email);
          const res = await reset(request, user.email, otp, tc.password!);
          expect(res.status()).toBe(tc.expectStatus);
          expect((await apiLogin(request, user.email, tc.password!)).ok()).toBe(false);
          break;
        }
      }
    });
  }
});
