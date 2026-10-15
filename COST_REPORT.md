# Chi phí một bài — đo ngày 15/10/2026

Đọc usage thực tế từ SQLite cho một bài đã hoàn tất cả nội dung và ảnh. Không gọi lại API để đo. Không đưa nội dung bài, database, key hoặc thông tin đăng nhập vào báo cáo này.

| Phần | Model | Usage được API trả về | Chi phí quy đổi USD |
|---|---|---|---:|
| Viết bài | gpt-4o-mini | 1.386 input tokens + 465 output tokens | 0.0004869 |
| Một ảnh High, 1536×1024 | gpt-image-2.5-flare | 695 text input tokens + 0 image input tokens + 1.372 image output tokens | 0.0446350 |
| Tổng một bài + một ảnh | | | **0.0451219** |

Khoảng **0.0451 USD/bài**. Ảnh chiếm khoảng 98.9% tổng mẫu đo. Nếu cùng mức usage, 3–5 bài/ngày trong 30 ngày tương đương **4.06–6.77 USD/tháng** tiền AI.

## Cách tính và giới hạn

- Giá Standard, gọi trực tiếp API, không phải Batch. GPT-4o-mini: input 0,15 USD / triệu token, output 0,60 USD / triệu token. GPT Image 2.5 Flare: text input 5 USD / triệu token, image input 8 USD / triệu token, image output 30 USD / triệu token.
- Văn bản: `(1386 × 0,15 + 465 × 0,60) / 1.000.000`. Ảnh: `(695 × 5 + 1372 × 30) / 1.000.000`.
- Đây là **usage đo được × giá niêm yết**, chưa phải hóa đơn hoặc số tiền đã đối soát. Không áp dụng giảm giá token cache vì bản ghi văn bản chưa lưu chi tiết cached tokens; nếu có cache thì chi phí thực tế có thể thấp hơn.
- Mẫu chỉ gồm một lượt viết thành công và một ảnh thành công; không gồm các yêu cầu lỗi/chưa rõ kết quả, tạo lại, bài khác, thuế, phí đổi tiền hoặc hosting. Những lượt lỗi có thể vẫn tính phí và không được giả định bằng 0.
- Chi phí mỗi bài thay đổi theo độ dài nguồn/context, model, chất lượng và kích thước ảnh. Con số tháng là ngoại suy từ mẫu, không phải trần ngân sách. Ghép bìa và ảnh người dùng cung cấp thực hiện cục bộ không phát sinh phí API ảnh.

Nguồn giá đối chiếu 15/10/2026: [OpenAI API Pricing](https://developers.openai.com/api/docs/pricing), [GPT-4o Mini](https://developers.openai.com/api/docs/models/gpt-4o-mini). Dùng bảng Standard, không lấy bảng Batch giá thấp hơn nằm phía dưới.
