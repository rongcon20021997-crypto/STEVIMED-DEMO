# SỬA LỖI XUẤT PDF - data.trie (Windows / Next.js 15 / Vercel)

## Triệu chứng

Bấm **Báo cáo PDF**, **TDS PDF**, **SOP PDF** hoặc **Tải toàn bộ ZIP** báo lỗi 500:

```text
ENOENT: no such file or directory,
open 'C:\ROOT\node_modules\@foliojs-fork\fontkit\data.trie'
```

## Nguyên nhân

Phiên bản trước để Turbopack bundle package `pdfmake` và `@foliojs-fork/fontkit` vào server chunk. Fontkit dùng `fs` đọc `data.trie` tương đối theo thư mục gói, nhưng bản bundle có thể đổi `__dirname` thành đường dẫn ảo `C:\ROOT`. **Không phải lỗi Supabase hay dữ liệu R&D.**

## Đã sửa trong bản này

1. `next.config.ts`: `serverExternalPackages` cho `pdfmake`, `@foliojs-fork/pdfkit`, `@foliojs-fork/fontkit` để Node tải trực tiếp từ `node_modules`.
2. `next.config.ts`: `outputFileTracingIncludes` để Vercel mang theo `data.trie` và `vfs_fonts.js` trong API xuất file.
3. `lib/pdf-dossier.mjs`: dùng `createRequire(import.meta.url)` tải Node PdfPrinter và font VFS, giữ nguyên chữ Việt, watermark nháp và cấu trúc báo cáo.
4. `scripts/verify-pdf-runtime.mjs`: lệnh kiểm thử PDF thực, tạo lần lượt báo cáo, TDS, SOP và kiểm tra header/trailer/ZIP.

## Cập nhật trên Windows (PowerShell)

**Khuyến nghị:** giải nén bản mới vào **thư mục trống**, copy `.env.local` cũ vào. Không cần migration SQL Supabase.

```powershell
npm install
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm run verify:pdf
npm run dev
```

Vào `/cases/<ID>` thử **Báo cáo PDF**, **TDS PDF**, **SOP PDF**, **Tải toàn bộ ZIP**. `npm run verify:pdf` cần in `PASS report`, `PASS tds`, `PASS sop`, `PASS ZIP` thì mới xác nhận engine PDF chạy được trên máy.

Nếu bạn muốn sửa ngay trên thư mục cũ: thay hai file `next.config.ts`, `lib/pdf-dossier.mjs` tương ứng trong ZIP, rồi xóa `.next` và restart dev server. File `next.config.ts` đặc biệt quan trọng; sửa `lib` thôi sẽ không giải quyết triệt để lỗi.

### Vercel

Push source mới lên Vercel và chạy lại build/deploy. Giữ Node.js runtime cho API export và chắc chắn `pdfmake` nằm trong `dependencies`. Dùng `npm run build` trên máy sau khi cài npm để rà soát vấn đề dependency trước khi deploy.

## Giới hạn kiểm tra tại môi trường bàn giao

Do môi trường tạo source **không truy cập được npm registry**, không thể cài pdfmake/Next.js để chạy test PDF thực hoặc build Next tại đây. Bộ test logic/cấu hình vẫn chạy được. Chỉ xác nhận bản sửa đã hết lỗi runtime khi `npm run verify:pdf` và việc tải PDF trên máy của bạn thành công.
