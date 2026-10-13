import { facebookPost } from '../../shared/facebook.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle, ArrowDownToLine, ArrowRight, ArrowUpRight, Building2,
  Check, CheckCircle2, ChevronRight, Clock3, Copy, ExternalLink,
  FileText, History, Home, ImagePlus, Info, Leaf, Loader2, Menu,
  Newspaper, RefreshCw, Search, Settings, SlidersHorizontal, Sparkles, X,
} from 'lucide-react';

const NAV = [
  { id: 'news', label: 'Tin mới', icon: Newspaper },
  { id: 'drafts', label: 'Bài nháp', icon: FileText },
  { id: 'history', label: 'Lịch sử', icon: History },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];
const TOPICS = ['Tất cả', 'Thị trường', 'Chính sách', 'Nhà ở', 'Quy hoạch'];
const EMPTY = { articles: [], drafts: [], jobs: [], settings: null, status: {}, stats: {} };
const ACTIVE_JOBS = new Set(['queued', 'pending', 'running', 'processing']);

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('Chưa kết nối được với máy chủ. Kiểm tra npm run dev và thử lại.');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || body?.error || body?.message || `Yêu cầu thất bại (${response.status}).`);
  if (body === null) throw new Error('Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.');
  return body;
}

function formatDate(value, options = {}) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh', ...options }).format(new Date(value));
}

function topicMatches(article, filter) {
  if (filter === 'Tất cả') return true;
  return (article.topic || '').toLocaleLowerCase('vi').includes(filter.toLocaleLowerCase('vi'));
}

function IconButton({ label, children, ...props }) {
  return <button className="icon-button" aria-label={label} title={label} {...props}>{children}</button>;
}

function CityArt({ variant = 0, className = '', hero = false }) {
  const palettes = [
    { bg: '#e5ebe4', back: '#bacdbb', front: '#5a7d66', shade: '#2f5844', accent: '#c98d63' },
    { bg: '#eee7dc', back: '#d9cab5', front: '#b69c7c', shade: '#756f54', accent: '#d5a470' },
    { bg: '#e1e8e9', back: '#c0d1d3', front: '#749298', shade: '#43656c', accent: '#d8aa78' },
    { bg: '#ece7e0', back: '#d4c7bb', front: '#a18c7c', shade: '#77675c', accent: '#bf8a66' },
  ];
  const c = palettes[variant % palettes.length];
  return <svg className={`city-art ${className}`} viewBox="0 0 600 320" fill="none" role="img" aria-label="Tranh minh họa kiến trúc đô thị">
    <rect width="600" height="320" fill={hero ? '#e7eadf' : c.bg} />
    <circle cx={hero ? 449 : 466} cy="79" r="39" fill="#f9f5e9" opacity=".9" />
    <path d="M0 260C93 225 152 258 242 238C335 218 390 239 600 208V320H0Z" fill={c.back} opacity=".35" />
    <path d="M41 255V148L122 107L202 149V255" fill={c.back} />
    <path d="M122 107V255H202V149Z" fill={c.front} opacity=".45" />
    <path d="M209 265V89L290 51L371 89V265" fill={c.front} />
    <path d="M290 51V265H371V89Z" fill={c.shade} />
    <path d="M363 265V158L444 119L526 158V265" fill={c.back} />
    <path d="M444 119V265H526V158Z" fill={c.front} />
    <path d="M265 265V196L306 173L348 197V265" fill={c.accent} />
    <path d="M306 173V265H348V197Z" fill="#ad7855" />
    {[0, 1, 2, 3].map(row => <g key={row} opacity=".7">
      {[0, 1, 2].map(col => <g key={col}>
        <path d={`M${226 + col * 19} ${107 + row * 31}v15l9-4v-15Z`} fill="#e5eadc" />
        <path d={`M${307 + col * 19} ${101 + row * 31}v15l9 4v-15Z`} fill="#89a38a" />
      </g>)}
    </g>)}
    {[0, 1, 2].map(row => <g key={row} opacity=".7">
      {[0, 1, 2].map(col => <g key={col}>
        <path d={`M${59 + col * 18} ${161 + row * 28}v12l8-4v-12Z`} fill="#f3f1e4" />
        <path d={`M${462 + col * 18} ${170 + row * 28}v12l8 4v-12Z`} fill="#dbe4d8" />
      </g>)}
    </g>)}
    <path d="M0 276L151 252L326 294L600 249V320H0Z" fill={c.shade} opacity=".12" />
    <path d="M0 299L150 273L325 316L600 271" stroke="#fff" strokeWidth="3" opacity=".8" />
    <path d="M108 271v-36M494 284v-45M407 290v-35M168 283v-31" stroke={c.shade} strokeWidth="3" />
    <ellipse cx="108" cy="226" rx="18" ry="28" fill={c.shade} />
    <ellipse cx="494" cy="230" rx="22" ry="34" fill={c.shade} />
    <ellipse cx="407" cy="249" rx="16" ry="25" fill={c.front} />
    <ellipse cx="168" cy="246" rx="13" ry="20" fill={c.front} />
    <path d="M16 87h50M27 77h22M389 43h27" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".6" />
  </svg>;
}

function EmptyState({ icon: Icon = Newspaper, title, children, action }) {
  return <div className="empty-state">
    <div className="empty-icon"><Icon size={25} strokeWidth={1.5} /></div>
    <h3>{title}</h3><p>{children}</p>{action}
  </div>;
}

function App() {
  const [state, setState] = useState(EMPTY);
  const [tab, setTab] = useState('news');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('Tất cả');
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [pendingArticleId, setPendingArticleId] = useState(null);
  const [pendingJobId, setPendingJobId] = useState(null);
  const toastTimer = useRef(null);

  const notify = useCallback((message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 6500);
  }, []);
  const refreshState = useCallback(async () => {
    try {
      const next = await request('/api/state');
      setState({ ...EMPTY, ...next });
      setLoadError('');
      return next;
    } catch (error) {
      setLoadError(error.message);
      return null;
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshState(); return () => clearTimeout(toastTimer.current); }, [refreshState]);
  const hasActiveJobs = state.jobs.some(job => ACTIVE_JOBS.has(job.status));
  useEffect(() => {
    const timer = setInterval(refreshState, hasActiveJobs ? 3000 : 15000);
    return () => clearInterval(timer);
  }, [refreshState, hasActiveJobs]);

  useEffect(() => {
    if (!pendingArticleId) return;
    const pendingJob = state.jobs.find(item => item.id === pendingJobId);
    const draft = pendingJob?.draftId ? state.drafts.find(item => item.id === pendingJob.draftId) : null;
    if (draft) {
      setSelectedArticleId(null);
      setSelectedDraftId(draft.id);
      setPendingArticleId(null);
      setPendingJobId(null);
      notify('Bài nháp đã sẵn sàng. Bạn có thể chỉnh sửa trước khi chia sẻ.');
    } else {
      if (pendingJob?.status === 'failed') { setPendingArticleId(null); setPendingJobId(null); notify(pendingJob.error || 'Chưa tạo được bài. Vui lòng thử lại.', 'error'); }
    }
  }, [state.drafts, state.jobs, pendingArticleId, pendingJobId, notify]);

  async function runAction(name, fn) {
    setBusyAction(name);
    try { await fn(); } catch (error) { notify(error.message, 'error'); }
    finally { setBusyAction(''); }
  }

  async function fetchFeeds() {
    await runAction('refresh', async () => {
      const result = await request('/api/feeds/refresh', { method: 'POST' });
      await refreshState();
      notify(result.message || `Đã cập nhật ${result.added || 0} tin mới.`);
    });
  }

  async function loadDemo() {
    await runAction('demo', async () => {
      const result = await request('/api/demo', { method: 'POST' });
      await refreshState();
      notify(result.message || 'Đã thêm dữ liệu minh họa để bạn trải nghiệm.');
    });
  }

  async function generate(article) {
    const existing = state.drafts.find(draft => draft.articleId === article.id);
    if (existing) { setSelectedArticleId(null); setSelectedDraftId(existing.id); return; }
    if (!article.isDemo && state.settings?.writingMode !== 'free' && !state.status.aiConfigured) {
      notify('Thêm OPENAI_API_KEY vào .env.local rồi khởi động lại để viết bài từ tin thật. Bạn có thể thử bằng dữ liệu minh họa.', 'info');
      return;
    }
    await runAction(`generate-${article.id}`, async () => {
      const result = await request(`/api/articles/${article.id}/generate`, { method: 'POST' });
      setPendingArticleId(article.id);
      setPendingJobId(result.jobId);
      await refreshState();
      notify('Đang chuẩn bị nội dung. Bài nháp sẽ mở khi hoàn thành.', 'info');
    });
  }

  async function saveDraft(id, changes) {
    const draft = await request(`/api/drafts/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
    await refreshState();
    return draft;
  }

  async function regenerateDraft(draft) {
    if (!draft.isDemo && state.settings?.writingMode !== 'free' && !state.status.aiConfigured) {
      notify('Thêm OPENAI_API_KEY vào .env.local rồi khởi động lại để tạo lại bài từ tin thật.', 'info');
      return;
    }
    const result = await request(`/api/articles/${draft.articleId}/generate`, { method: 'POST', body: JSON.stringify({ force: true }) });
    setPendingArticleId(draft.articleId);
    setPendingJobId(result.jobId);
    await refreshState();
    notify('Đang viết một bản nháp mới. Bài hiện tại vẫn được giữ trong thư viện.', 'info');
  }

  async function generateImage(id, options = {}) {
    await request(`/api/drafts/${id}/image`, { method: 'POST', body: JSON.stringify(options) });
    await refreshState();
    notify('Đang tạo hình minh họa. Bạn vẫn có thể chỉnh sửa bài.', 'info');
  }

  const filteredArticles = state.articles.filter(article => topicMatches(article, topic) && `${article.title} ${article.summary} ${article.source}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const drafts = state.drafts.filter(draft => draft.status !== 'posted');
  const posted = state.drafts.filter(draft => draft.status === 'posted');
  const selectedArticle = state.articles.find(article => article.id === selectedArticleId);
  const selectedDraft = state.drafts.find(draft => draft.id === selectedDraftId);
  const sourceArticle = selectedDraft && state.articles.find(article => article.id === selectedDraft.articleId);
  const pageMeta = {
    news: { title: 'Tin mới, góc nhìn mới.', description: 'Những câu chuyện bất động sản, sẵn sàng trở thành bài viết của bạn.' },
    drafts: { title: 'Thêm một chút chất riêng.', description: 'Duyệt nội dung, chỉnh giọng văn và chuẩn bị bài viết trước khi chia sẻ.' },
    history: { title: 'Những câu chuyện đã kể.', description: 'Lưu lại những bài bạn đã đánh dấu chia sẻ trên Facebook cá nhân.' },
    settings: { title: 'Studio theo cách của bạn.', description: 'Điều chỉnh nguồn tin, giọng văn và nhịp làm việc hằng ngày.' },
  }[tab];

  function navigate(id) { setTab(id); setMobileNav(false); setSearch(''); }

  return <div className="app-shell">
    {mobileNav && <button className="nav-backdrop" aria-label="Đóng menu" onClick={() => setMobileNav(false)} />}
    <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
      <a href="#" className="brand" onClick={event => { event.preventDefault(); navigate('news'); }} aria-label="Địa Ốc — về Tin mới">
        <span className="brand-symbol"><Home size={25} strokeWidth={1.5} /><span /></span>
        <span><strong>Địa Ốc<span className="brand-period">.</span></strong><small>CONTENT STUDIO</small></span>
      </a>
      <div className="sidebar-label">KHÔNG GIAN CỦA BẠN</div>
      <nav aria-label="Điều hướng chính">{NAV.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${tab === id ? 'active' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => navigate(id)}>
        <Icon size={19} strokeWidth={1.6} /><span>{label}</span>{id === 'drafts' && drafts.length > 0 && <span className="nav-count">{drafts.length}</span>}{id === 'news' && <span className="nav-live" />}
      </button>)}</nav>
      <div className="sidebar-note"><div className="note-icon"><Leaf size={18} /></div><strong>Mỗi bài viết, một góc nhìn.</strong><p>Đọc kỹ nguồn tin. Thêm suy nghĩ của bạn. Chia sẻ điều có ích.</p><span className="small-rule" /></div>
      <div className="sidebar-footer">
        <div className="workspace-avatar">C<span /></div><div><strong>Studio cá nhân</strong><small>Không gian local</small></div><span className="local-indicator" title="Dữ liệu được lưu trên máy chủ local" />
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar">
        <div className="breadcrumb"><IconButton label="Mở menu" onClick={() => setMobileNav(true)} className="icon-button mobile-menu"><Menu size={21} /></IconButton><span>Không gian làm việc</span><ChevronRight size={13} /><strong>{NAV.find(item => item.id === tab).label}</strong></div>
        <div className="topbar-right"><span className="local-pill"><span /> Local workspace</span><span className="topbar-separator" /><span className="user-avatar">C</span></div>
      </header>

      <main className="page-content">
        <div className="page-heading"><div><div className="eyebrow">{tab === 'news' ? 'BẢN TIN BẤT ĐỘNG SẢN' : 'ĐỊA ỐC · CONTENT STUDIO'}</div><h1>{pageMeta.title}</h1><p>{pageMeta.description}</p></div>
          {tab === 'news' && <button className="button button-primary refresh-button" onClick={fetchFeeds} disabled={busyAction === 'refresh' || state.status.workerBusy}><RefreshCw size={16} className={busyAction === 'refresh' ? 'spin' : ''} />{busyAction === 'refresh' ? 'Đang lấy tin…' : 'Cập nhật tin mới'}</button>}
        </div>

        {loadError && <div className="notice notice-error" role="alert"><AlertCircle size={18} /><span>{loadError}</span><button onClick={refreshState}>Thử lại</button></div>}
        {state.status.feedError && <div className="notice notice-warning" role="status"><AlertCircle size={18} /><span>Nguồn RSS đang gặp lỗi: {state.status.feedError}</span></div>}
        {hasActiveJobs && <div className="notice notice-progress" role="status"><Loader2 className="spin" size={17} /><span>Studio đang xử lý {state.jobs.filter(job => ACTIVE_JOBS.has(job.status)).length} tác vụ. Nội dung sẽ tự cập nhật.</span></div>}

        {tab === 'news' && <>
          <section className="overview" aria-label="Tổng quan studio">
            <StatCard icon={Newspaper} value={state.stats.articles ?? state.articles.length} label="Tin trong thư viện" detail="Từ các nguồn RSS" />
            <StatCard icon={FileText} value={state.stats.drafts ?? drafts.length} label="Bài nháp chờ duyệt" detail="Sẵn sàng thêm góc nhìn" accent />
            <StatCard icon={CheckCircle2} value={state.stats.posted ?? posted.length} label="Đã đánh dấu chia sẻ" detail="Do bạn xác nhận thủ công" />
          </section>

          <section className="studio-hero">
            <div className="hero-copy"><span className="hero-kicker"><span /> TIN TỨC → GÓC NHÌN → CHIA SẺ</span><h2>Đọc tin hay.<br />Viết điều có giá trị.</h2><p>Một nguồn cảm hứng mỗi ngày cho bài viết bất động sản mang dấu ấn của bạn.</p><button className="hero-link" onClick={() => document.getElementById('news-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Khám phá bản tin <ArrowRight size={17} /></button></div>
            <div className="hero-art"><CityArt hero variant={0} /><div className="hero-art-label"><Building2 size={14} /> GÓC NHÌN TỪ NHỮNG ĐỔI THAY</div></div>
            <span className="hero-number">01 — STUDIO NOTES</span>
          </section>

          {!state.status.aiConfigured && state.settings?.writingMode !== 'free' && !loading && <div className="setup-banner"><div className="setup-icon"><Sparkles size={18} /></div><div><strong>Studio đã sẵn sàng. Kết nối AI để bắt đầu viết.</strong><p>Thêm API key trong cấu hình local hoặc dùng dữ liệu minh họa để thử luồng làm việc.</p></div><div className="setup-actions"><button className="text-button" disabled={busyAction === 'demo'} onClick={loadDemo}>{busyAction === 'demo' ? 'Đang thêm…' : 'Thử dữ liệu mẫu'} <Sparkles size={13} /></button><button className="text-button" onClick={() => navigate('settings')}>Thiết lập <ArrowUpRight size={15} /></button></div></div>}

          <section className="feed-section" id="news-feed" aria-label="Danh sách bản tin">
            <div className="section-heading"><div><h2>Dòng tin của bạn <span>{state.articles.length}</span></h2><p><span className="tiny-dot" />{state.status.lastFetchedAt ? `Cập nhật ${formatDate(state.status.lastFetchedAt, { hour: '2-digit', minute: '2-digit' })}` : 'Chưa lấy tin · Bắt đầu bằng cách cập nhật RSS'}</p></div><button className="text-button muted" onClick={() => navigate('settings')}><SlidersHorizontal size={15} /> Tùy chỉnh</button></div>
            <div className="feed-toolbar"><div className="topic-tabs" role="group" aria-label="Lọc chủ đề">{TOPICS.map(item => <button key={item} className={topic === item ? 'selected' : ''} aria-pressed={topic === item} onClick={() => setTopic(item)}>{item}</button>)}</div><label className="search-field"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm một câu chuyện…" aria-label="Tìm tin theo từ khóa" />{search && <button aria-label="Xóa tìm kiếm" onClick={() => setSearch('')}><X size={14} /></button>}</label></div>

            {loading ? <div className="article-grid" aria-label="Đang tải bản tin">{[0, 1, 2].map(item => <div className="skeleton-card" key={item}><div /><span /><span /><span /></div>)}</div> : filteredArticles.length ? <div className="article-grid">{filteredArticles.map((article, index) => <ArticleCard key={article.id} article={article} index={index} existingDraft={state.drafts.find(draft => draft.articleId === article.id)} processing={busyAction === `generate-${article.id}` || state.jobs.some(job => job.articleId === article.id && ACTIVE_JOBS.has(job.status))} onRead={() => setSelectedArticleId(article.id)} onGenerate={() => generate(article)} />)}</div> : state.articles.length ? <EmptyState icon={Search} title="Chưa tìm thấy câu chuyện phù hợp" action={<button className="button button-secondary" onClick={() => { setSearch(''); setTopic('Tất cả'); }}>Xóa bộ lọc</button>}>Thử một từ khóa khác hoặc chọn tất cả chủ đề.</EmptyState> : <div className="first-story"><div className="first-story-art"><CityArt variant={1} /></div><div><span className="eyebrow">CÂU CHUYỆN ĐẦU TIÊN</span><h3>Một bản tin, rất nhiều cảm hứng.</h3><p>Lấy tin BĐS từ VnExpress để bắt đầu. Bạn cũng có thể trải nghiệm với dữ liệu minh họa, không cần API key.</p><div className="button-row"><button className="button button-primary" onClick={fetchFeeds} disabled={busyAction === 'refresh'}><RefreshCw size={15} /> Lấy tin từ RSS</button><button className="button button-secondary" onClick={loadDemo} disabled={busyAction === 'demo'}>{busyAction === 'demo' ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />} Thử dữ liệu minh họa</button></div></div></div>}
          </section>
          {state.articles.length > 0 && <div className="feed-bottom"><span>Nội dung từ RSS · Luôn đối chiếu bài viết gốc trước khi chia sẻ</span><button onClick={loadDemo} disabled={busyAction === 'demo'}>{busyAction === 'demo' ? 'Đang thêm…' : 'Thử dữ liệu minh họa'}</button></div>}
        </>}

        {tab === 'drafts' && <>
          <div className="workflow-strip"><span><CheckCircle2 size={16} /> Chọn tin</span><ChevronRight size={14} /><span className="current"><FileText size={16} /> Duyệt & chỉnh sửa</span><ChevronRight size={14} /><span><Copy size={16} /> Copy để chia sẻ</span></div>
          <div className="section-heading"><div><h2>Bài đang chuẩn bị <span>{drafts.length}</span></h2><p>Giữ lại thông tin chính xác, thêm tiếng nói của chính bạn.</p></div></div>
          {drafts.length ? <div className="article-grid">{drafts.map((draft, index) => <DraftCard key={draft.id} draft={draft} article={state.articles.find(article => article.id === draft.articleId)} index={index} onOpen={() => setSelectedDraftId(draft.id)} />)}</div> : <EmptyState icon={FileText} title="Bài viết tiếp theo bắt đầu từ một bản tin" action={<button className="button button-primary" onClick={() => navigate('news')}>Khám phá tin mới <ArrowRight size={16} /></button>}>Chọn một bản tin và nhấn “Tạo bài viết”. Bài nháp của bạn sẽ được lưu tại đây.</EmptyState>}
        </>}

        {tab === 'history' && <>
          <div className="notice notice-neutral"><Info size={17} /><span>Danh sách ghi nhận các bài bạn tự đánh dấu đã đăng. Studio không kết nối hay tự đăng lên Facebook.</span></div>
          {posted.length ? <div className="history-list">{posted.map(draft => <button className="history-row" key={draft.id} onClick={() => setSelectedDraftId(draft.id)}><span className="history-icon"><CheckCircle2 size={21} /></span><div><strong>{draft.title}</strong><span>{draft.isDemo ? 'Dữ liệu minh họa · ' : ''}Đánh dấu ngày {formatDate(draft.updatedAt, { year: 'numeric' })}</span></div><span className="status-pill status-posted">Đã chia sẻ</span><ArrowUpRight size={18} /></button>)}</div> : <EmptyState icon={History} title="Lưu lại hành trình chia sẻ của bạn" action={<button className="button button-primary" onClick={() => navigate('drafts')}>Đến bài nháp <ArrowRight size={16} /></button>}>Sau khi tự đăng lên Facebook, mở bài nháp và chọn “Đánh dấu đã đăng” để lưu vào lịch sử.</EmptyState>}
        </>}

        {tab === 'settings' && (state.settings ? <SettingsPanel settings={state.settings} status={state.status} onSave={async changes => { await request('/api/settings', { method: 'PUT', body: JSON.stringify(changes) }); await refreshState(); notify('Đã lưu thiết lập studio.'); }} onDemo={loadDemo} demoBusy={busyAction === 'demo'} /> : <EmptyState icon={Settings} title={loading ? 'Đang tải thiết lập…' : 'Chưa tải được thiết lập'} action={!loading && <button className="button button-secondary" onClick={refreshState}>Thử lại</button>}>Thiết lập được lưu trên máy chủ local của bạn.</EmptyState>)}

        <footer className="page-footer"><span><Home size={13} /> Địa Ốc Content Studio</span><span>Đọc có chọn lọc. Chia sẻ có trách nhiệm.</span><span>MADE FOR YOUR PERSPECTIVE <span className="footer-dot">✳</span></span></footer>
      </main>
    </div>

    {selectedArticle && <ArticleDrawer article={selectedArticle} existingDraft={state.drafts.find(draft => draft.articleId === selectedArticle.id)} busy={busyAction === `generate-${selectedArticle.id}` || state.jobs.some(job => job.articleId === selectedArticle.id && ACTIVE_JOBS.has(job.status))} onClose={() => setSelectedArticleId(null)} onGenerate={() => generate(selectedArticle)} />}
    {selectedDraft && <DraftEditor key={selectedDraft.id} draft={selectedDraft} article={sourceArticle} aiConfigured={state.status.aiConfigured} writingMode={state.settings?.writingMode} jobs={state.jobs} onClose={() => setSelectedDraftId(null)} onSave={changes => saveDraft(selectedDraft.id, changes)} onRegenerate={() => regenerateDraft(selectedDraft)} onUploaded={refreshState} onImage={options => generateImage(selectedDraft.id, options)} onCopied={async () => { await request(`/api/drafts/${selectedDraft.id}/copy`, { method: 'POST' }); await refreshState(); }} notify={notify} />}
    {toast && <div className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>{toast.type === 'error' ? <AlertCircle size={20} /> : toast.type === 'info' ? <Info size={20} /> : <CheckCircle2 size={20} />}<span>{toast.message}</span><IconButton label="Đóng thông báo" onClick={() => setToast(null)}><X size={16} /></IconButton></div>}
  </div>;
}

function StatCard({ icon: Icon, value, label, detail, accent }) {
  return <div className={`stat-card ${accent ? 'stat-accent' : ''}`}><div className="stat-top"><span>{label}</span><Icon size={17} strokeWidth={1.6} /></div><div className="stat-bottom"><strong>{String(value).padStart(2, '0')}</strong><span>{detail}</span></div></div>;
}

function ArticleCard({ article, index, existingDraft, processing, onRead, onGenerate }) {
  return <article className="article-card"><button className="article-cover" onClick={onRead} aria-label={`Đọc bản tin: ${article.title}`}><CityArt variant={index} /><span className="cover-label">HÌNH MINH HỌA</span><span className="topic-badge">{article.topic || 'Bất động sản'}</span>{article.isDemo && <span className="demo-badge">DEMO</span>}</button><div className="article-body"><div className="article-meta"><span className="source-marker">{article.isDemo ? 'MINH HỌA' : article.source || 'VnExpress'}</span><span>·</span><span>{formatDate(article.publishedAt)}</span></div><button className="article-title" onClick={onRead}><h3>{article.title}</h3></button><p className="article-summary">{article.summary}</p><div className="article-footer"><span className={`article-state ${existingDraft ? 'has-draft' : ''}`}><span />{existingDraft ? (existingDraft.status === 'posted' ? 'Đã chia sẻ' : 'Đã có bài nháp') : ({ needs_context: 'Thiếu ngữ cảnh', error: 'Cần thử lại', uncertain: 'Cần kiểm tra' }[article.status] || 'Chưa tạo bài')}</span><button className="create-button" onClick={onGenerate} disabled={processing}>{processing ? <Loader2 size={15} className="spin" /> : existingDraft ? <FileText size={15} /> : <Sparkles size={15} />}{processing ? 'Đang viết…' : existingDraft ? 'Mở bài' : 'Tạo bài viết'}</button></div></div></article>;
}

function DraftCard({ draft, article, index, onOpen }) {
  return <article className="article-card"><button className="article-cover draft-cover" onClick={onOpen} aria-label={`Chỉnh sửa: ${draft.title}`}>{draft.imageUrl ? <img src={draft.imageUrl} alt={`Hình minh họa cho ${draft.title}`} /> : <CityArt variant={index} />}<span className="cover-label">{draft.imageUrl ? draft.imageKind === 'ai' ? 'HÌNH MINH HỌA AI' : 'HÌNH MINH HỌA' : 'CHƯA TẠO HÌNH'}</span><span className="topic-badge">Bài nháp</span>{draft.isDemo && <span className="demo-badge">DEMO</span>}</button><div className="article-body"><div className="article-meta"><span className="source-marker">{article?.source || 'STUDIO'}</span><span>·</span><span>{formatDate(draft.updatedAt)}</span></div><button className="article-title" onClick={onOpen}><h3>{draft.title}</h3></button><p className="article-summary">{draft.content}</p><div className="article-footer"><span className="article-state"><span />{draft.reviewFlags?.length ? 'Cần kiểm tra nguồn' : 'Chờ bạn duyệt'}</span><button className="create-button" onClick={onOpen}><FileText size={15} /> Chỉnh sửa</button></div></div></article>;
}

function DrawerShell({ title, subtitle, onClose, children, wide = false, beforeClose }) {
  const closeButton = useRef(null);
  const drawerRef = useRef(null);
  const close = useRef(beforeClose || onClose);
  close.current = beforeClose || onClose;
  useEffect(() => {
    const focusedBefore = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    function onKey(event) {
      if (event.key === 'Escape') close.current();
      if (event.key === 'Tab') {
        const elements = [...drawerRef.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]')].filter(element => element.getClientRects().length);
        const first = elements[0]; const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey); focusedBefore?.focus(); };
  }, []);
  return <div className="drawer-overlay"><button className="drawer-backdrop" aria-label="Đóng cửa sổ" onClick={() => close.current()} /><section ref={drawerRef} className={`drawer ${wide ? 'drawer-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="drawer-title"><header className="drawer-header"><div><span className="eyebrow">{subtitle}</span><h2 id="drawer-title">{title}</h2></div><button ref={closeButton} className="icon-button" aria-label="Đóng cửa sổ" onClick={() => close.current()}><X size={22} /></button></header>{children}</section></div>;
}

function ArticleDrawer({ article, existingDraft, busy, onClose, onGenerate }) {
  return <DrawerShell title="Từ nguồn tin đến góc nhìn" subtitle="BẢN TIN GỐC" onClose={onClose}><div className="drawer-scroll"><div className="reader-art"><CityArt variant={0} /><span>Hình minh họa</span></div><div className="article-meta reader-meta"><span>{article.source}</span><span>·</span><span>{formatDate(article.publishedAt, { year: 'numeric' })}</span><span className="status-pill">{article.topic || 'Bất động sản'}</span></div><h3 className="reader-title">{article.title}</h3>{article.isDemo && <div className="notice notice-warning"><Info size={17} /><span>Đây là tin giả định để thử ứng dụng, không phải bản tin có thật. Không dùng làm căn cứ đăng tin.</span></div>}<div className="reader-summary"><span className="eyebrow">TÓM TẮT TỪ RSS</span><p>{article.summary || 'Nguồn RSS không có tóm tắt.'}</p></div><div className="source-note"><Info size={18} /><p>RSS cung cấp phần tóm tắt. Hãy đọc bài gốc để xác nhận bối cảnh, số liệu và thời điểm trước khi chia sẻ.</p></div>{article.url && !article.isDemo && <a className="button button-secondary full-width" href={article.url} target="_blank" rel="noreferrer">Đọc bài viết tại nguồn <ExternalLink size={15} /></a>}</div><div className="drawer-footer"><p>Giữ dữ kiện. Thêm góc nhìn của bạn.</p><button className="button button-primary" onClick={onGenerate} disabled={busy}>{busy ? <Loader2 size={17} className="spin" /> : <Sparkles size={17} />}{busy ? 'Đang viết…' : existingDraft ? 'Mở bài nháp' : 'Tạo bài viết'}</button></div></DrawerShell>;
}

function DraftEditor({ draft, article, aiConfigured, writingMode, jobs, onClose, onSave, onRegenerate, onImage, onCopied, onUploaded, notify }) {
  const [content, setContent] = useState(draft.content);
  const [busy, setBusy] = useState('');
  const [discardConfirm, setDiscardConfirm] = useState(false);
  const photoInput = useRef(null);
  const postText = facebookPost({ ...draft, content }, article);
  const lastServerContent = useRef(draft.content);
  useEffect(() => {
    const previous = lastServerContent.current;
    setContent(current => current === previous ? draft.content : current);
    lastServerContent.current = draft.content;
  }, [draft.content]);
  const dirty = content !== draft.content;
  const textBusy = jobs.some(job => job.articleId === draft.articleId && job.type === 'build_draft' && ACTIVE_JOBS.has(job.status));
  const imageBusy = jobs.some(job => job.draftId === draft.id && ACTIVE_JOBS.has(job.status)) || ['pending', 'queued', 'generating', 'processing'].includes(draft.imageStatus);
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  async function act(name, fn) {
    setBusy(name);
    try { await fn(); } catch (error) { notify(error.message, 'error'); }
    finally { setBusy(''); }
  }
  function close() { if (dirty) setDiscardConfirm(true); else onClose(); }
  async function persist(changes) {
    const saved = await onSave(changes);
    if (typeof saved.content === 'string') setContent(saved.content);
    return saved;
  }
  async function copy() {
    await act('copy', async () => {
      if (!content.trim()) throw new Error('Thêm nội dung trước khi copy.');
      const saved = dirty ? await persist({ content }) : { ...draft, content };
      const copyContent = facebookPost(saved, article);
      if (!navigator.clipboard?.writeText) throw new Error('Trình duyệt chưa cho phép clipboard. Bạn có thể chọn nội dung trong ô soạn thảo để copy.');
      await navigator.clipboard.writeText(copyContent);
      try { await onCopied(); } catch { notify('Đã copy nội dung. Chưa ghi nhận được thời điểm copy vào lịch sử.', 'info'); return; }
      notify('Đã copy nội dung. Bạn có thể paste vào Facebook cá nhân.');
    });
  }


  async function downloadPost() {
    await act('download', async () => {
      if (dirty) await persist({ content });
      const response = await fetch(`/api/drafts/${draft.id}/export`);
      if (!response.ok) throw new Error('Chưa tải được nội dung bài.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url; link.download = `facebook-${draft.id}.txt`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  async function uploadPhoto(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    await act('upload', async () => {
      if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Chọn ảnh JPG, PNG hoặc WebP, tối đa 8 MB.');
      await request(`/api/drafts/${draft.id}/photo`, { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
      await onUploaded();
      notify('Đã dùng ảnh của anh để tạo bìa, không gọi API ảnh.');
    });
  }

  async function regenerate() {
    if (!draft.isDemo && writingMode !== 'free' && !aiConfigured) {
      notify('Thêm OPENAI_API_KEY vào .env.local rồi khởi động lại để tạo lại bài từ tin thật.', 'info');
      return;
    }
    await act('regenerate', async () => {
      if (dirty) await persist({ content });
      await onRegenerate();
    });
  }
  return <DrawerShell title="Thêm góc nhìn của bạn" subtitle="BIÊN TẬP BÀI VIẾT" wide onClose={onClose} beforeClose={close}>
    <div className="drawer-scroll editor-scroll">
      {draft.isDemo && <div className="notice notice-warning"><Info size={17} /><span>Bản nháp minh họa từ dữ liệu giả định. Hãy thử thao tác và không đăng như tin thật.</span></div>}
      {draft.reviewFlags?.length > 0 && <div className="review-flags"><AlertCircle size={18} /><div><strong>Cần kiểm tra trước khi chia sẻ</strong>{draft.reviewFlags.map((flag, index) => <p key={index}>{flag}</p>)}</div></div>}
      {draft.perspective && <p className="form-help">{draft.generationProvider === 'local' ? 'Mẫu nhận định cục bộ' : 'Skill RSS → góc nhìn cá nhân'} · {draft.contextUsed ? 'Có liên hệ dự án từ context của anh' : 'Dựa trên khu vực và chủ đề trong RSS'}</p>}
      <div className="editor-source"><span className="source-icon"><Newspaper size={19} /></span><div><small>NGUỒN THAM KHẢO</small><strong>{draft.sourceTitle || article?.title || draft.title}</strong><span>{article?.source || 'Studio'} · {formatDate(article?.publishedAt || draft.createdAt, { year: 'numeric' })}</span></div>{article?.url && !article.isDemo && <a className="icon-button" href={article.url} target="_blank" rel="noreferrer" aria-label="Mở bài viết gốc"><ExternalLink size={17} /></a>}</div>
      {article?.url && !article.isDemo && <section className="publish-source"><div><strong>Link bài gốc</strong><button className="text-button" onClick={() => act('source', async () => { await navigator.clipboard.writeText(article.url); notify('Đã copy link nguồn.'); })}><Copy size={14} /> Copy link</button></div><a href={article.url} target="_blank" rel="noreferrer">{article.url}<ExternalLink size={14} /></a><p>{draft.sourceSummary || article.summary}</p></section>}
      <div className="editor-label"><span>{draft.isDemo ? 'Miễn phí với dữ liệu minh họa' : writingMode === 'free' ? 'Tạo lại bằng mẫu cục bộ · Miễn phí API' : 'Tạo lại bằng OpenAI · Dùng hạn mức API'}</span><button className="text-button" disabled={!!busy || textBusy} onClick={regenerate} title={draft.isDemo || writingMode === 'free' ? 'Tạo bản nháp mới miễn phí, giữ lại bài cũ' : 'Tạo bản nháp mới, sử dụng hạn mức và chi phí API; giữ lại bài cũ'}>{busy === 'regenerate' || textBusy ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />}{busy === 'regenerate' || textBusy ? 'Đang tạo bản mới…' : 'Tạo lại bài'}</button></div><div className="editor-columns"><div className="editor-writing"><div className="editor-label"><label htmlFor="draft-content">Nội dung bài viết</label><span className={dirty ? 'unsaved-label' : ''}>{textBusy || busy === 'regenerate' ? 'Đang tạo bản mới' : dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu'}</span></div><textarea id="draft-content" disabled={textBusy || busy === 'regenerate'} value={content} onChange={event => setContent(event.target.value)} spellCheck="false" placeholder="Viết thêm góc nhìn của bạn…" /><div className="editor-count"><span>{wordCount} từ · {content.length.toLocaleString('vi-VN')} ký tự</span><span>Facebook cá nhân</span></div></div>
        <aside className="editor-assets"><div className="editor-label"><strong>Hình minh họa</strong><span>{draft.imageKind === 'ai' ? 'AI STUDIO' : 'STUDIO'}</span></div><div className="generated-image">{draft.imageUrl ? <img src={draft.imageUrl} alt={`Hình minh họa cho ${draft.title}`} /> : <><CityArt variant={2} /><div className="image-placeholder"><ImagePlus size={26} /><strong>{imageBusy ? 'Đang tạo hình…' : 'Một hình ảnh cho câu chuyện'}</strong><span>{imageBusy ? 'Hình sẽ tự xuất hiện khi sẵn sàng' : 'Tạo ảnh minh họa phù hợp nội dung'}</span></div></>}{imageBusy && draft.imageUrl && <div className="image-loading"><Loader2 className="spin" /> Đang tạo hình mới…</div>}</div>{draft.imageError && <p className="field-error">{draft.imageError}</p>}<button className="button button-secondary full-width" disabled={!!busy || imageBusy} onClick={() => act('image', () => onImage({ templateOnly: true }))}>{imageBusy ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}{imageBusy ? 'Đang tạo hình…' : 'Tạo bìa đồ họa miễn phí'}</button><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadPhoto} /><button className="button button-secondary full-width photo-upload" disabled={!!busy || imageBusy} onClick={() => photoInput.current?.click()}><ImagePlus size={16} /> {busy === 'upload' ? 'Đang xử lý ảnh…' : 'Dùng ảnh thật của tôi'}</button>{!draft.isDemo && <button className="button button-secondary full-width" disabled={!!busy || imageBusy || !aiConfigured} onClick={() => act('image-ai', () => onImage({ useAI: true }))}><Sparkles size={16} /> Ảnh AI tự nhiên · có phí</button>}{!aiConfigured && !draft.isDemo && <p className="form-help">Thiết lập OPENAI_API_KEY để tạo hình AI.</p>}{(!aiConfigured || draft.imageError) && !draft.isDemo && <button className="button button-secondary full-width template-button" disabled={!!busy || imageBusy} onClick={() => act('template', () => onImage({ templateOnly: true }))}><ImagePlus size={15} /> Tạo bìa đồ họa miễn phí</button>}{draft.imageUrl && <a className="image-download" href={`${draft.imageUrl}?download=1`} download={`dia-oc-${draft.id}.png`}><ArrowDownToLine size={15} /> Tải hình về máy</a>}<p className="image-disclaimer">{draft.imageKind === 'upload' ? 'Ảnh do anh cung cấp.' : 'Hình minh họa, không phải ảnh thực tế của dự án.'}</p></aside>
      </div>
      <details className="facebook-preview" open><summary><FileText size={17} /><strong>Bài hoàn chỉnh để đăng Facebook</strong><span>Gồm chi tiết và link nguồn</span></summary><pre>{postText}</pre><div><button className="button button-secondary" disabled={!!busy} onClick={downloadPost}><ArrowDownToLine size={15} /> Tải nội dung .txt</button><button className="button button-primary" disabled={!!busy || !content.trim()} onClick={copy}><Copy size={15} /> Copy bài + link nguồn</button></div><p>Paste nội dung vào Facebook, rồi đính kèm ảnh PNG đã tải.</p></details>
      {draft.facts?.length > 0 && <details className="facts-box" open><summary><CheckCircle2 size={17} /><strong>Dữ kiện cần đối chiếu</strong><span>{draft.facts.length}</span></summary><ul>{draft.facts.map((fact, index) => <li key={index}>{typeof fact === 'string' ? fact : <><span>{fact.statement}</span>{fact.evidence && <blockquote>{fact.evidence}</blockquote>}</>}</li>)}</ul></details>}
      {draft.imageBrief && <details className="brief-box"><summary>Ý tưởng hình minh họa <ChevronRight size={15} /></summary><p>{draft.imageBrief}</p></details>}
      <div className="manual-post-note"><Info size={16} /><p>Bạn tự copy nội dung và đăng lên Facebook. Sau khi đăng, chọn “Đánh dấu đã đăng” để cập nhật lịch sử.</p></div>
      <div className="posted-control"><span className={`status-pill ${draft.status === 'posted' ? 'status-posted' : ''}`}>{draft.status === 'posted' ? 'Đã đánh dấu chia sẻ' : 'Đang là bài nháp'}</span><button className="text-button" disabled={!!busy} onClick={() => act('status', async () => { await persist({ content, status: draft.status === 'posted' ? 'draft' : 'posted' }); notify(draft.status === 'posted' ? 'Đã chuyển về bài nháp.' : 'Đã lưu vào lịch sử chia sẻ.'); })}>{draft.status === 'posted' ? 'Chuyển về bài nháp' : 'Đánh dấu đã đăng'} <Check size={15} /></button></div>
    </div>
    <div className="drawer-footer editor-footer"><button className="button button-secondary" disabled={!!busy || !dirty} onClick={() => act('save', async () => { await persist({ content }); notify('Đã lưu bài nháp.'); })}>{busy === 'save' ? <Loader2 className="spin" size={16} /> : <Check size={16} />} Lưu bài nháp</button><button className="button button-primary" disabled={!!busy || !content.trim()} onClick={copy}>{busy === 'copy' ? <Loader2 className="spin" size={16} /> : <Copy size={16} />} Copy bài + link nguồn</button></div>
    {discardConfirm && <div className="discard-confirm" role="alertdialog" aria-labelledby="discard-title"><div><h3 id="discard-title">Bài viết có thay đổi chưa lưu</h3><p>Lưu lại để tiếp tục chỉnh sửa vào lần sau.</p><div className="button-row"><button className="button button-secondary" onClick={() => setDiscardConfirm(false)}>Tiếp tục sửa</button><button className="button button-secondary" onClick={onClose}>Bỏ thay đổi</button><button className="button button-primary" disabled={!!busy} onClick={() => act('save-close', async () => { await persist({ content }); onClose(); })}>{busy === 'save-close' ? 'Đang lưu…' : 'Lưu & đóng'}</button></div></div></div>}
  </DrawerShell>;
}

function SettingsPanel({ settings, status, onSave, onDemo, demoBusy }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const change = (field, value) => setForm(previous => ({ ...previous, [field]: value }));
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try { await onSave(form); } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  return <div className="settings-layout"><form className="settings-form" onSubmit={submit}>
    <section className="settings-card"><div className="settings-card-heading"><span className="settings-section-icon"><SlidersHorizontal size={19} /></span><div><h2>Nhịp làm việc</h2><p>Tự động chuẩn bị, bạn là người quyết định chia sẻ.</p></div></div><Toggle label="Tự cập nhật bản tin RSS" description="Lấy tin mới trong thời gian máy chủ đang chạy." checked={!!form.autoFetch} onChange={value => change('autoFetch', value)} /><div className="settings-two-col"><label>Chu kỳ lấy tin <div className="number-input"><input type="number" min="5" max="1440" required value={form.fetchIntervalMinutes} onChange={event => change('fetchIntervalMinutes', Number(event.target.value))} /><span>phút</span></div></label><label>Bài nháp tối đa mỗi ngày <div className="number-input"><input type="number" min="1" max="100" required value={form.dailyDraftLimit} onChange={event => change('dailyDraftLimit', Number(event.target.value))} /><span>bài</span></div></label></div><Toggle label="Tự viết bài sau khi lấy tin" description="Tạo bản nháp theo hạn mức, vẫn chờ bạn duyệt." checked={!!form.autoGenerate} onChange={value => change('autoGenerate', value)} /><Toggle label="Tự tạo hình cho bài nháp" description={status.lowCostMode || form.writingMode === 'free' ? "Chế độ tiết kiệm: bìa đồ họa miễn phí, không gọi API ảnh." : "Mỗi lượt tạo hình AI sử dụng hạn mức API."} checked={!!form.autoImage} onChange={value => change('autoImage', value)} /><label className="settings-number-label">Lượt tạo hình tối đa mỗi ngày<div className="number-input"><input type="number" min="1" max="100" required value={form.dailyImageLimit} onChange={event => change('dailyImageLimit', Number(event.target.value))} /><span>lượt</span></div></label></section>
    <section className="settings-card"><div className="settings-card-heading"><span className="settings-section-icon"><FileText size={19} /></span><div><h2>Tiếng nói của bạn</h2><p>Định hướng cách AI diễn đạt bài viết.</p></div></div><label className="form-label">Chế độ viết<select value={form.writingMode || 'ai'} onChange={event => change('writingMode', event.target.value)}><option value="ai">OpenAI · Nhận định theo context · Phí token thấp</option><option value="free">Miễn phí · Mẫu nhận định cục bộ, không dùng ChatGPT</option></select></label><p className="form-help">OpenAI dùng tóm tắt RSS sẵn có để viết nhận định trong một lượt. Mẫu cục bộ dùng dữ kiện RSS với khung nhận định có sẵn.</p><label className="form-label">Giọng văn<input type="text" maxLength={200} value={form.tone || ''} onChange={event => change('tone', event.target.value)} placeholder="Gần gũi, rõ ràng, nhận xét thận trọng" required /></label><label className="form-label">Người đọc mục tiêu<textarea rows="3" maxLength={200} value={form.audience || ''} onChange={event => change('audience', event.target.value)} placeholder="Người quan tâm thị trường và có nhu cầu mua nhà để ở" required /></label></section>
    <section className="settings-card"><div className="settings-card-heading"><span className="settings-section-icon"><Home size={19} /></span><div><h2>Context khu vực &amp; dự án</h2><p>Liên hệ tin báo với dự án khi có dữ kiện phù hợp.</p></div></div><label className="form-label">Khu vực ưu tiên<input type="text" maxLength={140} value={form.focusArea || ''} onChange={event => change('focusArea', event.target.value)} placeholder="Ví dụ: An Phú, Rạch Chiếc, khu Đông TP.HCM" /></label><label className="form-label">Thông tin dự án<textarea rows="9" maxLength={6000} value={form.projectContext || ''} onChange={event => change('projectContext', event.target.value)} placeholder={'Liên hệ: An Phú; Rạch Chiếc\nDự án: [tên dự án]\nDữ kiện đã kiểm tra: [vị trí, trạng thái, lợi thế, ngày cập nhật]\nNguồn: https://...'} /></label><p className="form-help">Mỗi dự án một khối, cách nhau bằng dòng trống. Dòng “Liên hệ:” chứa địa danh hoặc chủ đề trong RSS, ngăn cách bằng dấu ;. Chỉ context khớp mới được gửi cho AI. Giá rumor và nội dung trong mẫu anh đưa chưa được xem là dữ kiện xác nhận.</p><p className="form-help">Bài gồm tiêu đề thu hút → tóm tắt → góc nhìn cá nhân về lợi thế → điều cần theo dõi → câu hỏi và hashtag. OpenAI có thể liên hệ dự án; chế độ mẫu miễn phí chỉ viết theo RSS.</p></section>
    {error && <div className="notice notice-error" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}<div className="settings-save"><span>Áp dụng cho các tác vụ tiếp theo.</span><button type="submit" className="button button-primary" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <Check size={16} />}{saving ? 'Đang lưu…' : 'Lưu thiết lập'}</button></div>
  </form><aside className="settings-aside"><section className="connection-card"><div className="connection-heading"><Sparkles size={21} /><span className={`connection-status ${status.aiConfigured ? 'connected' : ''}`}><span />{status.aiConfigured ? 'Đã kết nối' : 'Chưa kết nối'}</span></div><h2>Kết nối AI</h2><p>API key được đọc từ cấu hình máy chủ, không được hiển thị trên trình duyệt.</p>{!status.aiConfigured && <><div className="code-example"><small>.env.local</small><code>OPENAI_API_KEY=your_key_here</code></div><p className="form-help">Lưu file tại thư mục dự án, sau đó khởi động lại <code>npm run dev</code>.</p></>}<div className="model-line"><span>Văn bản</span><strong>{status.textModel || 'Theo cấu hình máy chủ'}</strong></div><div className="model-line"><span>Hình ảnh</span><strong>{status.imageModel || 'Theo cấu hình máy chủ'}</strong></div><div className="connection-note"><Info size={15} /><span>{status.lowCostMode ? 'Tiết kiệm: bài ngắn, dùng lại kết quả, bìa miễn phí. API văn bản vẫn tính phí token.' : 'Hạn mức áp dụng cả khi tạo lại. API tính phí theo token và hình.'}</span></div></section><section className="demo-card"><span className="eyebrow">THỬ TRƯỚC KHI KẾT NỐI</span><h3>Làm quen với studio</h3><p>Thử chọn tin, sửa bài và copy nội dung bằng các bản tin giả định.</p><button className="button button-secondary full-width" type="button" onClick={onDemo} disabled={demoBusy}>{demoBusy ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />} Thêm dữ liệu minh họa</button></section><div className="settings-local-note"><Home size={17} /><p>Dữ liệu và hình ảnh được lưu trên máy chủ đang chạy ứng dụng. Giữ thư mục dữ liệu khi chuyển sang hosting.</p></div></aside></div>;
}

function Toggle({ label, description, checked, onChange }) {
  return <label className="toggle-row"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span className="toggle-track" aria-hidden="true"><span /></span></label>;
}

export default App;
