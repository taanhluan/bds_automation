# Hướng dẫn phát triển FB_CT

## Nguyên tắc cốt lõi của dự án (Core Principles)
1. **Không thay đổi cấu trúc:** Bảo toàn kiến trúc phân tầng chuẩn `client/` (React/Vite), `server/` (Express), `data/` (SQLite), `tests/`. Giữ nguyên luồng API, routing và convention hiện có; không tự ý thêm bớt dependency hay đảo lộn tổ chức code.
2. **Security tuyệt đối:** Không commit credentials, `.env.local`, API key (OpenAI), mật khẩu, cookie, database SQLite, file ảnh đã tạo vào Git/frontend/log. Chặn toàn bộ dotfiles/source/data/tests; phiên admin dùng cookie HttpOnly/Secure/SameSite=Strict. Public API chỉ trả về whitelist dữ liệu đã duyệt.
3. **Grounding & Dữ kiện xác thực:** Không suy đoán hay bịa đặt số liệu, giá, quy hoạch, thời gian di chuyển hay cam kết sinh lời. Chỉ phân tích từ RSS VnExpress thực tế và context được cung cấp. Ảnh AI là minh họa, bắt buộc có nhãn rõ.
4. **Human-in-the-Loop:** Tự động đăng Facebook đang TẮT. Duyệt (Approved) $\neq$ Copy (Copied) $\neq$ Đã đăng (Marked Posted). Duyệt lên landing page Vincente Realty không đồng nghĩa đã đăng Facebook. Sửa bài/ảnh sẽ tự động thu hồi trạng thái duyệt.
5. **Kiểm soát chi phí & Quota:** Giới hạn 3–5 bài/ngày, dùng cache cho nội dung/ảnh trùng, không tự ý retry ngầm khi gặp lỗi API tốn phí. Tối ưu nén asset và lazy-load cho hạ tầng Render Free tier.
6. **Đồng bộ tài liệu và thực thi:** Cập nhật tài liệu (`PROJECT_REQUIREMENTS.md`, `CONTENT_PLAYBOOK.md`, `AGENTS.md`) song song với logic code và prompt backend. Ghi rõ quyết định có ngày tháng.
7. **Bảo toàn dữ liệu người dùng:** Tôn trọng bản sửa thủ công và ảnh người dùng; không tự viết lại hay tái sinh hàng loạt dữ liệu đã lưu khi đổi phong cách.

## Quy tắc vận hành
- Đọc PROJECT_REQUIREMENTS.md và CONTENT_PLAYBOOK.md trước khi sửa sản phẩm. REQUIREMENTS_CONTENT_AUTOMATION_V2.md lưu nghiên cứu Facebook và lịch sử; quyết định mới trong PROJECT_REQUIREMENTS.md được ưu tiên.
- Khi người dùng bổ sung yêu cầu hoặc phản hồi, cập nhật hai tài liệu trên ở phần liên quan và ghi quyết định có ngày. Không suy diễn yêu cầu chưa chốt thành điều đã duyệt.
- CONTENT_PLAYBOOK.md được backend nạp khi khởi động và băm vào phiên bản prompt/cache. Cập nhật tài liệu và phần thực thi cùng nhau; Markdown không phải fine-tune trọng số model.
- Tài khoản đích là Facebook cá nhân Vượng Nguyễn. Xuất bản đang tắt theo xác nhận của người dùng; duyệt, copy và đánh dấu đã đăng là các trạng thái riêng.
- Không đưa API key, mật khẩu, cookie, .env.local, dữ liệu người dùng hoặc ảnh sinh vào Git/frontend/log. Khóa chỉ ở backend hoặc Environment của Render.
- Tôn trọng bản sửa và ảnh người dùng; không tự viết lại hoặc tạo lại hàng loạt nội dung đã lưu để áp dụng phong cách. Ghi rõ những phần còn cần cấu hình/deploy.
