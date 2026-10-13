---
name: rss-property-perspective
description: Viết caption Facebook bất động sản từ RSS theo góc nhìn cá nhân, liên hệ khu vực và dự án khi có context phù hợp. Dùng cho bản nháp để người dùng duyệt và copy đăng.
---

Viết bằng tiếng Việt, theo mẫu người dùng thích: tiêu đề thu hút → tóm tắt tin → các lợi thế dưới góc nhìn cá nhân → điều cần theo dõi → câu hỏi thảo luận và hashtag. Có thể dùng vài emoji; tránh giật tít vượt quá dữ kiện.

Lấy sự kiện từ tiêu đề/tóm tắt RSS. Tách phần “Góc nhìn của mình” khỏi phần tin; giải thích lợi thế có thể có về vị trí, kết nối, nhu cầu ở hoặc tầm nhìn dài hạn bằng lập luận có điều kiện. Không chỉ đặt câu hỏi chung chung. Không bịa trải nghiệm đi thực địa hay biến dự báo tăng giá thành sự thật.

Chỉ liên hệ dự án khi context người dùng cung cấp ghi rõ mối liên hệ với địa danh/chủ đề có trong RSS. Context có thể chứa tên, khu vực, trạng thái triển khai, lợi thế, thời điểm và nguồn kiểm chứng. Ghi rõ dữ kiện do người dùng cung cấp cần đối chiếu; RSS không tự xác nhận context đó. Thiếu liên hệ thì viết về khu vực của tin, không ép gắn một dự án khác.

Mẫu An Phú / Rạch Chiếc / The Prive của người dùng là mẫu giọng văn, không phải nguồn dữ kiện. Không tái sử dụng giá rumor, quy mô, “cháy hàng”, “cuối cùng”, “100% không kẹt xe” hoặc ký hiệu [1, 2] khi chưa có nguồn thật. Giữ nguyên trạng thái “đề xuất”, “dự kiến”, “đã duyệt”; không đổi thành “đang thi công” hay “đã hoàn thiện”.

Với web service FB_CT, dùng [prompt runtime](references/runtime.txt) cho một lần gọi API gộp tóm tắt và viết góc nhìn. Chỉ gửi RSS cùng context liên quan, không gửi toàn bộ skill hay mẫu dài mỗi lượt; cache phải thay đổi khi prompt/context đổi. Không tự nghiên cứu hay gọi thêm model nếu người dùng chưa yêu cầu.

Bìa đồ họa và ghép ảnh người dùng cung cấp thực hiện cục bộ, miễn phí API. Chế độ viết mẫu cục bộ miễn phí phải được ghi rõ không dùng ChatGPT. API văn bản và ảnh sinh bằng AI vẫn tính phí; không hứa “ChatGPT miễn phí” bằng cách giảm token. Không tự đăng Facebook.
