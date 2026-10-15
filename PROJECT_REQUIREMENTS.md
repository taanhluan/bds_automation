# FB_CT — yêu cầu hiện hành và quyết định phát triển

Cập nhật 15/10/2026. Đây là nguồn yêu cầu hiện hành, tổng hợp trao đổi từ lúc đưa dự án lên GitHub/Render đến phản hồi nâng cấp mới nhất. Khi có mâu thuẫn, quyết định mới có ngày trong tài liệu này được ưu tiên. Nghiên cứu và ảnh tham chiếu: REQUIREMENTS_CONTENT_AUTOMATION_V2.md.

## Mục tiêu và người dùng

- Chủ kênh: tài khoản Facebook **cá nhân Vượng Nguyễn**, https://www.facebook.com/vuong.nguyen.8694.
- Mục tiêu: tăng người theo dõi, lượt xem, click website và khách inbox tư vấn. Chưa chốt thứ tự ưu tiên, KPI số lượng hoặc website đích.
- Nội dung kết hợp phân tích chuyên gia về khu vực/triển vọng phát triển và giới thiệu dự án/bán hàng có căn cứ. Không dùng nguyên bài mẫu như nguồn thị trường đã xác minh.
- Chuẩn bị khoảng **3–5 bài/ngày**, theo giờ Việt Nam; không tạo bài yếu hoặc trùng chỉ để đạt số lượng. Mặc định triển khai 5 bài, có thể chọn 3/4/5 trong Cài đặt.

## Quy trình đã chốt

Tin mới/link được gửi → lọc phù hợp và trùng sự kiện → tự soạn bài và hình → kiểm tra sơ bộ → hiển thị sẵn bài + hình → người dùng đọc/sửa/duyệt.

- Nguồn làm việc hiện tại: RSS BĐS VnExpress và link VnExpress được gửi trực tiếp. Nguồn bổ sung chưa chốt.
- Quét mặc định mỗi 15 phút khi máy chủ hoạt động. Chưa chốt cam kết số phút từ báo đăng đến bài sẵn sàng. Tin tự xử lý giới hạn 48 giờ và khu vực ưu tiên; link thiếu ngày vẫn có thể được chọn thủ công.
- Giữ nguồn, ngày, dữ kiện và trạng thái xử lý; bài thiếu dữ kiện hoặc ảnh lỗi phải hiển thị lý do.
- Giao diện Chờ duyệt trình bày bài và hình cùng nhau, xem toàn bài/nguồn, sửa, duyệt hoặc loại. Sửa bài/hình hủy duyệt cũ; duyệt gắn đúng phiên bản. Copy không đồng nghĩa đã đăng.
- **Quyết định triển khai đã xác nhận:** “Giữ tài khoản cá nhân; hoàn thiện nội dung trước, chưa bật xuất bản”. Vì vậy chưa tự đăng Facebook; dùng copy nội dung, tải ảnh và đánh dấu đã đăng thủ công. Ý tưởng cũ tự duyệt/tự đăng hoàn toàn không phải phạm vi được bật.
- Dữ liệu hiệu quả hiện nhập thủ công cho bài thật đã đăng; không giả số liệu hoặc khẳng định tăng traffic. Chưa có kết nối Facebook Insights/inbox.

## Nội dung và khả năng học phong cách

- Có giọng viết, đối tượng đọc, bài mẫu, khu vực ưu tiên, context dự án, thương hiệu và website tùy chọn.
- Phân tích nêu sự kiện, cơ chế tác động, nhóm liên quan, điều kiện và điểm cần theo dõi. Bài dự án chỉ liên hệ khi context phù hợp với tin, có nguồn/ngày/điều kiện cho thông tin quan trọng.
- Không tạo số liệu, thời gian di chuyển, quan hệ địa lý, giá, pháp lý, khan hiếm, trải nghiệm thực địa hoặc cam kết tăng giá từ suy đoán. Giữ đúng đề xuất/dự kiến/phê duyệt/thi công.
- **Phản hồi mới 15/10:** bỏ “góc nhìn của mình”, “với mình” và các cách xưng tương tự; dùng giọng chuyên nghiệp, có luận cứ. Quy tắc chi tiết trong CONTENT_PLAYBOOK.md.
- Bài mẫu chỉ hướng dẫn cách diễn đạt. CONTENT_PLAYBOOK.md được backend nạp vào prompt; thay quy tắc làm đổi phiên bản cache khi khởi động lại. Đây là bộ nhớ quy tắc của sản phẩm, chưa phải fine-tune trọng số AI hoặc học tự động từ mọi bản sửa.
- Giữ bản AI và bản chỉnh sửa; tạo lại thành bản mới. Không sửa/đổi ảnh hàng loạt bài đã lưu hoặc đã đăng khi đổi phong cách.

## Hình ảnh

- **Phản hồi mới 15/10:** ảnh hiện tại thiếu trực quan; ưu tiên ảnh chân thực, đẹp, đúng chủ đề. Người dùng cho phép nâng model/chất lượng ảnh.
- Model văn bản và ảnh tách riêng. GPT-4o-mini hiện là model viết; ảnh cũ tự động chủ yếu là SVG dựng sẵn, ảnh AI cũ dùng GPT Image 1 ở quality low. Không quy lỗi ảnh cho model viết.
- Mặc định mới: **GPT Image 2.5 Flare**, quality **high**, ảnh nguồn **1536×1024**, bìa ảnh **1080×1350**, phần hình chiếm khoảng 74% khung, tiêu đề và nguồn ở vùng sáng phía dưới. Có thể chọn Sunburst, GPT Image 2, GPT Image 1.5 hoặc GPT Image 1; quality medium/high trong Cài đặt.
- Tạo một ảnh/lượt, tối đa mặc định 5 lượt/ngày. Model/chất lượng/kiểu hình được chốt vào tác vụ khi xếp hàng; ghi lại model/chất lượng đã dùng. Không tự thử lại hoặc tự hạ chất lượng khi lỗi API.
- Ảnh thật do người dùng cung cấp không gọi API ảnh; ảnh AI phải ghi là minh họa và không mô phỏng dự án/hiện trạng thật như bằng chứng. Bìa đồ họa miễn phí vẫn là lựa chọn thủ công; chế độ viết miễn phí và dữ liệu mẫu không tự gọi API ảnh.
- Bài mới ở chế độ OpenAI mặc định tự tạo ảnh AI; LOW_COST_MODE không ghi đè lựa chọn ảnh AI trong Cài đặt. Có thể chọn chế độ bìa miễn phí hoặc tắt tự tạo ảnh.
- Ảnh cũ được giữ lại; chọn tạo ảnh AI trong trình biên tập để nâng từng bài. Chưa tự tạo lại toàn bộ kho ảnh.

## Git, hosting và bảo mật

- Repo: https://github.com/taanhluan/bds_automation. Bản phát triển đang ở nhánh `enhance/content-studio-v2`; chưa đồng nghĩa đã lên main/Render.
- Link Render test hiện có: https://bds-automation-test.onrender.com. Dùng backend để gọi AI, key trong Environment của Render/.env.local; không để key trong Git, bundle frontend, biến VITE_*, log hoặc tài liệu. Không lưu cookie/mật khẩu người dùng vào MD.
- Người dùng muốn link dễ chia sẻ để test vẫn gọi AI an toàn. Render chạy backend + frontend và Basic Auth. GitHub Pages một mình không giữ được bí mật của API key gọi từ trình duyệt.
- Render free có thể ngủ và dùng storage tạm; chưa đáp ứng chạy liên tục/lưu bền qua redeploy. Bản local dùng SQLite và assets. Nâng hosting bền vững là phần còn mở.
- Điều khiển trình duyệt: ưu tiên Chrome trực tiếp qua extension theo yêu cầu; không dùng TinyFish.
- Hạn mức là lượt yêu cầu, không phải trần tiền hoặc phần trăm usage của tài khoản ChatGPT. Người dùng nói còn 71% usage để phát triển; không chuyển thành ngân sách API ảnh hoặc cam kết token cố định.

## Nhật ký quyết định

- 14/10: xem 4 bài BĐS và 2 poster công khai trên Facebook Vượng Nguyễn; lưu phân tích trong REQUIREMENTS_CONTENT_AUTOMATION_V2.md. Không suy ra hiệu quả tương tác, công cụ tạo hình hoặc quy trình đăng từ quan sát.
- 14/10: xác nhận tài khoản cá nhân, cả bốn mục tiêu, 3–5 bài/ngày và hai nhóm nội dung. Triển khai Content Studio V2 trên nhánh phát triển; hoãn xuất bản theo trả lời của người dùng.
- 15/10: nâng luồng ảnh sang photorealistic/high, bỏ giọng tự xưng, thêm bộ yêu cầu Markdown và bộ quy tắc được nạp khi tạo nội dung. Model được đối chiếu [tài liệu OpenAI về ảnh](https://developers.openai.com/api/docs/guides/image-generation) và [GPT Image 2.5 Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare). Khả dụng thực tế phụ thuộc quyền truy cập và billing của API project; chưa gọi ảnh trả phí trong lượt nâng cấp này.

## Phần còn mở

Xuất bản vào tài khoản cá nhân, chỉ số nền tảng tự động, hosting chạy liên tục/lưu bền, website đích, nguồn báo bổ sung, ngân sách tiền và tỷ lệ phân tích/bán hàng. Không mô tả các phần này là đã hoàn thành.
