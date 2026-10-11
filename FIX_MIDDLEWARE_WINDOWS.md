# Sửa lỗi `Module not found: Can't resolve '@supabase/ssr'` (Windows)

Nguyên nhân: bản No Login **không dùng Supabase Auth**, nhưng khi giải nén đè source mới lên thư mục Full/V2, file `middleware.ts` của bản cũ không tự biến mất. Next.js vẫn nạp middleware và import `@supabase/ssr`.

## Cách 1: Dọn ngay project đang chạy (khuyên dùng)

Trong Terminal ở **thư mục gốc chứa `package.json`**, dừng `npm run dev` bằng Ctrl+C, sau đó:

```powershell
npm run fix:legacy
npm install
npm run dev
```

Ở bản FIX mới, `npm run dev` và `npm run build` cũng tự kiểm tra và dọn middleware cũ trước khi chạy. Lệnh `fix:legacy` sẽ chỉ xóa các file Auth cũ và cache `.next`, **không xóa `.env.local`, dữ liệu của bạn hay `node_modules`**.

Nếu bạn chưa có lệnh `fix:legacy` vì đang ở bản cũ, chạy trực tiếp:

```powershell
Remove-Item middleware.ts -Force -ErrorAction SilentlyContinue
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm run dev
```

Với folder đời cũ có `lib/supabase/server.ts` và `lib/supabase/client.ts`, hãy dùng bản FIX và chạy `npm run fix:legacy` để xóa hết các file dư.

## Cách 2: Cài mới hoàn toàn

Giải nén bản FIX vào **thư mục mới trống**, không đè lên folder cũ. Sao chép **chỉ** file `.env.local` từ thư mục cũ, sau đó:

```powershell
npm install
npm run dev
```

Mở `http://localhost:3000`: trang chủ là Dashboard (`app/(portal)/page.tsx`), không cần login.

## Nếu phát sinh lỗi Supabase khác

- Website cần `NEXT_PUBLIC_SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` trong `.env.local` để Dashboard lấy dữ liệu.
- Dự án mới cần chạy `db/schema.sql` và `db/migration_no_login.sql`; dự án đã có Full chỉ cần migration No Login.
- Sau khi thay đổi `.env.local`, khởi động lại `npm run dev`.
- Không thêm `@supabase/ssr` để che lỗi vì bản No Login đã loại bỏ Auth middleware.

**Bảo mật:** Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào client hoặc `NEXT_PUBLIC_`. Nếu deploy Vercel không login, cần hạn chế truy cập ở tầng mạng vì người có URL có thể thao tác dữ liệu.
