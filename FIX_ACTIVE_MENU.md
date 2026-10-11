# Khắc phục menu sidebar không tự active khi chuyển trang

## Nguyên nhân

Bản trước có CSS `.nav-links a:first-child`, khiến mục **Tổng quan** luôn được tô sáng dù URL đã đổi. Menu không có code theo dõi đường dẫn hiện tại.

## Đã sửa

- Thêm `components/portal-menu.tsx` dùng `usePathname()` từ `next/navigation`.
- Tự thêm class `active` và `aria-current="page"` cho mục ứng với URL hiện tại.
- Các trang chi tiết `/cases/:id` vẫn active mục **Hồ sơ R&D / Phát hành**.
- `/` chỉ active trên chính trang chủ; tránh nhận nhầm `/cases-old` với `/cases`.
- Loại bỏ CSS active cố định ở menu đầu tiên.
- Không thay đổi chế độ No Login, Supabase, SQL hay API.

## Nâng cấp bản đang chạy

**Cách khuyến nghị:** giải nén file ZIP này vào một thư mục mới, trống. Sao chép `.env.local` từ bản cũ, rồi chạy:

```powershell
npm install
npm run dev
```

Nếu giải nén đè lên thư mục cũ, hãy dừng server và xóa thư mục `.next` nếu vẫn thấy giao diện cũ:

```powershell
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm run dev
```

## Test

- `npm test` kiểm thử menu, logic dữ liệu và luồng No Login.
- Bấm lần lượt **Tổng quan**, **Phân tích cấu hình**, **Danh mục**, **Lịch sử**, **Phiếu đề xuất**, **Hồ sơ R&D**. Mỗi trang phải tô đúng một mục.
- Mở trực tiếp `/cases/ID` hoặc dùng Back/Forward, sidebar vẫn tô sáng **Hồ sơ R&D**.
