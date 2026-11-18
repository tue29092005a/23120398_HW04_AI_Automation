import { Locator, Page } from '@playwright/test';
import { captureDialog } from '../fixtures/test-fixtures';

/** /forgot-password – two-step reset (request OTP, then set a new password). */
export class ForgotPasswordPage {
  readonly card: Locator;
  readonly emailInput: Locator;
  readonly requestOtpButton: Locator;
  readonly otpMessage: Locator;
  readonly otpInput: Locator;
  readonly newPasswordInput: Locator;
  readonly passwordInputs: Locator;
  readonly resetButton: Locator;
  readonly backButton: Locator;
  readonly stepIndicator: Locator;
  readonly backToLogin: Locator;

  constructor(readonly page: Page) {
    // Scope to <main> so header links ("Đăng nhập") never satisfy page checks.
    this.card = page.getByRole('main');
    // Labels in the SUT have no htmlFor, so getByLabel() cannot be used.
    const inputAfter = (label: string) =>
      this.card.locator('label', { hasText: label }).locator('xpath=following-sibling::input[1]');
    this.emailInput = inputAfter('Nhập Email');
    this.requestOtpButton = this.card.getByRole('button', { name: 'Lấy mã OTP' });
    this.otpMessage = this.card.getByText(/Mã OTP của bạn là:/);
    this.otpInput = inputAfter('Mã OTP');
    this.newPasswordInput = inputAfter('Mật khẩu mới');
    this.passwordInputs = this.card.locator('input[type="password"]');
    this.resetButton = this.card.getByRole('button', { name: 'Đặt lại mật khẩu' });
    this.backButton = this.card.getByRole('button', { name: /Quay lại/ });
    this.stepIndicator = this.card.getByText(/(Step|Bước)\s*[12]\s*\/\s*2/i);
    this.backToLogin = this.card.getByRole('link', { name: /login|đăng nhập/i });
  }

  async goto() {
    await this.page.goto('/forgot-password');
  }

  /** Step 1. Returns the alert text, or null when the OTP step opened. */
  async requestOtp(email: string): Promise<string | null> {
    await this.emailInput.fill(email);
    return captureDialog(this.page, () => this.requestOtpButton.click(), 1_500);
  }

  /** Reads the OTP the demo SUT prints instead of emailing it. */
  async issuedOtp(): Promise<string> {
    const text = (await this.otpMessage.textContent()) ?? '';
    const match = text.match(/Mã OTP của bạn là:\s*(\S+)/);
    if (!match) throw new Error(`OTP not found in "${text}"`);
    return match[1];
  }

  /** Step 2. Returns the alert text (null if the browser blocked submit). */
  async reset(otp: string, password: string): Promise<string | null> {
    await this.otpInput.fill(otp);
    await this.newPasswordInput.fill(password);
    return captureDialog(this.page, () => this.resetButton.click());
  }
}
