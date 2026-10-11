# Đặc tả hoàn thiện R&D — Chuỗi xử lý đến kết quả cuối

Nguồn: `QUY TRÌNH R&D.docx`, `STOCK_ITEMS (OFFICIAL)`, `LIST_OF_ITEM_ATTRIBUTES (OFFICIAL)`, `LIST_OF_BOM_VIEW (OFFICIAL)` và 10 TDS tham chiếu. Bản này bổ sung kỹ thuật xây hồ sơ, quyền phê duyệt, phát hành do tài liệu đầu vào chưa mô tả chi tiết.

## Yêu cầu đầu vào

Bộ cấu hình do kinh doanh nhận từ khách hàng: danh sách BTP/NVL, kích thước cm có thể 3 chiều, số lượng, dung sai, yêu cầu loại vật liệu, đóng gói/tiệt trùng và các điều kiện riêng. Phải giữ nguyên văn bản và dữ liệu tách có thể kiểm tra.

## Mục tiêu xử lý

1. Tra danh mục mã cấu kiện, có thể bắt đầu bằng thành phần hiếm để tìm ứng viên.
2. Tra mã thành phẩm/version qua BOM cấp 1; tách NVL cấp 2 để không đếm trùng, và đối chiếu từng cấu kiện trong TDS.
3. Dò tiếp cấu hình chi tiết BTP/NVL, SOP nếu có. SOP thiếu nghĩa là kết quả **chưa đủ chứng cứ**.
4. Nếu có mã phù hợp, đề nghị sử dụng mã hiện có; nếu không, đề xuất version hoặc mã mới. Vấn đề nhận định "gần giống" cần giải trình/QA, không tự quyết định bằng ngưỡng điểm.
5. Xây BOM, TDS, SOP chính thức bằng cách tái sử dụng các mã có xác minh; khi xuất hiện BTP/NVL mới phải khai báo rõ mã và BOM/SOP BTP.
6. Duyệt hai người; phát hành transaction bất biến và gói hồ sơ kết quả cuối.

## Dữ liệu cuối

- Bản kết luận: tên/nguồn yêu cầu, mã/version chọn hoặc mới, lý do, người duyệt, ngày duyệt.
- Bảng đối chiếu: đủ mọi dòng yêu cầu, lựa chọn mã tham chiếu, tình trạng khớp/sai khác, lý do điều chỉnh và cảnh báo TDS/SOP/bao bì.
- BOM thành phẩm: mã thành phẩm/version, STT, mã BTP/NVL, số lượng, kích thước/dung sai/chất liệu, nguồn xác minh.
- TDS: mô tả, thông số, bao bì, nhãn, điều kiện bảo quản, kiểm tra, tiệt trùng và bằng chứng thẩm định.
- SOP: mã/revision, mục đích, phạm vi, trách nhiệm, thiết bị, bảo hộ, thao tác/parameter/acceptance/record theo công đoạn và tài liệu tham chiếu.
- BTP/NVL mới: mã mới chính thức, mô tả, BOM nguyên liệu cấp 2 và SOP công đoạn nếu BTP.
- Nhật ký: lưu revision, submit, yêu cầu sửa, duyệt, phát hành, người thực hiện và thời gian.

## Cơ chế chặn chất lượng

- Không thể gửi duyệt nếu thiếu mã BTP/NVL, đơn vị/SL, chứng nhận nguồn, TDS/SOP chi tiết, giải quyết sai khác, bao bì gốc hay thông tin tiệt trùng. Có cả kiểm tra JS và SQL/RPC tại máy chủ.
- Không cho tự duyệt; chỉ role reviewer/admin có quyền duyệt. Khi phát hành, PostgreSQL transaction cấp mã/version và ghi các tài liệu điện tử; phiên bản phải duy nhất.
- Không cho sửa hồ sơ đã gửi duyệt/đã duyệt/đã phát hành. Không cấp mã tự động từ AI khi thiếu quy tắc cấp mã.
- Nếu không biết giá trị kỹ thuật, để trống và gắn nhãn CHỜ XÁC MINH; không tạo dữ kiện giả.

## Giới hạn và nội dung cần khách hàng xác nhận để go-live

- Quy ước cấp mã thành phẩm, BTP/NVL và phân quyền phê duyệt thực tế.
- SOP mẫu chuẩn và tiêu chuẩn nghiệm thu, kiểm soát công đoạn (chưa có trong ZIP).
- Cách xử lý sai lệch được phép chấp nhận và người có quyền ký.
- Mẫu biểu BOM/TDS/SOP công ty, quy cách PDF/XLSX chính thức, chuẩn nhãn và version.
- Nếu phát hành phải đồng bộ hệ thống ERP hiện có, cần tài liệu API/quy tắc tích hợp: bản này chỉ ghi kho Supabase.
