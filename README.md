# Địa Ốc — Content studio

Web app local để lấy RSS BĐS VnExpress, tạo bài nháp tiếng Việt và hình minh họa, sửa/copy nội dung và tải hình để tự đăng Facebook cá nhân.

## Chạy trên máy

Yêu cầu Node.js từ 20.19 trở lên và npm. Dependencies đã được cài trong folder này; ở máy mới chạy `npm install` trước.

```bash
npm run dev
```

Mở **http://localhost:3000**. API chạy ở `127.0.0.1:3001`. Dừng bằng `Ctrl+C`; nếu port đang bận, dừng phiên ứng dụng cũ trước khi chạy lại.

## Thử ngay khi chưa có API key

1. Bấm **Thử dữ liệu mẫu** ở đầu trang để thêm ba tin hư cấu được đánh dấu rõ.
2. Chọn một tin, bấm **Tạo bài viết**, đợi vài giây để mở trình sửa bài hoặc vào **Bài nháp**.
3. Sửa và lưu; copy nội dung, tải hình PNG 1080×1080.
4. Có thể đánh dấu đã đăng. Copy không tự xác nhận đã đăng Facebook.

Trong chế độ mẫu, nội dung dựng sẵn và cover đồ họa được tạo trên máy, không gọi OpenAI. Các tin này không phải bài báo thực tế.

## Dùng tin thật và AI

RSS thật vẫn lấy được khi chưa có key: bấm **Lấy tin mới**. Nguồn ban đầu: `https://vnexpress.net/rss/bat-dong-san.rss`.

Copy `.env.example` thành `.env.local`, điền key của bạn rồi khởi động lại `npm run dev`:

```dotenv
OPENAI_API_KEY=điền_key_của_bạn
TEXT_MODEL=gpt-4o-mini
LOW_COST_MODE=true
IMAGE_MODEL=gpt-image-1
```

Hai model là cấu hình ban đầu, phải khả dụng trên tài khoản API của bạn; có thể thay đổi trong `.env.local`. Key chỉ được đọc ở backend. Không đặt key trong biến `VITE_*`, trình duyệt hoặc Git.

Mặc định ứng dụng quét RSS mỗi 15 phút và tắt tự viết hàng loạt. Bấm tạo bài cho tin anh chọn. Nếu bật tự tạo bài, chỉ tin trong 48 giờ được xếp hàng, tối đa 50 lượt tạo bài/ngày theo giờ Việt Nam. LOW_COST_MODE=true tạo bìa PNG miễn phí trên máy và không gọi API ảnh; đặt false để dùng ảnh AI với hạn mức riêng. Có thể tắt tự động hoặc đổi hạn mức ở **Cài đặt**. Tạo lại, lỗi API và yêu cầu chưa xác định kết quả cũng có thể tiêu tốn hạn mức; ứng dụng không tự thử lại yêu cầu AI bị lỗi.

Trong chế độ OpenAI, mỗi lượt viết tin thật mới có thể phát sinh phí; chế độ mẫu cục bộ không gọi API. Hạn mức hiện tại tính theo số lượt yêu cầu, không phải trần tiền. Chưa tích hợp đối soát hóa đơn hoặc ước tính giá theo từng model.

## Những gì đã có

- Tin mới, bài nháp, lịch sử và cài đặt; tìm kiếm và lọc chủ đề.
- RSS thật, tóm tắt được làm sạch, URL được chuẩn hóa và chống trùng.
- Hàng đợi lưu trong SQLite; xử lý nền ngay trong process API.
- AI trả dữ kiện và nội dung theo schema, đối chiếu bằng chứng với RSS và chặn số liệu mới không có trong nguồn.
- Bản sửa được giữ riêng với bản AI; tạo lại sinh bài nháp mới.
- Ảnh AI có nhãn minh họa, hoặc cover đồ họa tạo miễn phí trên máy.
- Trạng thái lỗi riêng cho ảnh; ảnh lỗi vẫn xem/copy được bài.
- API chỉ lắng nghe trên loopback; chặn Host/Origin bên ngoài.
- `.gitignore` loại trừ key, database, hình sinh ra và dependencies.

## Deploy bản test trên Render

Repo có `render.yaml` để tạo web service miễn phí cho bản test. Service chạy cả Express và giao diện, dùng Basic Auth để người có link phải nhập thông tin truy cập. Render tự tạo `ACCESS_PASSWORD`; `OPENAI_API_KEY` được nhập riêng trong bước tạo Blueprint/Dashboard, không lưu trong Git. Không dùng key đã lộ trước đây; hãy tạo key mới rồi nhập vào Render. `LOW_COST_MODE=true` giữ tính năng tạo ảnh tự động ở chế độ miễn phí.

Tạo service: mở Render Dashboard → **New → Blueprint**, chọn repo `taanhluan/bds_automation`, kiểm tra cấu hình `render.yaml`, nhập `OPENAI_API_KEY` mới khi được hỏi rồi tạo service. Sau khi deploy xong, lấy URL `onrender.com` và giá trị `ACCESS_PASSWORD` trong Environment của service để gửi cho người thử; username là `tester`. Không đưa mật khẩu test vào repo. Gửi mật khẩu qua kênh riêng.

Đây là cấu hình thử nghiệm: gói free có thể ngủ khi không hoạt động và filesystem tạm thời, nên bài nháp/ảnh có thể mất sau khi service khởi động lại hoặc deploy lại. Không dùng để lưu nội dung cần giữ. Mọi khách có username/mật khẩu đều có thể sử dụng hạn mức API chung của key; chỉ chia sẻ với người tin cậy và thu hồi/đổi key nếu cần.

## Phạm vi

Ứng dụng dùng **tiêu đề/tóm tắt RSS cùng context dự án do người dùng nhập**, không lấy toàn văn bài báo. Context là dữ liệu người dùng cung cấp, không tự được xem là thông tin đã được báo xác nhận. Tóm tắt RSS được giữ làm phần tin; một Responses API request có cấu trúc viết tiêu đề, điều kiện và lợi ích có thể có. Backend ghép phần nhận định, dữ kiện và nguồn trên máy để tiết kiệm token. Kiểm tra tự động là hỗ trợ; luôn đọc nguồn và duyệt nội dung trước khi đăng. Nguồn thiếu thông tin thì cần chọn tin khác, không dùng AI để bổ sung dữ kiện còn thiếu.

Lịch chạy chỉ hoạt động khi `npm run dev` hoặc `npm start` đang chạy. Pending jobs vẫn nằm trong database khi restart. Job AI đang chạy lúc ứng dụng bị dừng được đánh dấu chưa xác định kết quả, không tự gửi lại để tránh tính phí lặp. Bản Render yêu cầu Basic Auth cho toàn bộ ứng dụng; chỉ endpoint health check được mở để nền tảng kiểm tra trạng thái.

VnExpress có [điều kiện sử dụng RSS](https://vnexpress.net/rss) và [điều khoản nội dung/hình](https://vnexpress.net/dieu-khoan-su-dung). Không coi link nguồn hoặc việc diễn đạt lại là quyền tái sử dụng toàn bộ bài/ảnh. Ứng dụng không tải ảnh báo để đăng lại.

## Lưu trữ

Database: `data/studio.sqlite`; ảnh: `data/assets/`. Có thể thay thư mục bằng `DATA_DIR` trong `.env.local`.

Muốn backup đơn giản: dừng ứng dụng rồi copy toàn bộ `data/`, sau đó chạy lại. Khi phục hồi, giữ database và ảnh cùng bản backup. Không commit `data/` lên Git.

## Kiểm tra và build

```bash
npm test
npm run check
npm run build
npm start
```

`npm start` phục vụ bản build ở http://localhost:3000, vẫn chạy worker trong cùng process. Build trước khi dùng lệnh này. Tests dùng fixture/mocks và database tạm; không gọi API trả phí.

## Cấu trúc

```text
client/src/       Giao diện React
server/app.js    HTTP API và phục vụ bản build
server/store.js  SQLite, cài đặt, hạn mức, công việc
server/rss.js    RSS VnExpress
server/worker.js Xử lý nền và lịch quét
server/ai.js     OpenAI Responses API, kiểm tra dữ kiện
server/images.js Ảnh AI và dựng cover PNG
tests/          Kiểm thử nghiệp vụ
```

[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) và [SOLUTION.md](SOLUTION.md) lưu yêu cầu và thiết kế ban đầu. Theo yêu cầu chạy bằng npm, bản triển khai dùng React/Vite + Express thay cho FastAPI/Jinja. README này mô tả hành vi thực tế của bản local.

Tài liệu API: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [Image generation](https://developers.openai.com/api/docs/guides/image-generation).

## Chế độ tiết kiệm và thử API thật

- GPT-4o mini mặc định; prompt ngắn, tối đa 1.200 token đầu ra, một request cho mỗi bài mới.
- Cache SQLite theo nguồn, skill/prompt, chế độ viết, khu vực/context liên quan, giọng văn, đối tượng và model; tạo lại cùng đầu vào dùng cache. Nút **Tạo lại bài** chủ động yêu cầu bản mới và vẫn tính phí.
- LOW_COST_MODE=true dùng bìa miễn phí cho lượt tạo hình tự động; nút Ảnh AI có phí vẫn gọi Image API khi anh chủ động chọn.
- Sau khi thêm key vào .env.local, chạy `npm run test:live`: lấy một tin RSS, gọi đúng một lần API văn bản, tạo cover trên máy và lưu vào tab Bài nháp. Kết quả cũng ở data/live-test/. Lệnh không retry hoặc gọi model dự phòng.
- API tính phí riêng với gói ChatGPT/Codex. Theo [giá GPT-4o mini](https://developers.openai.com/api/docs/models/gpt-4o-mini), ví dụ 1.000 token vào + 1.000 token ra khoảng $0,00075/bài (ước tính, chưa tính thuế hoặc giá khác).

Thử riêng một ảnh AI cho bài nháp thật: `npm run test:image`. Lệnh gọi đúng một ảnh 1024×1024 quality thấp, tính vào hạn mức ảnh, không retry và giữ nguyên LOW_COST_MODE. Ảnh nền/bìa ở data/live-test/ai-background.png và ai-cover.png; bài nháp cũng được cập nhật.

## Đăng Facebook với nguồn và ảnh

Hạn mức bài hiện tại là 50/ngày. Trong trình sửa có link bài gốc, tóm tắt nguồn, bản xem trước bài đầy đủ, nút Copy bài + link nguồn và tải nội dung .txt. Tải thêm ảnh PNG rồi đính kèm trên Facebook.

Có thể dùng ảnh JPG/PNG/WebP của anh (tối đa 8 MB) để tạo bìa miễn phí. Nút Ảnh AI tự nhiên gọi API ảnh có phí theo hạn mức ảnh riêng; tự tạo hình trong LOW_COST_MODE vẫn dùng bìa miễn phí. Ảnh AI mang nhãn minh họa, không phải ảnh chụp dự án thực tế. Bìa ảnh có tiêu đề, tóm tắt, tên báo, ngày và tên miền nguồn; link đầy đủ nằm trong nội dung đăng.

## Bước 3: skill viết góc nhìn cá nhân

Skill nằm tại [skills/rss-property-perspective/SKILL.md](skills/rss-property-perspective/SKILL.md). Backend đọc trực tiếp prompt gọn trong `references/runtime.txt`, dùng lại tóm tắt RSS có sẵn và tạo nhận định trong một request; không gửi cả SKILL hoặc mẫu dài mỗi lượt. Bài mới có tiêu đề thu hút, tóm tắt, nhận định cá nhân về lợi thế có điều kiện, điều cần theo dõi, câu hỏi và hashtag. Không coi ví dụ An Phú/Rạch Chiếc/The Prive là dữ kiện đã xác nhận.

Vào **Cài đặt → Context khu vực & dự án** để nhập khu vực ưu tiên và dữ kiện dự án có nguồn/thời điểm. Mỗi dự án một khối, cách bằng dòng trống:

```text
Liên hệ: [địa danh hoặc chủ đề có trong RSS]; [cụm từ khác]
Dự án: [tên dự án]
Dữ kiện đã kiểm tra: [vị trí, trạng thái triển khai, lợi thế và ngày cập nhật]
Nguồn: https://[link đã xác nhận]
```

Chỉ khối có cụm từ trong dòng “Liên hệ:” khớp toàn bộ với RSS mới được gửi; mỗi cụm ít nhất hai từ. Tổng context gửi tối đa 1.600 ký tự, không cắt ngang một khối. Chia nhỏ khối quá dài. Bộ lọc chỉ chọn context để viết, không xác minh quan hệ địa lý hay lợi ích của dự án. AI cần bỏ liên hệ không đủ cơ sở. Link context được đính kèm bản copy/.txt khi AI dùng context; trình duyệt luôn giữ link RSS gốc.

Trong **Tiếng nói của bạn → Chế độ viết**:

- **OpenAI:** nhận định theo context, một request, tối đa 1.200 token đầu ra; API có phí.
- **Miễn phí:** dùng RSS thật và khung nhận định dựng sẵn trên máy; không gọi ChatGPT, không tự liên hệ dự án. Bìa tự động cũng miễn phí kể cả khi LOW_COST_MODE=false.

Hai chế độ dùng chung hạn mức 50 lượt viết/ngày; cache không phát sinh thêm lượt. Chế độ được chốt lúc xếp hàng, thay đổi cài đặt không biến tác vụ miễn phí đang chờ thành tác vụ trả phí. Dữ kiện và nhận định cần được anh duyệt trước khi copy đăng. `npm run test:live` luôn thử đúng một lượt OpenAI có phí và tạo bìa miễn phí; bài đầy đủ mới được lưu thêm ở `data/live-test/perspective-post.txt`.
