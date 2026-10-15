# Hướng dẫn phát triển FB_CT

- Đọc PROJECT_REQUIREMENTS.md và CONTENT_PLAYBOOK.md trước khi sửa sản phẩm. REQUIREMENTS_CONTENT_AUTOMATION_V2.md lưu nghiên cứu Facebook và lịch sử; quyết định mới trong PROJECT_REQUIREMENTS.md được ưu tiên.
- Khi người dùng bổ sung yêu cầu hoặc phản hồi, cập nhật hai tài liệu trên ở phần liên quan và ghi quyết định có ngày. Không suy diễn yêu cầu chưa chốt thành điều đã duyệt.
- CONTENT_PLAYBOOK.md được backend nạp khi khởi động và băm vào phiên bản prompt/cache. Cập nhật tài liệu và phần thực thi cùng nhau; Markdown không phải fine-tune trọng số model.
- Tài khoản đích là Facebook cá nhân Vượng Nguyễn. Xuất bản đang tắt theo xác nhận của người dùng; duyệt, copy và đánh dấu đã đăng là các trạng thái riêng.
- Không đưa API key, mật khẩu, cookie, .env.local, dữ liệu người dùng hoặc ảnh sinh vào Git/frontend/log. Khóa chỉ ở backend hoặc Environment của Render.
- Tôn trọng bản sửa và ảnh người dùng; không tự viết lại hoặc tạo lại hàng loạt nội dung đã lưu để áp dụng phong cách. Ghi rõ những phần còn cần cấu hình/deploy.
