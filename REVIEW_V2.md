# KIỂM TRA LẠI PROJECT R&D — 11/10/2026

## Vì sao bản đầu chưa giống quy trình?

| Điểm trong tài liệu | Bản 1 | Bản 2 hiện tại |
|---|---|---|
| Bước 1, 2: đọc cấu hình kỹ thuật | Tách được 2D; demo chỉ 3 dòng | Có ví dụ đầy đủ 15 dòng, giữ STT, BTP/NVL, rộng × dài × cao, dung sai ±5%, số lượng, chất liệu, ghi chú, Tyvek/tiệt trùng |
| Bước 3.1: tìm mã từ danh mục và BOM | Tìm sơ bộ, có thể loại mất mã | Vẫn xếp hạng trên BOM nhưng xem tối đa 160 ứng viên; đánh dấu nếu dữ liệu chưa đủ. Chưa bảo đảm duyệt mọi mã như quy trình thủ công |
| Bước 3.2: đối chiếu từng BTP/NVL với BOM, TDS, SOP | Không đọc bảng TDS | Script trích TDS bằng `pdftotext` để lưu bảng vào Supabase; so sánh theo bảng TDS thực, chống nhân số lượng từ BOM phẳng. SOP chỉ báo chưa có, không đoán |
| Bước 3.3: lựa chọn mã gần nhất | Chấm điểm mà không kiểm tra hết TDS | Hiển thị từng sai khác, mã + version, không gán 'hoàn thành' tự động |
| Bước 3.4: mã mới/version mới nếu mã cũ không đạt | Đề xuất gần như tự động khi có sai khác | Phân biệt rà soát mã hiện có và trường hợp cần đề xuất version mới |
| Bước 4–5: tạo mã và xây BOM/TDS/SOP | Chỉ có phiếu đề xuất | **CHƯA HOÀN CHỈNH**: có bảng BOM nháp để tham khảo và đính kèm phiếu đề xuất chờ duyệt, chưa tự cấp mã hoặc sinh hồ sơ chính thức |

## Dữ liệu nguồn đối chiếu thực tế

- Yêu cầu: hình trong `QUY TRÌNH R&D.docx`, 15 dòng (13 BTP, 2 NVL).
- TDS: `TDS THAM KHẢO/TM.08.04-15 (2).pdf`, gồm 16 dòng trình bày, nhưng 15 mã cấu kiện; `SP.01.01-04` lặp 2 dòng, tổng là 2 cái.
- BOM: `LIST_OF_BOM_VIEW (OFFICIAL).xlsx` có 55 dòng thuộc `TM.08.04-15`, version 2. Gộp thành 15 cấu kiện có `Show (Hiện trên TDS)=1`, khớp số lượng TDS.
- Sai khác Word nêu: STT 11 túi kim chỉ 15×15 so với 18×20; STT 13 khăn đa dụng so với khăn không keo.
- **Sai khác bổ sung theo PDF**: yêu cầu bao Tyvek, nhưng TDS version 2 ghi bao giấy/PET. Thông tin này không được Word liệt kê; cần R&D xác nhận.
- Bằng chứng tiệt trùng và SOP trong bộ tài liệu chưa đủ để kết luận hoàn thành task.

## Sử dụng bản sửa

- `/demo`: chạy thử bộ 15 yêu cầu và TDS version 2 có sẵn trong project, **không cần tài khoản hoặc Supabase trong chế độ phát triển (`npm run dev`); production tắt demo mặc định**, để xem so sánh trước.
- `/analyze`: muốn tìm mã trong toàn bộ Excel phải cấu hình Supabase, nhập 3 Excel và nhập TDS bằng script CLI (có Poppler `pdftotext`).
- SQL mới: `db/schema.sql`; nếu đã dùng V1, chạy `db/migration_v2.sql` rồi import TDS lại.

## Giới hạn, không được hiểu nhầm

1. Phân tích PDF theo bố cục TDS đang có. Một TDS khác định dạng hoặc bản scan có thể phải sửa/kiểm tra thủ công; trích xuất không phải kiểm duyệt nội dung.
2. So sánh NVL và chất liệu dựa trên mô tả danh mục/BOM/TDS chỉ là bước sàng lọc; chưa thay thế SOP BTP và phép đánh giá kỹ thuật.
3. Đề xuất mã/version/BOM/TDS/SOP mới vẫn chưa hoàn thiện, không tự xuất mã chính thức và không chỉnh dữ liệu ERP.
4. Chưa triển khai cơ chế duyệt từng sai khác, phân quyền approver và ký duyệt phát hành.
5. Cần cài dependency để xác minh `next build` trước khi deploy. Do npm registry không truy cập được từ môi trường tạo project, phần build chưa được xác thực ở đây.
