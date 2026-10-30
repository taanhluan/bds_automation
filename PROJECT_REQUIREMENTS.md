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

- Repo: https://github.com/taanhluan/bds_automation. Người dùng đã duyệt bản dev và yêu cầu đưa lên main/Render ngày 15/10; nhánh phát triển là `enhance/content-studio-v2`. Trạng thái deploy thực tế được ghi sau khi Render hoàn tất.
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

## Yêu cầu phát hành và đo chi phí — 15/10/2026

Người dùng đã đồng ý đưa bản mới lên GitHub/main và Render, đồng thời yêu cầu không publish credentials và đo chi phí một bài. Phát hành ứng dụng không đồng nghĩa bật đăng Facebook. Đã quét lịch sử Git; đo usage một bài thành công gồm nội dung + ảnh High, chi phí niêm yết Standard khoảng 0,0451 USD. Chi tiết, công thức và giới hạn trong COST_REPORT.md. Không gọi thêm API trả phí để lấy mẫu.


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
