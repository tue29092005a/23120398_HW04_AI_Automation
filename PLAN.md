# Kế hoạch thực hiện HW04 – AI Automation Testing

- **MSSV:** 23120398
- **SUT:** EShop – https://github.com/ttbhanh/eshop-sut
- **Công cụ:** Playwright (TypeScript) + Playwright HTML Reporter (Allure là tùy chọn), Claude Code
- **Nguồn:** `23120398_HW02_AI_DomainTesting_100/Main_Report.md`
- **Điểm tự đánh giá dự kiến:** 090

---

## 1. Feature lấy từ HW02

| | Feature A | Feature B | Feature C |
|---|---|---|---|
| Pool | A | B | C |
| FR | **FR-03** Forgot password + OTP (2 bước) | **FR-08** Checkout | **FR-16** Import sản phẩm từ CSV (admin) |
| TC trong HW02 | 36 (TC01–25, BVA01–11) | 12 (TC01–07, BVA01–05) | 11 (TC01–08, BVA01–03) |
| Bug đã biết | 5 | 4 | 4 |
| URL | web `http://localhost:5173/forgot-password` | web `http://localhost:5173/checkout` | admin `http://localhost:5174` |

> FR-20 (mobile, Pool D) không dùng trong HW04.

### Cần bổ sung so với HW02
- [ ] **FR-16 chỉ có 11 TC**, phải thêm ít nhất 1 TC (kế hoạch: thêm 4).
- [ ] **FR-08 có đúng 12 TC**, nhưng TC05, TC06, BVA05 là gọi API trực tiếp. Thêm 3 TC chạy qua UI.
- [ ] Danh sách issue trong README và Main_Report của HW02 **lệch số**. Kiểm tra lại trên GitHub trước khi dẫn chiếu.

### Rủi ro kỹ thuật chính
- **3 browser dùng chung một DB SQLite**: FR-03 đổi mật khẩu, FR-08 tạo order, FR-16 thêm sản phẩm, nên các browser có thể ghi đè dữ liệu của nhau.
  → Mỗi browser dùng tài khoản riêng (`user-chromium@...`, `user-firefox@...`, `user-webkit@...`) và có fixture re-seed. Nếu cần thì chạy `workers: 1`.
- **Bug đã biết sẽ làm test fail có chủ đích.**
  → Đánh dấu bằng `test.fail()` kèm annotation `{ type: 'issue', description: '<link issue>' }` để report tách rõ "pass", "known bug" và "fail mới".

---

## 2. Phase 0: Môi trường và repo (khoảng 1 giờ)

- [ ] Clone `ttbhanh/eshop-sut`, chạy backend `:3000`, web `:5173`, admin `:5174`.
- [ ] Copy `seed-faker.js` từ HW02 để reset DB.
- [ ] Ghi lại tài khoản user và admin mẫu.
- [ ] Tạo **repo public riêng**: `23120398-HW04-Automation`. Không dùng repo nhóm `NguyenSonTung16/HW02` để tính commit.
- [ ] `npm init playwright@latest` (TypeScript), `npx playwright install` (chromium, firefox, webkit).
- [ ] Commit khởi tạo (không chạm `.spec`, chưa tính vào 8 commit).

---

## 3. Phase 1: Khung project (khoảng 1 giờ)

```
tests/
  fr03-forgot-password.spec.ts
  fr08-checkout.spec.ts
  fr16-csv-import.spec.ts
pages/
  ForgotPasswordPage.ts
  CartPage.ts
  CheckoutPage.ts
  AdminImportPage.ts
fixtures/
  test-fixtures.ts          # login qua API, re-seed DB, user riêng theo browser
data/
  fr03-forgot-password.json
  fr08-checkout.json
  fr16-import.json          # manifest: file CSV nào, kỳ vọng gì
  fr16/*.csv                # valid.csv, quoted-comma.csv, price-zero.csv, ...
scripts/
  run-all.sh                # 3 feature × 3 browser = 9 report
  extract-ai-log.mjs        # xuất AI Audit Report từ transcript
reports/
  fr03-chromium/ fr03-firefox/ fr03-webkit/
  fr08-chromium/ ...        # tổng 9 thư mục
```

### `playwright.config.ts`
- [ ] `projects`: `chromium`, `firefox`, `webkit`.
- [ ] Reporter:
  ```ts
  reporter: [['html', {
    outputFolder: process.env.REPORT_DIR ?? 'playwright-report',
    title: `Run by: 23120398 – ${new Date().toISOString()}`,
  }]],
  metadata: { 'Run by': '23120398', 'Timestamp': new Date().toISOString() },
  ```
- [ ] `use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' }`. Ảnh lúc fail dùng làm bằng chứng cho GitHub Issue.

---

## 4. Phase 2: Map test case sang automation

### 4.1 FR-03: Forgot password (22 TC trở lên)

| Nhóm | TC HW02 | Kỳ vọng khi chạy |
|---|---|---|
| Email ở step 1 | TC02, TC03, TC04 | pass |
| OTP sai / rỗng / chứa chữ (qua UI) | TC05, TC07, TC08, BVA08, BVA10 | pass |
| Policy mật khẩu | TC09–TC13, TC22, BVA01 | pass |
| Mật khẩu hợp lệ nhưng bị chặn | TC01, TC23 (7 ký tự đặc biệt), BVA02–BVA07 | **fail: BUG regex** |
| Khoảng trắng được chấp nhận | TC14 | **fail** |
| UI thiếu thành phần | TC15 (confirm), TC16 (step indicator), TC17 (back to login) | **fail** |
| Input mật khẩu bị che | TC24 | pass |
| Dùng lại OTP | TC19, TC20 | pass |
| API (bổ sung) | TC18 (độ dài OTP), TC21 (backend không kiểm tra policy) | **fail** |

Cấu trúc một dòng data:
```json
{ "id": "TC09", "technique": "EP", "email": "...", "otpMode": "issued|wrong|empty|custom",
  "otp": "", "password": "Ab@1xyz", "expect": { "dialog": "...", "changed": false } }
```

### 4.2 FR-08: Checkout (15 TC)
- Giữ TC01–TC07 và BVA01–BVA05.
- Thêm 3 TC chạy qua UI:
  - [ ] **TC08**: đổi số lượng trong giỏ thì tổng tiền cập nhật.
  - [ ] **TC09**: xóa item khỏi giỏ thì tổng tiền giảm.
  - [ ] **TC10**: sau khi checkout, order xuất hiện ở lịch sử đơn hàng.
- Nhóm sẽ fail vì bug đã biết: TC01, TC02, TC04–TC07, BVA05.

Cấu trúc một dòng data:
```json
{ "id": "BVA02", "items": [{ "productName": "iPhone 15", "qty": 2 }],
  "tamperTotal": null, "expectTotal": "60,000,000 ₫" }
```

### 4.3 FR-16: Import CSV (15 TC)
- Giữ TC01–TC08 và BVA01–BVA03.
- Thêm 4 TC:
  - [ ] **TC09**: file chỉ có header thì báo 0 sản phẩm được thêm.
  - [ ] **TC10**: tên sản phẩm chỉ gồm khoảng trắng thì bị từ chối.
  - [ ] **TC11**: dùng token của user thường gọi API import thì trả 403.
  - [ ] **TC12**: sau khi import, sản phẩm mới hiện trong danh sách admin.
- Upload bằng `setInputFiles('data/fr16/<file>.csv')`. Đếm số sản phẩm trước và sau qua API.
- Data-driven theo dạng **manifest JSON trỏ tới file CSV fixture**: JSON chứa kỳ vọng, CSV chứa input thật.

### 4.4 Các kiểu assertion (yêu cầu ít nhất 3, kế hoạch dùng 8)
1. `toHaveURL`: chuyển trang.
2. `toHaveText` / `toContainText`: thông báo, tổng tiền.
3. `toBeVisible` / `toHaveCount`: phần tử UI, số item trong giỏ.
4. `toHaveAttribute`: `type="password"`, `accept=".csv"`, `readonly`.
5. Kiểm tra API: `expect(res.status()).toBe(400)`.
6. `expect.poll`: số sản phẩm trong DB thay đổi đúng.
7. Bắt nội dung `dialog` (SUT dùng `alert`).
8. `expect.soft`: kiểm tra nhiều thuộc tính trong một test.

---

## 5. Phase 3: Sinh script bằng AI theo từng bước (khoảng 4 giờ)

Mỗi feature đi qua 6 prompt riêng. Mỗi prompt được ghi vào AI Audit Report:

1. **Phân tích**: đưa source (`ForgotPassword.jsx`, `Checkout.jsx`, `App.jsx` admin, `server.js`) và spec, yêu cầu AI liệt kê selector và rule nghiệp vụ.
2. **Data**: đưa bảng TC của HW02, yêu cầu AI sinh file `.json` / `.csv`.
3. **POM**: yêu cầu AI viết Page Object.
4. **Spec**: yêu cầu AI viết test data-driven (`for (const tc of data) test(...)`).
5. **Chạy và debug**: đưa lỗi thật cho AI.
6. **Human review**: bạn tự sửa và **commit ngay sau mỗi lần sửa**.

### Plan commit (12 commit chạm `.spec`, yêu cầu tối thiểu 8)

| # | Commit message |
|---|---|
| 1 | `feat(fr03): initial AI-generated spec` |
| 2 | `feat(fr08): initial AI-generated spec` |
| 3 | `feat(fr16): initial AI-generated spec` |
| 4 | `fix(fr03): replace nth-child selectors with getByRole` |
| 5 | `fix(fr03): handle alert dialog instead of waitForTimeout` |
| 6 | `fix(fr08): per-browser user to avoid shared-cart race` |
| 7 | `fix(fr08): assert server-side order total via API` |
| 8 | `fix(fr16): count products via API before/after import` |
| 9 | `test(fr16): add TC09–TC12 edge cases` |
| 10 | `test(fr08): add UI-level TC08–TC10` |
| 11 | `chore: mark known bugs with test.fail + issue annotation` |
| 12 | `refactor: move data to json/csv, remove inline arrays` |

### Bảng gap analysis (điền dần trong quá trình làm)

| Lỗi AI | Ví dụ (diff) | Nguyên nhân (prompt / model / feature) | Cách sửa |
|---|---|---|---|
| Selector dễ vỡ | `div:nth-child(3)` | AI không nhìn thấy DOM thật | `getByRole` / `getByLabel` |
| Wait flaky | `waitForTimeout(2000)` | Thói quen từ dữ liệu train | auto-wait / `waitForResponse` |
| Không xử lý `alert` | test treo hoặc bỏ qua thông báo | AI không biết SUT dùng `alert()` | `page.once('dialog', ...)` |
| Assertion yếu | FR-08 TC04 chỉ kiểm tra UI | Prompt không nêu kiểm tra trạng thái server | `GET /api/orders/my-orders` |
| Thiếu edge case | ký tự đặc biệt `@$!%*?&` | AI không biết rule nghiệp vụ | thêm dòng data |
| Test phụ thuộc nhau | 3 browser dùng chung user | Không có cách ly dữ liệu | user riêng theo browser + re-seed |
| Data hardcode | mảng inline trong spec | Prompt chưa yêu cầu tách data | chuyển sang `data/*.json` |

---

## 6. Phase 4: Chạy 9 lần và báo cáo bug (khoảng 1 giờ)

- [ ] `scripts/run-all.sh` lặp qua feature × browser:
  ```bash
  for f in fr03 fr08 fr16; do
    for b in chromium firefox webkit; do
      REPORT_DIR=reports/$f-$b npx playwright test tests/$f-*.spec.ts --project=$b
    done
  done
  ```
- [ ] Mở 9 report và chụp màn hình phần "Run by: 23120398" kèm ISO timestamp.
- [ ] Tạo khoảng **13 issue trên repo HW04** (bỏ 2 bug FR-20). Mỗi issue có ảnh từ `test-results/` và link tham chiếu issue HW02.
- [ ] Thêm issue mới nếu phát hiện bug mới (ví dụ WebKit hiển thị khác).
- [ ] Viết `Bug_Report.md`.
- [ ] Thêm mục **"TC không tự động hóa được"**, ví dụ:
  - OTP gửi qua email thật (SUT demo hiển thị OTP trên UI nên automation được; cần nói rõ giới hạn này).
  - TC18 / BVA11 lấy mẫu OTP với N=300: chỉ chạy trên một project vì không phụ thuộc browser.

---

## 7. Phase 5: Agent Skill (khoảng 1h30, 10 điểm)

- [ ] `.claude/skills/playwright-ddt/SKILL.md` gồm:
  - 6 bước như Phase 3;
  - checklist review: selector, wait, assertion, cách ly dữ liệu, data tách riêng;
  - template config "Run by".
- [ ] `scripts/extract-ai-log.mjs`: đọc transcript Claude Code (`~/.claude/projects/<project>/*.jsonl`) và xuất `AI_Audit_Report.md` (tool, thời gian, prompt, output).
- [ ] Quay video demo skill trên **feature thứ 4 (FR-05 Search)**, từ đầu tới lúc có report.

---

## 8. Phase 6: Video demo (khoảng 45 phút, 15 điểm)

Video từ 5 phút trở lên, unlisted, **bạn tự nói tiếng Việt**:
1. [ ] Chạy `whoami && hostname` trên terminal.
2. [ ] Giới thiệu cấu trúc repo và file data.
3. [ ] Chạy `run-all.sh` cho FR-08 trên 3 browser.
4. [ ] Mở HTML report có "Run by: 23120398" và timestamp.
5. [ ] **Kể một lỗi đã sửa trong script AI sinh ra** (đề xuất commit #7: assertion tổng tiền phía server), có `git diff`.
6. [ ] Mở GitHub Issue có ảnh chụp.

---

## 9. Phase 7: Tài liệu và nộp bài (khoảng 1h30)

- [ ] `README.md`: bảng tự đánh giá và test summary (3 feature, khoảng 52 TC automated / executed / passed / failed, 9 browser run, số bug, link video).
- [ ] `Main_Report.md` và `.pdf`: quy trình, gap analysis, các TC không tự động hóa được.
- [ ] `AI_Audit_Report.md` và `.pdf`: câu khai "I use AI tools for the following tasks," cùng log từng prompt.
- [ ] `AI_Critique.md` và `.pdf`: 200–300 từ.
- [ ] `Git_Commit_Log.txt`: `git log --stat > Git_Commit_Log.txt`.
- [ ] `Bug_Report.md` và ảnh chụp GitHub Issues.
- [ ] Thư mục `reports/` (9 HTML report).
- [ ] Link repo GitHub, link 2 video YouTube.
- [ ] Nén thành `23120398_HW04_AI_Automation_090.zip`.

### Bảng tự đánh giá

| No. | Criteria | Grade | Self-Assessed |
|---|---|---|---|
| 1 | Task 1 – Feature A (FR-03) | 25 | |
| 1 | Task 1 – Feature B (FR-08) | 25 | |
| 1 | Task 1 – Feature C (FR-16) | 25 | |
| 2 | Task 2 – Demo video | 15 | |
| 3 | Agent Skills | 10 | |
| | **Total** | **100** | |

---

## 10. Lịch đề xuất

| Buổi | Việc |
|---|---|
| 1 | Phase 0–1, FR-03 |
| 2 | FR-08, FR-16 |
| 3 | Phase 4 (chạy, tạo issue) và Agent Skill |
| 4 | 2 video và tài liệu, nộp bài |

---

## 11. Checklist tránh bị 0 điểm

- [ ] Mỗi feature có ít nhất 12 TC, data nằm trong file `.json` / `.csv` riêng
- [ ] Mỗi feature dùng ít nhất 3 kiểu assertion
- [ ] 9 HTML report có "Run by: 23120398" kèm ISO timestamp, chạy thật trên máy
- [ ] Ít nhất 8 commit chạm file `.spec.ts`
- [ ] Bug được ghi ở cả Markdown và GitHub Issues, mỗi issue có ảnh chụp
- [ ] Video có giọng thật và `whoami` / `hostname`
- [ ] AI Audit Report và AI Critique (Markdown + PDF)
- [ ] Đủ mọi file bắt buộc trong file zip
