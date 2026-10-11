# R&D AI — Truy cập thẳng Dashboard (KHÔNG ĐĂNG NHẬP)

Phiên bản dựa trên source **Full Workflow**. Truy cập `/` sẽ vào Dashboard ngay; không có form email, mật khẩu, tài khoản Supabase Auth, nút đăng xuất hoặc chặn phiên. URL `/login` cũ chuyển thẳng về `/`.


> **Cập nhật từ bản Full/V2 trên Windows:** không giải nén đè nếu có thể. Nếu đang nâng cấp tại chỗ, chạy `npm run fix:legacy` rồi `npm run dev` để xóa `middleware.ts` và các file Supabase Auth còn sót. Xem `FIX_MIDDLEWARE_WINDOWS.md`.

## Những gì chạy được khi không đăng nhập

- `/`: Dashboard đọc thống kê từ Supabase.
- `/analyze`: nhập yêu cầu khách, tách danh sách thành phần, đối chiếu BOM/TDS và lưu lịch sử.
- `/catalog`, `/history`, `/proposals`: tra cứu danh mục, lịch sử dùng chung, phiếu đề xuất.
- `/cases`: xem toàn bộ hồ sơ dùng chung.
- `/cases/[id]`: chỉnh BOM/TDS/SOP, gửi duyệt, nhập **tên QA/người kiểm tra**, ý kiến duyệt, yêu cầu sửa hoặc duyệt, phát hành nếu dữ liệu hợp lệ.
- Xuất HTML/PDF qua trình duyệt hoặc ZIP BOM/TDS/SOP.

**Quan trọng:** tên QA là **tự khai báo, không phải xác minh danh tính**. Không còn đảm bảo quy trình hai người độc lập. Dữ liệu trong hồ sơ vẫn bị kiểm tra trước khi gửi duyệt và phát hành. Không nên coi việc bấm nút duyệt ở chế độ này là phê duyệt chất lượng được xác thực.

## 1. Chuẩn bị Supabase

Nếu Supabase **chưa có bảng**:
1. Supabase Dashboard → SQL Editor → chạy `db/schema.sql`.
2. Tiếp tục chạy `db/migration_no_login.sql`.

Nếu Supabase **đã dùng bản Full trước đó**: **chỉ cần** chạy `db/migration_no_login.sql`.

Nếu Supabase đang ở **V2**: chạy `db/migration_full.sql`, sau đó `db/migration_no_login.sql`.

Migration cho phép các bản ghi dùng chung không có `auth.users` và thay các SQL RPC lưu/gửi duyệt/duyệt/phát hành. Các RPC nhận lệnh **chỉ từ service_role qua Next.js server**. Đừng tắt Row Level Security và đừng gán quyền trực tiếp cho `anon`.

## 2. Cài biến môi trường (local)

```bash
npm install
cp .env.example .env.local
```

PowerShell: `Copy-Item .env.example .env.local`.

Điền:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_SECRET
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
RND_ALLOW_PUBLIC_ACCESS=false
```

Service-role key **bắt buộc để backend hoạt động khi không đăng nhập**. Chỉ lưu key ở `.env.local` hoặc **Vercel Environment Variables (server)**, tuyệt đối không đưa vào `NEXT_PUBLIC_`, frontend, GitHub hay câu trả lời công khai. `SUPABASE_ANON_KEY` không còn cần dùng cho web. Backend Supabase phải tồn tại và có dữ liệu nhập trước khi tìm mã.

## 3. Chạy web

```bash
npm run dev
```

Mở `http://localhost:3000/` → **Dashboard ngay**, không cần đăng nhập.

Nếu chưa có dữ liệu, nhập Excel/TDS bằng các script `npm run import:data` và `npm run import:tds`. Xem `README_FULL_AUTH_ARCHIVE.md` phần nhập dữ liệu (bỏ qua hướng dẫn Auth trong tài liệu cũ).

## 4. Deploy Vercel

Vercel Environment Variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_SECRET
RND_ALLOW_PUBLIC_ACCESS=true
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Đặt `RND_ALLOW_PUBLIC_ACCESS=true` **chỉ khi bạn đã chủ động quyết định cho truy cập không đăng nhập**. Mặc định sản xuất bị khóa để tránh vô tình đưa dữ liệu R&D nội bộ và thao tác phát hành ra internet.

### CẢNH BÁO BẢO MẬT

Khi bật `RND_ALLOW_PUBLIC_ACCESS=true` trên địa chỉ Vercel công khai, **bất kỳ ai có URL cũng có thể đọc dữ liệu R&D, tạo/sửa hồ sơ, tự khai tên người duyệt và bấm phát hành**, đồng thời API parse AI có thể phát sinh chi phí. Không dùng chế độ này cho dữ liệu sản xuất nhạy cảm trên miền công khai. Nếu thực sự cần dùng nội bộ mà không có form login, hãy giới hạn truy cập ở lớp mạng/Vercel (ví dụ chỉ IP nội bộ hoặc VPN) và bổ sung bảo vệ/rate limit API. Hệ thống không xác minh vai trò của người dùng ở chế độ này.

## 5. Khác với bản Full cũ

- Đã gỡ giao diện login/logout, Auth middleware, frontend browser-client Supabase.
- Đã đổi các API/Server Components sang **Supabase service role chỉ ở server**.
- `analysis_runs`, `change_proposals`, `rnd_cases` có thể lưu không cần người dùng `auth.users` sau migration.
- `reviewer_name` lưu họ tên do người bấm duyệt tự khai báo trong log và báo cáo.
- **Đã giữ** các bước validation kỹ thuật, optimistic revision khi lưu, khóa hồ sơ sau duyệt và transaction phát hành trong SQL.
- **Không còn** kiểm chứng độc lập người lập và người duyệt; nếu yêu cầu ký duyệt thực sự, phải khôi phục cơ chế xác thực hoặc dùng hệ thống phê duyệt ngoài.

## 6. Kiểm thử

```bash
npm test
npm run typecheck
npm run build
```

Các test logic có thể chạy mà không cần kết nối Supabase; kiểm thử quy trình DB thực và build Next.js cần npm dependencies và Supabase test project. Không coi trạng thái demo là đã nghiệm thu triển khai.
