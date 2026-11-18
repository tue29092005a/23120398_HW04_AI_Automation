import { Locator, Page, expect } from '@playwright/test';

/**
 * The cart lives only in React state (CartContext), so a full page load
 * empties it. Every helper here navigates through in-app links instead of
 * page.goto().
 */
export class HomePage {
  constructor(readonly page: Page) {}

  productCard(name: string): Locator {
    return this.page
      .getByRole('main')
      .locator('div.border')
      .filter({ has: this.page.getByRole('heading', { name, exact: true }) });
  }

  async goHome() {
    await this.page.getByRole('banner').getByRole('link', { name: 'EShop' }).click();
    await expect(this.page.getByRole('heading', { name: 'Danh sách sản phẩm' })).toBeVisible();
  }

  /** Adds `qty` units of a product through its detail page. */
  async addToCart(name: string, qty: number) {
    await this.goHome();
    await this.productCard(name).getByRole('link', { name: 'Xem chi tiết' }).click();
    const detail = new ProductDetailPage(this.page);
    await detail.add(qty);
    await this.goHome();
  }
}

export class ProductDetailPage {
  readonly quantity: Locator;
  readonly addButton: Locator;

  constructor(readonly page: Page) {
    this.quantity = page.getByRole('main').locator('input[type="number"]');
    this.addButton = page.getByRole('button', { name: /Thêm vào giỏ hàng|Đã thêm/ });
  }

  async add(qty: number) {
    await this.quantity.fill(String(qty));
    // SUT quirk: the first click is swallowed (clickCount state), the second adds.
    await expect(async () => {
      await this.addButton.click();
      await expect(this.addButton).toHaveText('Đã thêm', { timeout: 500 });
    }).toPass({ timeout: 5_000 });
  }
}

export class CartPage {
  readonly rows: Locator;
  readonly total: Locator;
  readonly emptyMessage: Locator;
  readonly checkoutButton: Locator;

  constructor(readonly page: Page) {
    const main = page.getByRole('main');
    this.rows = main.locator('tbody tr');
    this.total = main.getByText('Tổng tạm tính:').locator('span');
    this.emptyMessage = main.getByRole('heading', { name: 'Giỏ hàng của bạn đang trống' });
    this.checkoutButton = main.getByRole('button', { name: 'Tiến hành thanh toán' });
  }

  async open() {
    await this.page.getByRole('banner').getByRole('link', { name: 'Giỏ hàng' }).click();
  }

  row(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  async remove(name: string) {
    await this.row(name).getByRole('button', { name: 'Xóa' }).click();
  }
}

export class CheckoutPage {
  readonly totalInput: Locator;
  readonly grandTotal: Locator;
  readonly confirmButton: Locator;
  readonly successHeading: Locator;

  constructor(readonly page: Page) {
    const main = page.getByRole('main');
    this.totalInput = main
      .locator('label', { hasText: 'Tổng tiền thanh toán' })
      .locator('xpath=following-sibling::input[1]');
    this.grandTotal = main.getByText(/^Tổng thanh toán:/);
    this.confirmButton = main.getByRole('button', { name: 'Xác Nhận Thanh Toán' });
    this.successHeading = main.getByRole('heading', { name: 'Thanh toán thành công!' });
  }
}
