export function demoArticles() {
  const now = new Date();
  return [
    { id: 'demo-market', title: 'Điều gì nên kiểm tra trước khi xuống tiền mua căn hộ?', summary: 'Nội dung mẫu để thử ứng dụng, không phải tin báo thực tế. Một danh sách cân nhắc gồm ngân sách tổng, nhu cầu ở, vị trí và hồ sơ pháp lý. Mục đích là minh họa cách chuyển thông tin thành bài nháp dễ đọc; không có số liệu thị trường hoặc dự án cụ thể.', topic: 'Nhà ở' },
    { id: 'demo-planning', title: 'Đọc thông tin quy hoạch: bắt đầu từ nguồn chính thức', summary: 'Nội dung mẫu để thử ứng dụng, không phải tin báo thực tế. Khi xem thông tin quy hoạch, cần phân biệt đề xuất, dự thảo và quyết định được phê duyệt; đối chiếu địa điểm và thời điểm hiệu lực. Ví dụ này không xác nhận quy hoạch tại địa phương nào.', topic: 'Quy hoạch' },
    { id: 'demo-budget', title: 'Giá chào bán và giá giao dịch kể hai câu chuyện khác nhau', summary: 'Nội dung mẫu để thử ứng dụng, không phải tin báo thực tế. Giá được người bán đưa ra không đồng nghĩa mức giá giao dịch đã hoàn tất. Khi so sánh thông tin bất động sản, nên xác định nguồn và phạm vi của con số trước khi đưa ra nhận xét.', topic: 'Thị trường' },
  ].map((a, index) => ({ ...a, url: `demo:${a.id}`, source: 'Dữ liệu mẫu', publishedAt: new Date(now.getTime() - index * 3600000).toISOString(), fetchedAt: now.toISOString(), isDemo: true, contentScope: 'demo', status: 'new' }));
}
