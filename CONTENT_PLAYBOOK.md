# Quy tắc nội dung và hình ảnh

Ngày cập nhật: 15/10/2026. Phản hồi đã chốt của chủ sản phẩm; được nạp vào prompt ở backend. Bài mẫu và cấu hình giọng viết chỉ bổ sung cách diễn đạt, không ghi đè các nguyên tắc này.

## Giọng viết

- Viết tiếng Việt theo giọng chuyên gia phân tích: rõ ràng, cụ thể, tự nhiên, có luận cứ; kết hợp phân tích khu vực và giới thiệu dự án khi đủ dữ kiện.
- Không dùng “góc nhìn của mình”, “với mình”, “theo mình”, “mình cho rằng”, “mình nghĩ”, “mình thấy”, “theo quan điểm của mình”. Không xưng “mình”, không gọi người đọc là “anh em”. Tránh lối tâm sự và sáo ngữ.
- Đi thẳng vào sự kiện, giải thích cơ chế tác động và nhóm người liên quan. Dùng “Tác động đối với khu vực”, “Triển vọng và điều kiện”, “Điểm cần theo dõi” khi cần chia mục; tránh lặp khuôn một cách máy móc.
- Ví dụ: “Nếu hạ tầng và tiện ích được triển khai đồng bộ, khu vực có thể cải thiện khả năng phục vụ nhu cầu ở thực.” Không biến phân tích thành cam kết tăng giá.
- Chỉ dùng dữ kiện trong nguồn hoặc context liên quan đã cung cấp; giữ đúng địa danh, số liệu, thời điểm và trạng thái đề xuất/phê duyệt/thi công. Không lấy số liệu từ bài mẫu, bịa trải nghiệm thực địa hoặc khan hiếm.
- CTA phù hợp mục tiêu bài: thảo luận cụ thể, đọc nguồn/website hoặc yêu cầu thông tin tư vấn có căn cứ. Người dùng vẫn kiểm tra và duyệt trước khi đăng.

## Hình ảnh

- Ưu tiên hình chân thực như ảnh chụp, đúng chủ đề bài: đường và giao thông, không gian đô thị, nhà ở, công viên hoặc hoạt động sống. Không dùng cùng một cảnh nhà chung cho mọi tin.
- Ánh sáng tự nhiên, vật liệu và tỷ lệ kiến trúc hợp lý, màu trung thực, chi tiết có chiều sâu. Tránh hình học trừu tượng, phối cảnh 3D bóng bẩy, màu xanh phủ toàn ảnh, ánh sáng giả và chi tiết méo.
- Hình chiếm phần lớn khung; tiêu đề tiếng Việt ngắn, dễ đọc trên điện thoại. Tên thương hiệu nhỏ, khoảng trắng rõ; không phủ lớp tối lên toàn ảnh hoặc nhồi số liệu.
- Ảnh AI là minh họa, có nhãn rõ; không giả làm ảnh hiện trạng của một địa điểm/dự án thật. Không tự dựng bản đồ, mặt bằng, logo, phối cảnh dự án hay ảnh trước/sau công trình như chứng cứ.
- Với dự án cụ thể, ưu tiên ảnh thật/phối cảnh được người dùng cung cấp và có quyền sử dụng. Không tải lại ảnh báo để thay cho ảnh được phép dùng.
- Model ảnh tách biệt với model văn bản. Dùng chất lượng high cho ảnh hoàn chỉnh; một yêu cầu tạo một ảnh, có hạn mức theo ngày, không tự gọi lại khi lỗi hoặc tự hạ về bìa hình học.


## Vincente Realty — 30/10/2026

Người dùng yêu cầu landing page thương hiệu Vincente Realty cho Vượng Nguyễn, khách xem tin BĐS từ nội dung admin; studio hiện tại chuyển vào /admin có đăng nhập. Trang chủ / công khai, giao diện cao cấp, responsive. Bài thật được duyệt đúng phiên bản và đủ kiểm tra tự hiển thị; bài mẫu, nháp chưa duyệt, bài bị sửa, nguồn thay đổi hoặc bài lưu trữ không được công khai. Mỗi tin nguồn chỉ hiển thị bản đã duyệt mới nhất. Duyệt cho website không đồng nghĩa đăng Facebook; đăng Facebook vẫn tắt. Public API chỉ trả nội dung và hình của bài được duyệt, không trả settings, jobs hay khóa API. Thông tin tư vấn dẫn đến Facebook Vượng Nguyễn đã cung cấp. Không tự tạo tin giả để lấp trang.


### Phản hồi giao diện — 30/10/2026

Người dùng phản ánh landing page khó nhìn, tiêu đề chìm vào ảnh; yêu cầu enhance thiết kế. Điều chỉnh hero thành bố cục sáng hai cột, chữ xanh đậm trên nền kem và ảnh kiến trúc riêng; tăng độ tương phản/cỡ chữ ở bản tin, góc nhìn, liên hệ. Giới hạn CSS h1 của admin trong .app-shell để không ghi đè landing page. Thêm mục khám phá Quy hoạch/Nhà ở/Thị trường dẫn về bộ lọc thật; giữ trạng thái chưa có bài khi chưa được duyệt, không bịa tin. Điều hướng đến phần có offset cho header cố định; bố cục mobile xếp dọc.


### Carousel dự án và chuyển động cuộn — 30/10/2026

Người dùng yêu cầu nhiều dự án có ảnh xoay/chuyển và moving action khi scroll. Bổ sung carousel ảnh tự chuyển 6,5 giây, fade/zoom, mô tả riêng, số trang, nút trước/sau/dừng/chọn ảnh; hỗ trợ vuốt, bàn phím, dừng khi hover/focus hoặc ra ngoài viewport/tab. Thêm bộ sưu tập cuộn ngang, reveal khi vào màn hình, parallax nhẹ và tiến độ cuộn. Tôn trọng prefers-reduced-motion. Ưu tiên bài contentMode=project đã duyệt từ public feed; khi chưa có bài dự án, ba cảm hứng không gian có nhãn minh họa, không dùng tên dự án/giá/pháp lý/vị trí bịa đặt. Không tự duyệt hoặc sinh bài trả phí để lấp carousel.


### Đồng bộ tin admin lên landing page — 30/10/2026

Người dùng yêu cầu đưa nội dung sẵn có trong admin lên cho khách đọc và đặt khối tin giữa Liên hệ và footer. Kho local có 62 tin RSS thật, chưa có bài biên tập. Cho hiển thị metadata công khai của tin nguồn VnExpress: tiêu đề, tóm tắt RSS, chuyên mục, ngày nguồn và link bài gốc; nhãn Tin nguồn phân biệt với bài biên tập đã duyệt. Không công khai bản nháp, context nội bộ, settings hay ảnh chưa duyệt. Bài biên tập đã duyệt thay bản RSS cùng URL; thu hồi duyệt chỉ gỡ nội dung biên tập, tóm tắt nguồn công khai vẫn hiển thị. Không tải toàn văn/ảnh báo, không tạo lại bài AI. Danh sách tự cập nhật mỗi phút, có tìm kiếm, bộ lọc và Xem thêm 9 tin/lượt.


### Tin tức 4 bài và phân trang ngang — 30/10/2026

Người dùng phản hồi danh sách tin quá dài, yêu cầu tối đa 4 bài và pagination scroll ngang. Thay bố cục featured/grid dọc và Xem thêm bằng 4 thẻ đồng đều trên một hàng mỗi trang, ảnh nhỏ, tiêu đề/tóm tắt giới hạn dòng; phân trang số và trước/sau. Mobile/tablet cuộn ngang trong 4 thẻ, vuốt tiếp ở mép để chuyển trang; desktop hỗ trợ trackpad ngang/phím mũi tên. Lọc/tìm kiếm đặt lại trang đầu, chỉ render tối đa 4 bài ở trang hiện tại. Giữ dữ liệu đồng bộ và vị trí giữa Liên hệ/footer.


### Phát hành Vincente Realty và bảo mật — 30/10/2026

Người dùng yêu cầu push Git/main, deploy Render, đổi hostname đích vincenterealty.onrender.com, kiểm tra latency/lag và giữ đăng nhập username/password không lộ credentials. Giữ .gitignore trong repo để bảo vệ secrets; không commit .env.local, database, ảnh sinh, logs, kết quả test, trace hay credential. Website chặn đường dẫn dotfiles/source/test/report/data, thêm security headers; cookie admin HttpOnly/Secure/SameSite=Strict ở production. Dùng lại credentials trên Render, không ghi giá trị ra MD/log/frontend. Tách lazy-load admin, chuyển ảnh stock sang WebP, nén Brotli/gzip asset production và cache asset có hash. Không nâng gói Render có phí nếu chưa được yêu cầu; free tier vẫn có cold start và filesystem tạm. Trạng thái deploy/hostname ghi theo kết quả thực tế.
