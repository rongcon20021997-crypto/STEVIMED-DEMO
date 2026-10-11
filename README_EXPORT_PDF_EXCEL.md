# Xuất PDF và Excel - R&D AI Full No Login

## 1. Chức năng đã sửa

Vào **Hồ sơ R&D > mở hồ sơ chi tiết `/cases/[id]`**. Thanh trên cùng có hai nút: **Báo cáo PDF**, **Tải toàn bộ ZIP**. Ở tab **Nhật ký & xuất file** có đầy đủ bảy nút:

| Nút | API `format` | File tải về |
|---|---|---|
| Báo cáo R&D (PDF) | `report-pdf` | `Bao_cao_RND_...pdf` |
| BOM (Excel) | `bom-xlsx` | `BOM_thanh_pham_...xlsx` (BOM, sai khác, BOM BTP mới) |
| TDS (Excel) | `tds-xlsx` | `TDS_thanh_pham_...xlsx` |
| TDS (PDF) | `tds-pdf` | `TDS_thanh_pham_...pdf` |
| SOP (PDF) | `sop-pdf` | `SOP_san_xuat_...pdf` |
| Đối chiếu (Excel) | `differences-xlsx` | `Doi_chieu_sai_khac_...xlsx` |
| Tải toàn bộ ZIP | `zip` | `HO_SO_RND_...zip` |

**ZIP mới** chứa các PDF/XLSX giống các nút tải riêng, cùng dữ liệu JSON và lịch sử phê duyệt. Nội dung luôn được xuất từ **revision đã lưu trong Supabase**; nếu đang sửa trên giao diện thì cần bấm **Lưu hồ sơ** trước khi tải.

Tài liệu có nhãn **BẢN NHÁP** nếu `status` khác `published`. Tài liệu nháp không được xem là hồ sơ phát hành cho sản xuất. Danh tính người duyệt trong chế độ không đăng nhập chỉ được nhập tự khai báo.

## 2. Cài đặt trên Windows

**Khuyến nghị: giải nén project mới vào thư mục trống** thay vì đè lên thư mục cũ; sao chép `.env.local` hiện có sang. Giữ nguyên Supabase database trước đây.

```powershell
npm install
npm run dev
```

Mở `http://localhost:3000` → **Hồ sơ R&D** → mở một hồ sơ → tab **Nhật ký & xuất file** → thử từng định dạng. File PDF được tạo trên Next.js server bằng `pdfmake`, dùng font Roboto tiếng Việt **đóng gói trong thư viện npm** (không tải font khi người dùng bấm nút). File Excel `.xlsx` được dựng trực tiếp bằng OpenXML, không cần Excel/LibreOffice trên server.

Không phải chạy lại SQL migration chỉ vì thay đổi chức năng xuất file. Nếu chưa có database hoặc đang nâng cấp từ V2, vẫn dùng migration như hướng dẫn trong `README.md`.

## 3. Cập nhật lên Vercel

Triển khai source mới và để Vercel cài dependency với `npm install`. Library **pdfmake** nằm trong `dependencies`, không ở `devDependencies`. Các API xuất file chạy `nodejs runtime`; cần đủ bộ nhớ để sinh ZIP gồm nhiều PDF và Excel. Không chuyển các API này sang Edge runtime.

Giữ nguyên biến môi trường server Supabase và chỉ bật `RND_ALLOW_PUBLIC_ACCESS=true` khi đã bảo vệ website ở lớp mạng. Vì không có login, mọi người truy cập được web có thể xem và sửa hồ sơ.

## 4. Kiểm tra

```powershell
npm test
npm run typecheck
npm run build
```

Bộ kiểm thử có bài test XLSX thông qua file ZIP OpenXML và phép kiểm tra nhãn bản nháp, các nút menu. Khi chạy máy thực có thể thử:

1. Xuất BOM Excel, mở kiểm tra ba sheet, tên tiếng Việt và số lượng.
2. Xuất TDS PDF và SOP PDF, đảm bảo không lỗi font tiếng Việt.
3. Xuất ZIP, giải nén; mở PDF và Excel, đối chiếu với hồ sơ đang lưu.
4. Sửa một ô BOM nhưng **không lưu**; xác nhận cảnh báo và file xuất chưa nhận thay đổi.
5. Phát hành một hồ sơ đã được phê duyệt thực sự; xác minh nhãn BẢN NHÁP được thay bởi ĐÃ PHÁT HÀNH.

Tài liệu **PDF và XLSX không tự bổ sung thông số SOP/TDS còn thiếu**. Các trường chưa đủ dữ liệu tiếp tục để trống và bị chặn phê duyệt bởi chức năng kiểm tra hồ sơ.

## 5. File code đã chỉnh

- `app/api/cases/[id]/export/route.ts`: API đa định dạng và MIME đúng.
- `lib/pdf-dossier.mjs`: PDF báo cáo, TDS, SOP tiếng Việt và đóng dấu trạng thái.
- `lib/xlsx-dossier.mjs`: Excel BOM, TDS, bảng so sánh.
- `lib/export-dossier.mjs`: ZIP chứa PDF/XLSX nhị phân.
- `components/case-editor.tsx`: các nút tải file và cảnh báo thay đổi chưa lưu.
- `tests/export-real-documents.test.mjs`: kiểm thử tài liệu.

**Chưa xác minh build tích hợp Next.js/Supabase/Vercel trong môi trường tác giả** do môi trường không tải được dependency từ npm. Hãy chạy kiểm thử và tải PDF trên máy trước khi deploy công khai.
