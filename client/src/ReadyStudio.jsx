import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Check, CheckCircle2, ExternalLink, ImagePlus, Loader2, Newspaper, Sparkles } from 'lucide-react';

const LABELS = { approved: 'Đã duyệt', review: 'Chờ bạn duyệt', attention: 'Cần bổ sung', posted: 'Đã ghi nhận đăng' };

export function ReadyStudio({ state, onOpen, onNews }) {
  const [filter, setFilter] = useState('all');
  const drafts = state.drafts.filter(draft => draft.status === 'draft').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const shown = drafts.filter(draft => filter === 'all' || draft.review?.status === filter);
  const count = state.stats.todayPrepared || 0;
  const target = state.settings?.dailyTarget || 5;
  return <section className="ready-studio">
    <div className="daily-plan"><div><span className="eyebrow">VƯỢNG NGUYỄN · STUDIO HÔM NAY</span><h2>Tin mới thành bài sẵn sàng.</h2><p>Studio chọn tin, viết và chuẩn bị hình. Bạn đọc lại và quyết định duyệt.</p></div><div className="daily-progress"><strong>{count}<small> bài</small></strong><span>Mục tiêu tự chuẩn bị: {target} bài/ngày</span><progress max={target} value={Math.min(count, target)} /></div></div>
    <div className="workflow-strip"><span><Newspaper size={16} /> Tin mới</span><ArrowRight size={14} /><span><Sparkles size={16} /> Bài + hình tự động</span><ArrowRight size={14} /><span className="current"><CheckCircle2 size={16} /> Bạn duyệt</span></div>
    <div className="ready-toolbar"><div className="topic-tabs">{[['all', 'Tất cả'], ['review', 'Chờ duyệt'], ['approved', 'Đã duyệt'], ['attention', 'Cần bổ sung']].map(([id, label]) => <button key={id} className={filter === id ? 'selected' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div><span>{state.settings?.autoGenerate ? 'Đang tự chuẩn bị' : 'Tự chuẩn bị đang tắt'} · {state.settings?.fetchIntervalMinutes || 15} phút/lượt</span></div>
    {!shown.length && <div className="empty-state"><Sparkles size={28} /><h3>{drafts.length ? 'Chưa có bài ở trạng thái này' : 'Bài và hình sẽ xuất hiện tại đây'}</h3><p>{state.status.aiConfigured || state.settings?.writingMode === 'free' ? 'Studio chọn tin phù hợp trong 48 giờ gần nhất, theo khu vực và hạn mức của bạn.' : 'Thêm API key trên máy chủ hoặc chọn mẫu miễn phí trong Cài đặt để tự chuẩn bị bài.'}</p><button className="button button-secondary" onClick={onNews}>Xem bản tin <ArrowRight size={16} /></button></div>}
    <div className="ready-grid">{shown.map(draft => {
      const article = state.articles.find(item => item.id === draft.articleId);
      const imageBusy = ['pending', 'processing'].includes(draft.imageStatus);
      return <article key={draft.id} className="social-card"><div className="social-author"><div className="author-monogram">V</div><div><strong>Vượng Nguyễn</strong><span>{draft.contentMode === 'project' ? 'Giới thiệu dự án' : 'Phân tích khu vực'}{draft.isDemo ? ' · Mẫu thử' : ''}</span></div><span className={`review-badge review-${draft.review?.status || 'attention'}`}>{LABELS[draft.review?.status] || 'Cần kiểm tra'}</span></div><button className="social-preview" onClick={() => onOpen(draft.id)}><h3>{draft.title}</h3><p>{draft.content.replace(/\n\nNguồn:[\s\S]*$/u, '').slice(0, 500)}{draft.content.length > 500 ? '…' : ''}</p><span>Xem toàn bài và kiểm tra nguồn →</span></button><button className="social-image" onClick={() => onOpen(draft.id)} aria-label={`Xem hình: ${draft.title}`}>{draft.imageUrl ? <img src={draft.imageUrl} alt={`Hình minh họa ${draft.title}`} /> : <div>{imageBusy ? <Loader2 className="spin" size={32} /> : <ImagePlus size={32} />}<span>{imageBusy ? 'Đang chuẩn bị hình…' : 'Hình cần được bổ sung'}</span></div>}</button><div className="social-source"><span>{article?.source || 'Studio'} · {draft.automatic ? 'Chuẩn bị tự động' : 'Bạn đã chọn'}</span>{article?.url && !article.isDemo && <a href={article.url} target="_blank" rel="noreferrer">Nguồn <ExternalLink size={13} /></a>}</div><button className="button button-primary" onClick={() => onOpen(draft.id)}>{draft.review?.status === 'approved' ? <CheckCircle2 size={16} /> : <Check size={16} />}{draft.review?.status === 'approved' ? 'Xem bài đã duyệt' : 'Đọc & duyệt bài'}</button></article>;
    })}</div>
    <p className="form-help">Đích đăng: tài khoản Vượng Nguyễn. Xuất bản đang tắt theo lựa chọn của bạn; duyệt bài chưa đăng lên Facebook.</p>
  </section>;
}

export function ApprovalPanel({ draft, dirty, request, onRefresh, notify }) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setChecked(false); }, [draft.approvalDigest, dirty]);
  async function act(action) {
    setBusy(true);
    try { await action(); await onRefresh(); } catch (error) { notify(error.message, 'error'); } finally { setBusy(false); }
  }
  return <section className="approval-panel"><div className="editor-label"><strong>Kiểm tra & duyệt</strong><span className={`review-badge review-${draft.review?.status || 'attention'}`}>{LABELS[draft.review?.status] || 'Cần kiểm tra'}</span></div><div className="review-checks">{draft.review?.checks?.map(check => <span key={check.id}>{check.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}{check.label}</span>)}</div>{draft.imageStatus === 'stale' && <button className="button button-secondary" disabled={busy || dirty} onClick={() => act(() => request(`/api/drafts/${draft.id}/image/confirm`, { method: 'POST', body: JSON.stringify({ revision: draft.contentRevision || 1 }) }))}>Tôi đã kiểm tra hình khớp nội dung mới</button>}
    {draft.review?.status !== 'approved' ? <><label className="approval-check"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} />Tôi đã đọc nguồn, kiểm tra nhận định và hình minh họa.</label><div className="button-row"><button className="button button-primary" disabled={busy || dirty || !checked || !draft.review?.ready || draft.status !== 'draft'} onClick={() => act(async () => { await request(`/api/drafts/${draft.id}/approve`, { method: 'POST', body: JSON.stringify({ sourceChecked: true, revision: draft.contentRevision || 1, digest: draft.approvalDigest }) }); notify('Đã duyệt bài. Xuất bản hiện đang tắt.'); })}>{busy ? <Loader2 className="spin" size={16} /> : <Check size={16} />} Duyệt nội dung</button><button className="button button-secondary" disabled={busy || dirty || draft.status !== 'draft'} onClick={() => act(async () => { await request(`/api/drafts/${draft.id}/archive`, { method: 'POST' }); notify('Đã loại bài khỏi hàng chờ.'); })}>Loại khỏi hàng chờ</button></div></> : <p>Đã duyệt nội dung và hình. Chỉnh sửa bài hoặc thay hình sẽ yêu cầu duyệt lại.</p>}
    <p className="form-help">{dirty ? 'Lưu thay đổi trước khi duyệt. ' : ''}Xuất bản đang tắt; trạng thái duyệt được lưu riêng với trạng thái đã đăng.</p></section>;
}

export function ImportLink({ request, onRefresh, notify }) {
  const [url, setUrl] = useState(''); const [busy, setBusy] = useState(false);
  return <form className="import-link" onSubmit={async event => { event.preventDefault(); setBusy(true); try { const result = await request('/api/articles/import', { method: 'POST', body: JSON.stringify({ url }) }); setUrl(''); await onRefresh(); notify(result.message); } catch (error) { notify(error.message, 'error'); } finally { setBusy(false); } }}><label htmlFor="import-url">Có bài hay muốn đưa vào Studio?</label><div><input id="import-url" type="url" required placeholder="Dán link bài VnExpress…" value={url} onChange={event => setUrl(event.target.value)} /><button className="button button-secondary" disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <Newspaper size={16} />}{busy ? 'Đang đọc nguồn…' : 'Thêm bài nguồn'}</button></div></form>;
}

export function PerformanceSummary({ drafts }) {
  const measured = drafts.filter(draft => draft.status === 'posted' && !draft.isDemo && draft.metrics?.source === 'manual');
  return <section className="performance-summary"><h2>Kết quả nội dung</h2><p>Nhập từ số liệu bạn kiểm tra trên Facebook hoặc website. Chưa kết nối thống kê tự động.</p><div>{[['views', 'Lượt xem'], ['followers', 'Theo dõi mới'], ['clicks', 'Click website'], ['inquiries', 'Khách liên hệ']].map(([key, label]) => { const values = measured.map(draft => draft.metrics[key]).filter(value => Number.isFinite(value)); return <div key={key}><span>{label}</span><strong>{values.length ? values.reduce((sum, value) => sum + value, 0).toLocaleString('vi-VN') : '—'}</strong><small>{values.length ? `${values.length} bài có số liệu tự nhập` : 'Chưa có số liệu'}</small></div>; })}</div></section>;
}

export function PerformancePanel({ draft, request, onRefresh, notify }) {
  const [values, setValues] = useState(draft.metrics || {}); const [busy, setBusy] = useState(false);
  if (draft.status !== 'posted' || draft.isDemo) return null;
  return <section className="approval-panel"><h3>Kết quả bài đã đăng</h3><p className="form-help">Nhập số liệu bạn đã kiểm tra. Bỏ trống nếu chưa có; các chỉ số này không được tự lấy từ Facebook.</p><div className="metrics-inputs">{[['views', 'Lượt xem'], ['followers', 'Theo dõi mới'], ['clicks', 'Click website'], ['inquiries', 'Khách liên hệ']].map(([key, label]) => <label className="form-label" key={key}>{label}<input type="number" min="0" max="1000000000" value={values[key] ?? ''} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value === '' ? null : Number(event.target.value) }))} /></label>)}</div><button className="button button-secondary" disabled={busy} onClick={async () => { setBusy(true); try { await request(`/api/drafts/${draft.id}/metrics`, { method: 'PUT', body: JSON.stringify(values) }); await onRefresh(); notify('Đã lưu số liệu bạn cung cấp.'); } catch (error) { notify(error.message, 'error'); } finally { setBusy(false); } }}>{busy ? 'Đang lưu…' : 'Lưu kết quả'}</button></section>;
}
