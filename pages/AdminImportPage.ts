import { Locator, Page, expect } from '@playwright/test';
import { ADMIN } from '../fixtures/test-fixtures';

/** Admin (port 5174) → "Sản phẩm" tab → "Import sản phẩm từ CSV" panel. */
export class AdminImportPage {
  readonly productsTab: Locator;
  readonly fileInput: Locator;
  readonly importButton: Locator;
  readonly preview: Locator;
  readonly result: Locator;
  readonly resultErrors: Locator;
  readonly productTable: Locator;

  constructor(readonly page: Page) {
    this.productsTab = page.getByRole('listitem').filter({ hasText: /^Sản phẩm$/ });
    const panel = page.locator('div.bg-blue-50').filter({ hasText: 'Import sản phẩm từ CSV' });
    this.fileInput = panel.locator('input[type="file"]');
    this.importButton = panel.getByRole('button', { name: /^(Import \d+ sản phẩm|Đang import\.\.\.)$/ });
    this.preview = panel.getByText(/Xem trước \(\d+ dòng\)/);
    this.result = panel.locator('p').filter({ hasText: /^(✅|❌)/ });
    this.resultErrors = panel.locator('li.text-red-600');
    this.productTable = page.locator('table').filter({ hasText: 'Tên SP' });
  }

  async open() {
    await this.page.goto(ADMIN);
    await this.productsTab.click();
    await expect(this.page.getByRole('heading', { name: 'Quản lý Sản phẩm' })).toBeVisible();
  }

  async upload(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
  }

  async submit() {
    await this.importButton.click();
    await expect(this.result).toBeVisible();
  }
}
