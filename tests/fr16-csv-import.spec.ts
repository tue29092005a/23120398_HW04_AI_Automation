import fs from 'node:fs';
import path from 'node:path';
import { test, expect, markKnownBug, API, createUser } from '../fixtures/test-fixtures';
import { AdminImportPage } from '../pages/AdminImportPage';
import manifest from '../data/fr16-import.json';

const FIXTURES = path.join(__dirname, '..', 'data', 'fr16');

type Product = { id: number; name: string; price: number };

/** Minimal CSV -> objects for API-level cases (fixtures used there have no quotes). */
function csvRows(file: string) {
  const [header, ...lines] = fs.readFileSync(path.join(FIXTURES, file), 'utf8').trim().split(/\r?\n/);
  const keys = header.split(',');
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [keys[i], v])));
}

test.describe('FR-16 Admin – import products from CSV', () => {
  for (const tc of manifest.cases) {
    test(`${tc.id} [${tc.technique}] ${tc.title}`, async ({ adminPage: page, request }) => {
      markKnownBug((tc as { bugs?: string[] }).bugs);
      const products = async (): Promise<Product[]> => (await request.get(`${API}/products`)).json();
      const before = await products();
      const maxIdBefore = Math.max(0, ...before.map((p) => p.id));
      const ex = tc.expect as Record<string, any>;

      if (tc.mode === 'api') {
        const headers: Record<string, string> = {};
        if (tc.auth === 'user') {
          const user = await createUser(request, `${test.info().project.name}-fr16`);
          headers.Authorization = `Bearer ${user.token}`;
        }
        const res = await request.post(`${API}/admin/import-products`, {
          headers,
          data: { products: csvRows(tc.file) },
        });
        expect(res.status()).toBe(ex.status);
      } else {
        const admin = new AdminImportPage(page);
        await admin.open();

        if (tc.mode === 'accept') {
          await expect(admin.fileInput).toHaveAttribute('accept', new RegExp(ex.accept));
          return;
        }

        await admin.upload(path.join(FIXTURES, tc.file));
        if (tc.mode === 'noRows') {
          await expect(admin.importButton).toHaveText(ex.buttonText);
          await expect(admin.importButton).toBeDisabled();
          await expect(admin.preview).toHaveCount(0);
        } else {
          if (ex.preview) await expect(admin.preview).toHaveText(`Xem trước (${ex.preview} dòng):`);
          await admin.submit();
          if (ex.message) await expect(admin.result).toContainText(ex.message);
          for (const e of ex.errors ?? []) await expect(admin.resultErrors).toContainText([e]);
          if (ex.listed) {
            await expect(admin.productTable.getByRole('row').filter({ hasText: ex.listed }).last()).toBeVisible();
          }
        }
      }

      await expect.poll(async () => (await products()).length, { message: 'products added' }).toBe(
        before.length + ex.inserted,
      );
      if (ex.names) {
        const added = (await products()).filter((p) => p.id > maxIdBefore).map((p) => p.name);
        expect(added).toEqual(ex.names);
      }
    });
  }
});
