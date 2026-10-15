# Yêu cầu nâng cấp Content Studio — cập nhật theo xác nhận người dùng

Bản nghiên cứu và lịch sử. Yêu cầu hiện hành, thay đổi giọng văn/ảnh và trạng thái triển khai được tổng hợp trong [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md).

Ngày lập: 14/10/2026. Phạm vi: nghiên cứu nội dung và chốt yêu cầu; chưa thiết kế giải pháp hoặc triển khai.

## 1. Cơ sở và phạm vi quan sát

- Đã dùng Chrome trực tiếp qua extension để đọc trang https://www.facebook.com/vuong.nguyen.8694?locale=vi_VN trong phiên người dùng đã đăng nhập.
- Đọc đầy đủ 4 bài BĐS: tin Palm City; liên hệ mở rộng Quốc lộ 22 với khu Tây Bắc/Vinhomes Saigon Park; giới thiệu tiện ích Monrei Saigon; bài Monrei theo giá và đối tượng khách hàng.
- Xem trực tiếp 2 ảnh: bài Quốc lộ 22 và bài Monrei theo giá. Các bài đời sống, tuyển dụng, chia sẻ lại không được dùng làm mẫu giọng văn BĐS.
- Trang hiển thị khoảng 3,6 nghìn followers. Đây là số hiển thị tại thời điểm đọc, không phải dữ liệu reach hoặc khách hàng tiềm năng.
- Một số bài BĐS quan sát được chỉ có 1–3 reactions; chưa có Insights, lượt tiếp cận, click, inbox hoặc giao dịch. Không thể kết luận cách viết này đã tăng traffic hoặc chuyển đổi tốt.
- Những số liệu, giá, tiến độ, pháp lý và mô tả tiện ích trong bài được ghi nhận là phát biểu của bài mẫu; nghiên cứu này chưa xác minh chúng là thông tin thị trường đúng và còn hiệu lực.
- Không xác định được công cụ tạo ảnh, việc tác giả dùng AI, cách tác giả duyệt bài hoặc đăng tự động từ quan sát này.

## 2. Các mẫu nội dung quan sát được

### Mẫu A — tin nguồn và nhận định cá nhân

Bài Palm City mở bằng sự kiện, sau đó thêm lợi ích có điều kiện, điều cần theo dõi, câu hỏi và nguồn VnExpress. Ưu điểm là dễ đọc, có nguồn, giọng thận trọng. Hạn chế là các lợi ích khá phổ quát; bài chưa giải thích rõ thay đổi này có ý nghĩa riêng thế nào đối với khu vực hoặc một nhóm người mua cụ thể. Cấu trúc trùng với cách render hiện tại của app; chưa có bằng chứng bài này được tạo bằng app.

### Mẫu B — tin hạ tầng dẫn đến cơ hội khu vực và dự án

Bài Quốc lộ 22 đi từ quy mô và kết nối giao thông đến tác động vùng Tây Bắc, sau đó gắn với Vinhomes Saigon Park. Cách dẫn dắt có mục đích thương mại: sự kiện → cơ chế tác động → khu vực → dự án/nhóm khách hàng. Tiêu đề giàu cảm xúc, viết hoa, các ý được chia bằng emoji, kết thúc bằng hashtag.

Điểm cần nâng chất lượng: quan hệ hưởng lợi phải có chứng cứ địa lý/kết nối; tiến độ dự kiến phải giữ đúng trạng thái; không biến một hạng mục hạ tầng thành kết luận chắc chắn về giá hoặc thời điểm mua. Các khẳng định của bài mẫu không tự trở thành dữ kiện chuẩn để AI sử dụng.

### Mẫu C — giới thiệu dự án theo trải nghiệm sống

Bài Monrei tiện ích mở bằng mong muốn nghỉ dưỡng tại nhà, gom tiện ích thành nhóm dễ hiểu, rồi bổ sung giá, điều kiện thanh toán và lời mời tư vấn. Bài bán một trải nghiệm trước khi trình bày thông số. Đây là mẫu giới thiệu sản phẩm, khác mục tiêu với bài phân tích một tin hạ tầng.

### Mẫu D — giá và điều kiện tài chính dẫn đến liên hệ

Bài Monrei theo giá dùng giá đầu vào làm điểm thu hút, liệt kê lợi ích, chỉ rõ nhóm khách và mời comment/inbox để nhận tài liệu. Cần kiểm tra thời điểm áp dụng, khoản thuế/phí chưa gồm, điều kiện thanh toán và căn cứ cho thông tin số lượng/pháp lý trước khi dùng lại.

### Cách trình bày hình

- Ảnh Quốc lộ 22: tông xanh đậm/vàng, hình đường phố làm chủ đạo, tiêu đề nổi bật, số liệu lớn và dấu hiệu thương hiệu.
- Ảnh Monrei: poster dọc, phối cảnh dự án, giá làm điểm nhấn, sơ đồ căn hộ và thông tin thanh toán bổ trợ.
- Điểm có thể học: một thông điệp chính rõ, thứ bậc chữ/số, phối màu nhất quán và hình đúng chủ đề. Chưa có cơ sở gọi đây là phong cách Gemini hoặc cam kết hiệu quả tương tác.

Nguồn hình quan sát:
- https://www.facebook.com/photo/?fbid=28411790825077859&set=a.604706816212967
- https://www.facebook.com/photo/?fbid=28296953959894880&set=a.604706816212967
- Bài nguồn Palm City được tài khoản chia sẻ: https://vnexpress.net/palm-city-khoi-cong-cong-vien-va-duong-chay-bo-ven-song-5130496.html

## 3. Mục tiêu sản phẩm

Tạo một kênh nội dung BĐS có góc nhìn riêng về khu vực và triển vọng phát triển; tự động biến tin phù hợp thành bài và hình hoàn chỉnh, kiểm tra sơ bộ và xuất bản sau khi người dùng duyệt. Đích đăng đã xác nhận là tài khoản Vượng Nguyễn tại https://www.facebook.com/vuong.nguyen.8694. Mục tiêu gồm tăng người theo dõi, lượt xem, click website và khách inbox tư vấn; chưa có thứ tự ưu tiên hoặc chỉ tiêu số lượng cho từng mục tiêu.

Luồng đã thống nhất qua trao đổi: hệ thống tự phát hiện tin, tạo bài và hình, kiểm tra sơ bộ, hiển thị sẵn bản xem trước. Người dùng kiểm tra, chỉnh sửa nếu cần rồi bấm “Duyệt & đăng”; hệ thống thực hiện xuất bản. Bài chưa được người dùng duyệt không được đăng. Tự xuất bản hoàn toàn không cần duyệt không nằm trong phạm vi hiện hành.

Luồng nghiệp vụ: nguồn mới/link được gửi → lọc mức phù hợp và trùng lặp → tạo bài và hình → kiểm tra sơ bộ → hiển thị bản xem trước → người dùng kiểm tra/sửa và duyệt → hệ thống đăng → ghi nhận kết quả. Bài thiếu dữ kiện được giữ lại kèm lý do.

Tần suất đã xác nhận: mục tiêu khoảng 3–5 bài/ngày trong giai đoạn hiện tại. Đây là tần suất nội dung đăng, không đồng nghĩa tạo/đăng mọi bài báo mới. Không bổ sung bài chất lượng thấp để đủ số. Nội dung kết hợp cả phân tích chuyên gia về khu vực và giới thiệu dự án/bán hàng; chưa chốt tỷ lệ hai nhóm.

## 4. Yêu cầu chức năng và tiêu chí nghiệm thu dự kiến

| Mã | Yêu cầu | Tiêu chí nghiệm thu |
|---|---|---|
| REQ-01 | Tự phát hiện nội dung | Nguồn được cấu hình được kiểm tra tự động; link gửi trực tiếp cũng được tiếp nhận. Lưu nguồn, thời điểm phát hiện, thời điểm xuất bản của tin khi có. Không yêu cầu bấm lấy tin. Chu kỳ quét và thời gian từ phát hiện đến sẵn sàng phải được chốt thành số cụ thể. |
| REQ-02 | Chọn đúng tin | Lọc theo khu vực, chủ đề, độ mới và mức liên quan; loại trùng cùng URL và cùng sự kiện. Có lý do chọn/bỏ, không biến mọi bài RSS thành một bài đăng. |
| REQ-03 | Phân tích khu vực | Bài nêu điều gì thay đổi, cơ chế tác động, nhóm có thể hưởng lợi, điều kiện và điểm cần theo dõi. Nhận định tương lai được trình bày theo điều kiện/kịch bản. Không tạo số liệu, trạng thái quy hoạch hoặc kết luận tăng giá khi thiếu chứng cứ. |
| REQ-04 | Định hướng giọng văn | Chủ kênh chọn bài mẫu, sửa hoặc loại mẫu; điều chỉnh giọng, đối tượng và mức thương mại. Chỉ dùng mẫu BĐS được chọn. Tiêu chí phong cách phải được xác nhận bằng bộ bài mẫu trước khi dùng tự động. |
| REQ-05 | Liên hệ dự án có căn cứ | Chỉ nhắc dự án khi có quan hệ thực tế với tin/khu vực và dữ liệu còn hiệu lực. Mỗi thông tin quan trọng về giá, pháp lý, ưu đãi và tiến độ có nguồn, ngày cập nhật và điều kiện áp dụng. Không đủ dữ liệu thì bỏ phần liên hệ hoặc giữ bài lại. |
| REQ-06 | Cấu trúc theo mục tiêu bài | Hỗ trợ ít nhất bài phân tích khu vực và bài giới thiệu dự án. Có mở bài thu hút, luận điểm chính, dẫn chứng, kết luận phù hợp và CTA. Tránh lặp máy móc một khuôn cho mọi tin; không tự thêm trải nghiệm cá nhân mà chủ kênh chưa cung cấp. |
| REQ-07 | Hình hoàn chỉnh | Tự chuẩn bị hình có bố cục đã thống nhất: một thông điệp chính, chữ tiếng Việt đọc được trên điện thoại, thương hiệu nhất quán, nội dung hình khớp bài. Phối cảnh/ảnh minh họa phải có mô tả phù hợp. Không dựng bản đồ, mặt bằng, logo hoặc hình dự án giả như dữ liệu thật. |
| REQ-08 | Tự kiểm tra sơ bộ | Kiểm tra nguồn, số liệu, địa danh, thời điểm, quan hệ dự án, mức khẳng định, trùng lặp và chất lượng hình. Lưu kết quả cùng lý do. Bài đủ tiêu chí chuyển sang Chờ duyệt; thiếu nguồn, mâu thuẫn hoặc hình lỗi thì giữ lại. Việc AI đọc lại không thay thế xác nhận đăng của người dùng. |
| REQ-09 | Xuất bản sau khi duyệt | Người dùng bấm “Duyệt & đăng” sau khi xem bài và hình; hệ thống thực hiện đăng vào tài khoản Vượng Nguyễn, không yêu cầu copy nội dung/tải hình rồi đăng thủ công. Bài chưa duyệt không được đăng. Ghi mã bài, link bài và kết quả từ nền tảng. Khi chưa rõ kết quả đăng, phải đối soát trước khi gửi lại để tránh bài trùng. Lên lịch chỉ là khả năng đề xuất, chưa được chốt riêng. |
| REQ-10 | Giao diện xem và duyệt bài | Hiển thị bài và hình cùng nhau theo dạng xem trước bài Facebook, có nguồn, trạng thái và thời gian. Cho xem toàn bài, sửa, loại và bấm “Duyệt & đăng”. Trạng thái gồm Đang tạo, Đang kiểm tra, Cần bổ sung, Chờ duyệt, Chờ đăng, Đã đăng, Đăng lỗi. Không yêu cầu bấm lấy tin/tạo bài/tạo hình cho từng tin. |
| REQ-11 | Vận hành và lưu trữ | Quét, tạo, kiểm tra và đăng hoạt động khi người dùng đóng trình duyệt. Lưu bài, ảnh, cấu hình, lịch và kết quả qua restart/redeploy. Có hạn mức bài/ảnh/lượt đăng và ngân sách; tránh đăng dồn sau gián đoạn. API key và thông tin truy cập nền tảng không nằm trong Git hoặc gửi về trình duyệt. |
| REQ-12 | Đo kết quả | Xác định KPI theo mục tiêu: tương tác, người theo dõi, click hoặc khách liên hệ. Chỉ báo cáo dữ liệu lấy được và nguồn của nó. Có thể so sánh nhóm bài và phong cách; không hứa tăng traffic chỉ từ số lượng bài hoặc mẫu thiết kế. |
| REQ-13 | Tần suất và cơ cấu nội dung | Chuẩn bị và hỗ trợ đăng khoảng 3–5 bài/ngày theo xác nhận người dùng, theo ngày Việt Nam; bài phải được duyệt trước khi đăng. Kết hợp phân tích khu vực và giới thiệu dự án/bán hàng. Tỷ lệ hai nhóm và việc áp dụng 5 bài như trần cứng chưa chốt. |

## 5. Đối chiếu với mã nguồn hiện tại

- Có RSS VnExpress, lịch quét mặc định 15 phút và tùy chọn tự tạo bài; tự tạo hiện mặc định tắt.
- Nội dung hiện dùng tóm tắt RSS và context do chủ kênh nhập, render lợi ích theo cấu trúc điều kiện cố định. Đây là nguyên nhân bài có thể đúng khuôn nhưng thiếu chiều sâu riêng của khu vực.
- Có tạo hình/bìa, chỉnh bài và copy/xuất nội dung. Có kiểm tra dữ kiện và cờ cần xem lại; chưa có quyết định tự duyệt toàn quy trình để xuất bản.
- Chưa có chức năng xuất bản Facebook; đánh dấu đã đăng là thao tác nội bộ.
- Bản Render test đang dùng dữ liệu tạm; cần đáp ứng REQ-11 trước khi vận hành tự đăng liên tục.

## 6. Nội dung đã xác nhận và chi tiết còn mở

Đã xác nhận:

1. Đích đăng: tài khoản Vượng Nguyễn tại link đã cung cấp.
2. Mục tiêu: tất cả các nhóm người theo dõi, lượt xem, click website và inbox tư vấn.
3. Tần suất giai đoạn hiện tại: khoảng 3–5 bài/ngày.
4. Phong cách: cả phân tích chuyên gia và giới thiệu dự án/bán hàng.
5. Quy trình: tự chuẩn bị và kiểm tra sơ bộ; người dùng kiểm tra rồi duyệt; hệ thống thực hiện đăng.

Chi tiết còn mở để làm rõ trong bước giải pháp:

- Khả năng tích hợp đăng vào đúng loại tài khoản Vượng Nguyễn cần được kiểm tra; chốt đích đăng không đồng nghĩa đã chứng minh phương thức đăng khả thi.
- Giữ VnExpress + link gửi trực tiếp làm phạm vi nguồn làm việc tạm thời; câu trả lời hiện tại chưa xác nhận riêng danh sách nguồn hoặc nguồn bổ sung.
- Thời gian từ tin mới đến bản xem trước chưa được trả lời; 3–5 bài/ngày là tần suất, không phải thời gian xử lý.
- Website đích để gắn link, chỉ tiêu KPI và tỷ lệ bài phân tích/bán hàng chưa được cung cấp.
- Chu kỳ quét, ngân sách, tiêu chuẩn hình mẫu và tính năng lên lịch cần được cụ thể hóa; không ngăn việc đề xuất giải pháp dựa trên phạm vi đã chốt.

Các quyết định nghiệp vụ ở mục 6 đã được người dùng xác nhận. Các tiêu chí chi tiết còn là bản dự thảo để cụ thể hóa khi đề xuất giải pháp. Phạm vi công việc hiện tại là phân tích và cập nhật requirement; chưa triển khai tính năng hoặc đăng nội dung.


## 7. Điều chỉnh phạm vi khi bắt đầu phát triển

Người dùng đã xác nhận trong bước triển khai: **giữ tài khoản cá nhân Vượng Nguyễn; hoàn thiện nội dung trước, chưa bật xuất bản**. Vì vậy REQ-09 được hoãn; bản hiện tại lưu trạng thái duyệt riêng và không gửi bài lên Facebook. REQ-12 hỗ trợ ghi nhận thủ công các chỉ số đã kiểm tra, chưa tích hợp dữ liệu nền tảng tự động; không báo chỉ số khi chưa có dữ liệu. REQ-11 đáp ứng lưu trữ local; lưu trữ bền vững và chạy liên tục trên Render free vẫn là giới hạn hosting cần xử lý riêng.

## 8. Phản hồi nâng cấp 15/10/2026

Người dùng yêu cầu hình chân thực, trực quan và đẹp hơn; cho phép nâng model ảnh. Không dùng “góc nhìn của mình”, “với mình” hoặc lối tự xưng tương tự. Toàn bộ yêu cầu được lưu vào PROJECT_REQUIREMENTS.md; CONTENT_PLAYBOOK.md là bộ quy tắc được backend nạp vào prompt. Các quan sát giọng cá nhân/poster ở trên là lịch sử phân tích, không phải phong cách hiện hành. Xuất bản vẫn tắt.
