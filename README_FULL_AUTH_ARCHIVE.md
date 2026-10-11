> **PHIÊN BẢN KHÔNG ĐĂNG NHẬP:** Đọc `README_NO_LOGIN.md` trước. Phần đăng nhập và quyền reviewer bên dưới là tài liệu lịch sử của bản Full có Auth, không áp dụng cho phiên bản này.

# R&D AI Assistant — FULL WORKFLOW (Next.js + Supabase + Vercel)

**Bản nâng cấp từ V2 theo QUY TRÌNH R&D.docx, ngày 11/10/2026.**

> Mục tiêu: từ cấu hình khách hàng → phân tích BTP/NVL → tra mã/version hiện có → đối chiếu BOM/TDS/SOP → quyết định dùng mã hiện có/tạo version/tạo mã mới → xây dựng tài liệu kỹ thuật → duyệt độc lập → phát hành mã + BOM/TDS/SOP điện tử → tải bộ hồ sơ ZIP, mở báo cáo HTML để **In → Lưu PDF**.
>
> Phân biệt rõ **CHƯA CÓ THÔNG TIN** và **ĐÃ PHÊ DUYỆT**. Bộ ZIP đầu vào **KHÔNG CÓ SOP nguồn** và **KHÔNG CÓ quy tắc cấp mã**, nên phần SOP tạo mẫu khung và phải được nhân sự R&D điền thông số, chứng cứ và QA duyệt. Không tự tuyên bố đã có SOP chính thức.

## 1. Cài đặt

Yêu cầu Node.js >= 20, npm, Supabase Project và Vercel (nếu deploy). Phần import PDF bằng `pdftotext` chỉ thực hiện trên máy import. Có thể không dùng OpenAI API nếu tài liệu theo định dạng STT.

```bash
npm install
cp .env.example .env.local
```

Windows PowerShell: `Copy-Item .env.example .env.local`.

`.env.local` cần:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=ONLY_FOR_LOCAL_IMPORT
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

`SUPABASE_SERVICE_ROLE_KEY` là bí mật: **chỉ dùng ở máy import dữ liệu có kiểm soát; không đưa key này vào Vercel**. Tuyệt đối không commit `.env.local`, Excel/PDF của công ty, hoặc đăng nội dung demo thật công khai.

### SQL

**Supabase mới:** SQL Editor → chạy nguyên file `db/schema.sql` (bao gồm V2 và Full).

**Đã chạy V2:** SQL Editor → chỉ chạy `db/migration_full.sql`.

**V1 chưa nâng cấp V2:** chạy `db/migration_v2.sql` rồi `db/migration_full.sql`.

Để có quy trình 2 người duyệt, tạo **hai tài khoản Auth** trong Supabase Dashboard: một kỹ sư và một QA/Reviewer. Khi tạo, trigger tự khởi tạo `rnd_profiles` vai trò `engineer`.

Đăng nhập bằng tài khoản admin Supabase SQL Editor và chạy **thay UUID chính xác** của tài khoản QA:

```sql
update public.rnd_profiles set role='reviewer'
where id='UUID-TAI-KHOAN-QA';
```

Chỉ quản trị Supabase được thực hiện thao tác trên; trong web không có tính năng tự tăng quyền. Reviewer **không được duyệt hồ sơ do mình tạo**. Không có nút xóa lịch sử hoặc sửa nội dung sau phát hành.

### Nhập 3 Excel chính thức và 10 TDS PDF

Giải nén ZIP gốc nằm **ngoài** mã nguồn web (đừng cho vào `public/`):

```bash
npm run import:data -- --directory "/duong-dan/CÁC TÀI LIỆU ĐÍNH KÈM"
npm run import:tds -- --directory "/duong-dan/CÁC TÀI LIỆU ĐÍNH KÈM/TDS THAM KHẢO"
```

**`pdftotext`** (Poppler) chỉ cần cài trên máy chạy lệnh import: Windows tải Poppler rồi thêm `bin` vào PATH; Ubuntu `sudo apt install poppler-utils`; macOS `brew install poppler`. PDF thiếu version phải xác minh rồi đổi tên trước khi import. TDS tham chiếu chưa được QA phê duyệt, chỉ giúp tra cứu.

Dữ liệu đầu vào: `STOCK_ITEMS (OFFICIAL).xlsx`, `LIST_OF_ITEM_ATTRIBUTES (OFFICIAL).xlsx`, `LIST_OF_BOM_VIEW (OFFICIAL).xlsx`, 10 TDS PDF. BOM cấp 1 khác BOM nguyên vật liệu cấp 2; import chống lặp NVL trong BOM phẳng, nhưng cần đối chiếu TDS của từng version.

### Chạy web

```bash
npm run dev
```

- `http://localhost:3000/login` — đăng nhập.
- `/analyze` — nhập yêu cầu; dùng nút **Nạp mẫu đủ 15 dòng** → **Phân tích & tìm mã phù hợp**.
- Sau khi xem từng ứng viên, bấm **Lập hồ sơ full / version mới**, **Hồ sơ mã hiện có**; hoặc **Không có mã phù hợp? Tạo hồ sơ mã mới đầy đủ**.
- `/cases` — hồ sơ, tình trạng xét duyệt, kết quả cuối.
- `/cases/[id]` — 6 tab: giải quyết sai khác, BOM, TDS, SOP, BTP/NVL mới, lịch sử & xuất file.
- `/demo` — demo đối chiếu từ dữ liệu tham chiếu thực, không cần Supabase, **chỉ bật khi local dev**.

## 2. Các bước nghiệp vụ đã nối trong code

1. **Nhận yêu cầu:** dán văn bản, có thể nạp mẫu 15 dòng; lưu nguyên văn cùng phiên phân tích.
2. **Tách kỹ thuật:** BTP/NVL; số lượng, kích thước rộng × dài × cao; dung sai; chất liệu; điều kiện bao bì, tiệt trùng. Người dùng phải kiểm tra lại dữ liệu AI/trích quy tắc.
3. **Tra mã:** từ danh mục BTP/NVL → BOM cấu kiện cấp 1 → danh sách mã thành phẩm/version ứng viên → TDS/BOM; xếp hạng bằng thuật toán có thể giải trình; không dùng điểm để tự phê duyệt.
4. **Chọn phương án:** dùng mã hiện có; tạo version mới; hoặc tạo mã mới. Dữ liệu nguồn/số thành phần được khóa lại để có thể truy xuất.
5. **Xây BOM mới:** 15 dòng đầu được đưa sang BOM nháp; mã chỉ tự sử dụng nếu ứng viên có bằng chứng khớp, nếu khác/thiếu mã sẽ để trống. Kỹ sư chọn mã BTP/NVL, sửa thông số và tick xác minh.
6. **Xây TDS:** cấu hình được dẫn từ cùng bảng BOM; nhập các phần tiêu chuẩn, bao bì, nhãn, kiểm tra, bảo quản, quy trình tiệt trùng và chứng cứ thẩm định.
7. **Xây SOP:** điền công đoạn, cách làm, thiết bị, thông số, điểm kiểm soát, biểu mẫu. Mẫu ban đầu là **KHUNG CHƯA THẨM ĐỊNH**.
8. **BTP/NVL mới:** thêm mã nội bộ, phân loại, mô tả; nếu BTP thì bắt buộc BOM nguyên vật liệu cấp 2 + SOP các bước. Mã không tự tạo từ LLM.
9. **Kiểm tra đủ điều kiện:** so lại SL/kích thước/tolerance/chất liệu BOM với yêu cầu gốc; sai khác và cảnh báo TDS/SOP phải có phương án giải quyết ≥15 ký tự; cần đủ SOP, dữ liệu tiệt trùng, chứng cứ nguồn.
10. **Duyệt & phát hành:** kỹ sư gửi; QA khác người lập phê duyệt hoặc yêu cầu sửa; QA phát hành từ trạng thái đã duyệt. SQL RPC thực hiện transaction sinh version + ghi danh mục (nếu tạo mới) + BOM + TDS + lưu SOP điện tử trong `rnd_released_dossiers` + audit.
11. **Xuất bộ cuối:** báo cáo HTML có chức năng In/Lưu PDF, ZIP chứa BOM/TDS/SOP CSV (mở Excel), bảng so sánh, hồ sơ JSON, BTP mới và lịch sử phê duyệt. ZIP trước phát hành có nhãn **DRAFT_NOT_VALID_FOR_PRODUCTION**.

## 3. Test

```bash
npm test
npm run typecheck
npm run build
node scripts/build-demo-dossier.mjs ./RND_AI_SAMPLE_DRAFT.zip
```

`npm test`: kiểm tra parser, BOM/TDS, so khớp, lưu điều kiện, validation và ZIP UTF-8. Chạy `npm run build` sau khi cài npm. Hệ thống được xây dựng trong môi trường thử nghiệm **không kết nối tới npm registry**, nên tác giả chưa thể xác thực build Next.js end-to-end hay chạy thử Supabase thực tế; đây là **hạn chế xác minh**, không phải khẳng định deploy thành công. Dùng Supabase test project trước production.

**Mẫu tham chiếu:** tài liệu Word chọn `TM.08.04-15`, version 2. Mã gần nhất này có hai sai khác Word nêu: túi kim chỉ 15×15 (TDS 18×20), tên khăn đa dụng (TDS khăn không keo). PDF còn có dấu hiệu bao bì giấy/PET khác yêu cầu Tyvek. Hệ thống không tự bỏ qua bất kỳ sai khác nào.

### Kịch bản nghiệm thu cần thực hiện trên Supabase test

1. Import Excel/TDS; kiểm tra `TM.08.04-15::2`, trích TDS và 55 dòng BOM nguồn ↔ 15 mã cấu kiện.
2. User A đăng nhập, nhập mẫu 15 thành phần → tìm mã → mở hồ sơ version mới → xuất ZIP nháp.
3. Thử gửi duyệt với mã BTP thiếu/SOP còn trống/bao bì sai: **phải bị chặn**.
4. Nhập đủ các mã và thông số **được kiểm chứng từ tài liệu thực**, cập nhật BTP mới nếu có, xử lý các sai khác, lưu revision → Gửi duyệt.
5. User A thử tự duyệt: **phải bị chặn**. User B có `reviewer` có thể yêu cầu sửa hoặc duyệt khi đủ bằng chứng.
6. Reviewer phát hành; trường hợp mã mới phải cung cấp mã theo chuẩn ERP hiện hành; version mới được tính tăng tại transaction có khóa; không trùng version.
7. Kiểm tra danh mục thành phẩm, `bom_components`, `tds_lines`, `rnd_released_dossiers` và lịch sử audit. Tải ZIP, mở HTML → In → PDF.
8. Hai trình duyệt cùng sửa cùng hồ sơ: revision khác nhau phải từ chối lưu chồng. Sau khi duyệt không sửa được hồ sơ.

## 4. Triển khai Vercel

Đẩy repo **private** lên GitHub (chỉ source; không kèm file công ty). Vercel → New Project → chọn Next.js → thêm **chỉ**:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=           # không bắt buộc
OPENAI_MODEL=gpt-4.1-mini # không bắt buộc
```

Sau đó deploy. Nhập Excel/PDF bằng CLI trên máy riêng, **không upload qua web public**. `/demo` bị tắt trên production mặc định. Đối với tác vụ tìm kiếm toàn bộ danh mục lớn, cấu hình duration Vercel phù hợp hoặc chuyển bước xử lý dài sang Supabase Edge Functions/queue: bản hiện tại có giới hạn bảo vệ theo số dòng và sẽ báo lỗi nếu nguồn vượt ngưỡng, **không âm thầm cắt dữ liệu**.

## 5. Kiến trúc và tệp quan trọng

- `lib/analyze.ts`, `lib/matching-engine.mjs`: tìm mã/version, đối chiếu.
- `lib/dossier.mjs`: tạo bộ nháp + validation kỹ thuật so với yêu cầu gốc.
- `lib/export-dossier.mjs`: báo cáo HTML, CSV Excel, tạo ZIP phụ thuộc chuẩn Node.
- `components/case-editor.tsx`: 6 tab toàn bộ hồ sơ.
- `app/api/cases/**`: tạo, đọc, lưu, submit, review, publish, export.
- `db/migration_full.sql`: RLS, phân quyền, RPC trạng thái và phát hành transaction, audit.
- `db/schema.sql`: tất cả bảng cho Supabase mới.
- `scripts/build-demo-dossier.mjs`: mẫu ZIP từ 15 yêu cầu gốc.
- `SPEC_FULL.md`: đặc tả đầu vào/đầu ra, kiểm tra và giới hạn.

## 6. Các giới hạn cần công bố

- Không có SOP nguồn nên **không thể tự phát hành một SOP có thông số sản xuất thật**. Giao diện hỗ trợ soạn đầy đủ, nhưng công đoạn thực tế/chuẩn thẩm định phải do nhân sự chuyên môn cung cấp.
- Quy tắc đặt mã, sơ đồ phê duyệt nội bộ, template pháp lý và quy trình nhập ERP chưa được cung cấp. Mã mới cần người được giao quyền nhập thủ công; phát hành vào **Supabase**, không tự đồng bộ ERP ngoài hệ thống.
- TDS PDF trích máy là dữ liệu tham khảo, phải kiểm tra OCR/parser và bằng chứng theo từng tài liệu.
- Xuất PDF qua trình duyệt In/Lưu PDF; ZIP có báo cáo HTML và CSV/JSON, **không chứa tệp PDF được tạo tự động**.
- Chưa có biên bản kiểm thử triển khai Supabase/Vercel thực tế; cần QA/IT chạy checklist trước khi dùng sản xuất.
- Các quyết định kỹ thuật, điều kiện tiệt trùng và chấp nhận sai lệch do QA/R&D chịu trách nhiệm; điểm so khớp không thay thế thẩm định.
