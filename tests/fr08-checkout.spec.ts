import { test, expect, API, createUser, loginWithToken } from '../fixtures/test-fixtures';
import { HomePage, CartPage, CheckoutPage } from '../pages/ShopPages';
import data from '../data/fr08-checkout.json';

type Item = { product: string; qty: number };
const products = data.products as Record<string, { id: number; name: string; price: number }>;

async function fillCart(home: HomePage, items: Item[]) {
  for (const it of items) await home.addToCart(products[it.product].name, it.qty);
}

test.describe('FR-08 Checkout – cart total (BVA on quantity)', () => {
  for (const tc of data.cartTotals) {
    test(`${tc.id} [${tc.technique}] ${tc.title}`, async ({ userPage: page }) => {
      const home = new HomePage(page);
      const cart = new CartPage(page);
      await fillCart(home, tc.items);

      await cart.open();
      await expect(cart.rows).toHaveCount(tc.items.length);
      await expect(cart.total).toHaveText(tc.expectTotal);
    });
  }
});

test.describe('FR-08 Checkout – cart contents before checkout (HW04 additions)', () => {
  for (const tc of data.cartEdits) {
    test(`${tc.id} [${tc.technique}] ${tc.title}`, async ({ userPage: page }) => {
      const home = new HomePage(page);
      const cart = new CartPage(page);
      await fillCart(home, tc.items);
      await cart.open();
      await expect(cart.rows).toHaveCount(tc.items.length);

      if (tc.remove) {
        const before = await cart.total.textContent();
        await cart.remove(products[tc.remove].name);
        await expect(cart.total).not.toHaveText(before!);
      }

      await expect(cart.rows).toHaveCount(tc.expectRows.length);
      for (const row of tc.expectRows) {
        // last-but-one cell = "Thành tiền" (line subtotal)
        await expect(cart.row(products[row.product].name).locator('td').nth(3)).toHaveText(row.subtotal);
      }
      await expect(cart.total).toHaveText(tc.expectTotal);
    });
  }
});

test.describe('FR-08 Checkout – end-to-end flows', () => {
  for (const tc of data.checkoutFlows) {
    test(`${tc.id} [${tc.technique}] ${tc.title}`, async ({ userPage: page, request, user }) => {
      const home = new HomePage(page);
      const cart = new CartPage(page);
      const checkout = new CheckoutPage(page);
      await fillCart(home, tc.items);

      await cart.open();
      if (tc.expect.cartTotal) await expect(cart.total).toHaveText(tc.expect.cartTotal);
      await cart.checkoutButton.click();
      await expect(page).toHaveURL(/\/checkout$/);

      if (tc.expect.totalReadOnly) {
        // soft: keep going so the server-side checks below are still reported
        await expect.soft(checkout.totalInput, 'total must not be editable').not.toBeEditable();
      }
      if (tc.tamperTotal !== undefined) {
        await checkout.totalInput.fill(String(tc.tamperTotal));
      }

      await checkout.confirmButton.click();
      await expect(checkout.successHeading).toBeVisible();

      if (tc.expect.serverTotal !== undefined) {
        const myOrders = async () =>
          (await request.get(`${API}/orders/my-orders`, {
            headers: { Authorization: `Bearer ${user.token}` },
          })).json();
        // The order is written asynchronously; poll the API instead of sleeping.
        await expect.poll(async () => (await myOrders()).length).toBe(1);
        const [order] = await myOrders();
        expect.soft(order.total_amount, 'total stored on the server').toBe(tc.expect.serverTotal);
        if (tc.expect.serverStatus) expect.soft(order.status).toBe(tc.expect.serverStatus);
      }
      if (tc.expect.cartCleared) {
        await cart.open();
        await expect.soft(cart.emptyMessage).toBeVisible();
      }
    });
  }
});

test.describe('FR-08 Checkout – access rules', () => {
  for (const tc of data.access) {
    // Only `page` here: requesting `userPage` would log the "guest" in too.
    test(`${tc.id} [${tc.technique}] ${tc.title}`, async ({ page, request }) => {
      if (tc.scenario === 'guestCheckout') {
        await page.goto('/checkout');
        // Precondition: really a guest (header offers "Đăng nhập").
        await expect(page.getByRole('banner').getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
        await expect(page).toHaveURL(/\/login$/);
        await expect(new CheckoutPage(page).confirmButton).toHaveCount(0);
      } else {
        const user = await createUser(request, test.info().project.name);
        await loginWithToken(page, user.token);
        const cart = new CartPage(page);
        await cart.open();
        await expect(cart.emptyMessage).toBeVisible();
        await expect(cart.checkoutButton).toHaveCount(0);
      }
    });
  }
});

test.describe('FR-08 Checkout – API tampering', () => {
  for (const tc of data.apiTampering) {
    test(`${tc.id} [${tc.technique}] ${tc.title}`, async ({ request, user }) => {
      const auth = { Authorization: `Bearer ${user.token}` };
      const items = tc.items.map((it) => ({ ...products[it.product], quantity: it.qty }));

      const res = await request.post(`${API}/checkout`, {
        headers: auth,
        data: { items, total_amount: tc.total_amount },
      });
      const orders = await (await request.get(`${API}/orders/my-orders`, { headers: auth })).json();

      if (tc.expectServerTotal === null) {
        // Invalid order line: must be rejected and nothing stored.
        expect(res.status()).toBe(400);
        expect(orders).toHaveLength(0);
      } else if (res.ok()) {
        // Accepting is fine only if the server recalculated the amount.
        expect(orders[0].total_amount).toBe(tc.expectServerTotal);
      } else {
        expect(res.status()).toBe(400);
      }
    });
  }
});
