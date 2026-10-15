# FB_CT — Context dự án

Cập nhật: 15/10/2026. Yêu cầu hiện hành và phản hồi mới nhất: [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md); quy tắc được backend nạp: [CONTENT_PLAYBOOK.md](CONTENT_PLAYBOOK.md). Các phần đề xuất ban đầu bên dưới là lịch sử, không ghi đè quyết định hiện hành. Theo yêu cầu tiếp theo, đã dựng bản local bằng Node.js + React/Vite + Express + SQLite để chạy `npm run dev`. Xem [README.md](README.md) cho hướng dẫn và phạm vi thực tế. Các phần bên dưới lưu bối cảnh thiết kế ban đầu.

## Mục tiêu

Xây một web service nhỏ để hỗ trợ chủ tài khoản Facebook cá nhân viết nội dung về bất động sản Việt Nam. Hệ thống tìm tin từ RSS báo chí, tạo bài nháp tiếng Việt và hình minh họa, sau đó người dùng kiểm tra, chỉnh sửa, copy nội dung và tải hình để tự đăng.

Giá trị chính: giảm thời gian tìm tin và soạn bài; mỗi bài vẫn có nguồn để đối chiếu.

## Yêu cầu đã có từ người dùng

- Web service gọn, nhanh, dễ vận hành.
- Nguồn ban đầu: RSS VnExpress; hướng phát triển là nhiều báo Việt Nam có tin BĐS.
- Tự viết bài sau khi thu thập đủ thông tin nguồn.
- Tạo hình đi kèm nội dung.
- Người dùng trực tiếp copy/paste lên Facebook cá nhân. Câu này xác định điểm kết thúc của MVP, dù ý tưởng ban đầu nhắc fanpage.
- Yêu cầu hiện tại là context và solution cho dự án.

## Luồng sản phẩm

RSS → lọc tin BĐS và chống trùng → lấy thông tin nguồn → trích dữ kiện → viết bài nháp → tạo ảnh minh họa → người dùng duyệt/sửa → copy bài, tải ảnh → người dùng tự đăng Facebook.

Hệ thống phải phân biệt “đã copy” với “đã đăng”. Chỉ người dùng đánh dấu đã đăng; thao tác copy không xác nhận việc xuất bản.

## Phạm vi MVP đề xuất

1. Một tài khoản đăng nhập.
2. Một nguồn RSS BĐS VnExpress.
3. Danh sách tin và trạng thái xử lý.
4. Tự tạo bài nháp cho tin phù hợp trong hạn mức.
5. Một ảnh minh họa cho mỗi bài đủ dữ kiện.
6. Trình sửa bài, xem nguồn, copy văn bản thuần và tải ảnh.
7. Lưu lịch sử bài, bản sửa và chi phí sử dụng ước tính.

## Mặc định đề xuất, có thể thay đổi

Đây là lựa chọn thiết kế để bắt đầu, chưa phải sở thích đã được người dùng xác nhận.

| Cấu hình | Giá trị ban đầu |
| --- | --- |
| Phạm vi tin | BĐS Việt Nam, chưa giới hạn tỉnh/thành |
| Người đọc | Người quan tâm thị trường và người mua nhà |
| Lịch lấy RSS | Mỗi 15 phút |
| Tự tạo nội dung | Tối đa 3 bài mới/ngày, không phải mục tiêu phải đạt |
| Lần nạp đầu | Chỉ tự xử lý tin trong 48 giờ gần nhất |
| Độ dài | Khoảng 150–250 từ khi nguồn đủ thông tin; ngắn hơn nếu cần |
| Giọng văn | Dễ hiểu, điềm tĩnh, có nhận xét thận trọng |
| Hình | Một ảnh vuông; minh họa chung, có nhãn rõ |
| Múi giờ giao diện/lịch | Asia/Ho_Chi_Minh |

Ngân sách tiền, hạn mức ảnh, mẫu giọng văn và model API cần được cấu hình khi triển khai. Số lần thử lại và tạo lại cũng phải được tính vào hạn mức chi phí.

## Nguyên tắc nội dung

- Chỉ dùng dữ kiện có trong phần nguồn đã lấy được; RSS tóm tắt không được xem là toàn bộ bài báo.
- Không tự thêm giá, tỷ lệ, thời điểm, tên dự án hay tình trạng pháp lý.
- Giữ phạm vi của dữ kiện: giá chào bán khác giá giao dịch; dự kiến khác đã phê duyệt; số liệu của một khu vực khác số liệu cả nước.
- Tách thông tin nguồn và nhận xét. Không bịa trải nghiệm cá nhân, giao dịch hoặc cam kết sinh lời.
- Bài có tên báo và đường dẫn nguồn trong phần văn bản được copy.
- Ảnh tạo mới là minh họa; không tự lấy ảnh báo để đăng lại hoặc giả lập ảnh thực tế của dự án.
- Người dùng có quyền chỉnh sửa và quyết định đăng. Kiểm tra tự động hỗ trợ việc duyệt, không bảo đảm mọi nhận định đều đúng.

## Kiến trúc đề xuất

FastAPI + Jinja2/HTMX + SQLite + một worker nền. Web và worker dùng chung mã nguồn, chạy trên cùng một máy chủ với ổ lưu trữ bền vững. Worker xử lý lịch RSS và bảng công việc trong SQLite. Phần AI gọi OpenAI API từ backend; model văn bản và hình được cấu hình riêng.

Chi tiết kiến trúc, công việc và nghiệm thu: [SOLUTION.md](SOLUTION.md).

## Nguồn đã đối chiếu

[Danh mục RSS chính thức của VnExpress](https://vnexpress.net/rss) có kênh BĐS, mô tả RSS gồm tiêu đề, tóm tắt và link. RSS miễn phí cho cá nhân và tổ chức phi lợi nhuận, kèm yêu cầu nhận diện nguồn. [Điều khoản sử dụng](https://vnexpress.net/dieu-khoan-su-dung) có giới hạn sao chép nội dung và hình ảnh cho mục đích thương mại. Ghi nguồn hoặc viết lại không thay thế việc xác định quyền sử dụng.

Đã xác nhận kênh qua danh mục chính thức và kiểm thử parser với RSS trực tiếp ngày 13/10/2026: đọc được 60 tin. Có kiểm thử fixture cho chống trùng, ngày đăng, làm sạch HTML và giới hạn dữ liệu. Tích hợp OpenAI đã được kiểm thử bằng mock; chưa chạy yêu cầu trả phí với key của người dùng.
