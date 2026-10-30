import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDown, ArrowRight, Search, X, Menu, LockKeyhole } from 'lucide-react';
const App = lazy(() => import('./App.jsx'));
import NewsPager from './NewsPager.jsx';
import { ProjectCarousel, ProjectCollection, createProjectSlides } from './ProjectExperience.jsx';
import { useReducedMotion, useSiteMotion } from './useSiteMotion.js';

const FACEBOOK = 'https://www.facebook.com/vuong.nguyen.8694';
const date = value => !value || !Number.isFinite(Date.parse(value)) ? 'Chưa có ngày nguồn' : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
const topics = ['Tất cả', 'Thị trường', 'Quy hoạch', 'Nhà ở', 'Chính sách'];
function Logo() { return <a className="vr-logo" href="/" aria-label="Vincente Realty — Trang chủ"><span className="vr-monogram">V<span>↗</span></span><span>VINCENTE<small>R E A L T Y</small></span></a>; }

export function AdminAccess() {
  const [ready, setReady] = useState(false), [authenticated, setAuthenticated] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/auth/session').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(s => setAuthenticated(s.authenticated)).catch(() => setError('Chưa kết nối được máy chủ. Hãy kiểm tra npm run dev.')).finally(() => setReady(true)); }, []);
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try { const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(data)) }); const result = await response.json(); if (!response.ok) throw Error(result.error); setAuthenticated(true); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (!ready) return <div className="vr-login"><p>Đang kiểm tra phiên đăng nhập…</p></div>;
  if (authenticated) return <><div className="vr-admin-bar"><a href="/">↖ Vincente Realty · Xem trang công khai</a><button onClick={async () => { const r = await fetch('/api/auth/logout', { method: 'POST' }); if (r.ok) setAuthenticated(false); }}>Đăng xuất</button></div><Suspense fallback={<p className="vr-admin-loading">Đang mở Content Studio…</p>}><App /></Suspense></>;
  return <main className="vr-login"><div className="vr-login-card"><Logo /><p className="vr-eyebrow"><LockKeyhole size={14} /> PRIVATE STUDIO</p><h1>Không gian<br />quản trị.</h1><p>Đăng nhập để chuẩn bị và duyệt nội dung cho Vincente Realty.</p><form onSubmit={login}><label>Tên đăng nhập<input name="username" autoComplete="username" required /></label><label>Mật khẩu<input name="password" type="password" autoComplete="current-password" required /></label>{error && <p role="alert" className="vr-error">{error}</p>}<button className="vr-button" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Vào Content Studio'}<ArrowUpRight size={18} /></button></form><a href="/">← Về trang chủ</a></div></main>;
}

export default function PublicSite() {
  const [posts, setPosts] = useState([]), [status, setStatus] = useState('loading'), [topic, setTopic] = useState('Tất cả'), [search, setSearch] = useState(''), [menu, setMenu] = useState(false);
  const siteRoot = useRef(null);
  const reducedMotion = useReducedMotion();
  const [selectedProject, setSelectedProject] = useState(0);
  const projectSlides = useMemo(() => createProjectSlides(posts), [posts]);
  const projectIds = projectSlides.map(slide => slide.id).join(',');
  useEffect(() => { setSelectedProject(0); }, [projectIds]);

  const initialAnchorHandled = useRef(false);
  useSiteMotion(siteRoot, reducedMotion, `${status}:${posts.map(post => post.id).join(',')}`);
  const [articleId, setArticleId] = useState(() => new URLSearchParams(location.search).get('bai'));
  useEffect(() => { let active = true; async function load() { try { const r = await fetch('/api/public/posts'); if (!r.ok) throw Error(); const data = await r.json(); if (active) { setPosts(data.posts); setStatus('ready'); } } catch { if (active) setStatus('error'); } } load(); const timer = setInterval(load, 60000); return () => { active = false; clearInterval(timer); }; }, []);
  useEffect(() => { const pop = () => setArticleId(new URLSearchParams(location.search).get('bai')); window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop); }, []);
  useEffect(() => {
    if (status === 'loading' || initialAnchorHandled.current) return;
    const id = location.hash.slice(1);
    if (!id) { initialAnchorHandled.current = true; return; }
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
      initialAnchorHandled.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [status]);
  const article = posts.find(p => p.id === articleId);
  function open(post) { const url = new URL(location.href); if (post) url.searchParams.set('bai', post.id); else url.searchParams.delete('bai'); history.pushState(null, '', url); setArticleId(post?.id || null); }
  useEffect(() => { if (!articleId) return; const prev = document.activeElement; const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; const dialog = document.querySelector('.vr-dialog'); dialog?.focus(); const key = e => { if (e.key === 'Escape') open(null); if (e.key === 'Tab' && dialog) { const els = [...dialog.querySelectorAll('button,a[href]')]; if (e.shiftKey && (document.activeElement === els[0] || document.activeElement === dialog)) { e.preventDefault(); els.at(-1)?.focus(); } else if (!e.shiftKey && document.activeElement === els.at(-1)) { e.preventDefault(); els[0]?.focus(); } } }; document.addEventListener('keydown', key); return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); prev?.focus(); }; }, [articleId, status]);
  function navigateSection(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    const target = link && document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();
    const url = new URL(location.href);
    url.hash = link.getAttribute('href');
    if (url.href !== location.href) history.pushState(null, '', url);
    setMenu(false);
    target.classList.add('is-visible');
    target.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
  }
  const shown = posts.filter(p => (topic === 'Tất cả' || p.topic === topic) && `${p.title} ${p.content}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  return <div className="vr-site" ref={siteRoot} onClick={navigateSection}><div className="vr-reading-progress" aria-hidden="true" /><header className="vr-header"><Logo /><nav className={menu ? 'vr-nav is-open' : 'vr-nav'} aria-label="Điều hướng chính"><a href="#du-an" onClick={() => setMenu(false)}>Không gian & dự án</a><a href="#ban-tin" onClick={() => setMenu(false)}>Bản tin thị trường</a><a href="#goc-nhin" onClick={() => setMenu(false)}>Góc nhìn Vincente</a><a href="#ket-noi" onClick={() => setMenu(false)}>Về chúng tôi</a></nav><a className="vr-contact" href={FACEBOOK} target="_blank" rel="noreferrer">Kết nối với Vượng <ArrowUpRight size={16} /></a><button className="vr-menu" aria-label="Mở điều hướng" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button></header>
    <main><section className="vr-hero" aria-labelledby="vr-hero-title">
      <div className="vr-hero-content">
        <p className="vr-eyebrow"><span /> GÓC NHÌN BẤT ĐỘNG SẢN · VƯỢNG NGUYỄN</p>
        <h1 id="vr-hero-title">Hiểu thị trường.<br />Chọn <em>giá trị.</em></h1>
        <p className="vr-hero-description">Đọc những chuyển động hôm nay.<br />Nhìn rõ hơn những lựa chọn ngày mai.</p>
        <p className="vr-hero-intro">Tin tức chọn lọc, góc nhìn quy hoạch và câu chuyện nhà ở. Cùng Vincente Realty đặt thông tin vào đúng bối cảnh trước mỗi quyết định.</p>
        <div className="vr-hero-actions"><a className="vr-button" href="#ban-tin">Khám phá bản tin <ArrowUpRight size={20} /></a><a className="vr-text-link" href="#goc-nhin">Góc nhìn Vincente <ArrowRight size={17} /></a></div>
        <div className="vr-hero-signature"><span className="vr-signature-mark">V.</span><div><strong>Vượng Nguyễn</strong><span>Người kết nối thông tin & bất động sản</span></div><a href={FACEBOOK} target="_blank" rel="noreferrer" aria-label="Kết nối với Vượng Nguyễn qua Facebook"><ArrowUpRight size={20} /></a></div>
      </div>
      <ProjectCarousel slides={projectSlides} selected={selectedProject} onSelect={setSelectedProject} onOpen={open} reducedMotion={reducedMotion} />
    </section>
    <div className="vr-strip"><span className="vr-strip-label"><i /> VINCENTE JOURNAL</span><span>Thông tin có chọn lọc</span><span>Góc nhìn có cơ sở</span><span>Kết nối giá trị bền vững</span><a href="#ban-tin">Đọc bản tin <ArrowDown size={16} /></a></div>
    <ProjectCollection slides={projectSlides} selected={selectedProject} onSelect={setSelectedProject} onOpen={open} />
    <section className="vr-explore vr-container" aria-labelledby="vr-explore-title"><div className="vr-explore-heading vr-reveal"><p className="vr-eyebrow">ĐỌC THEO MỐI QUAN TÂM</p><h2 id="vr-explore-title">Bạn đang tìm hiểu điều gì?</h2></div><div className="vr-explore-grid">{[
      ['Quy hoạch', '01', 'Đọc hướng phát triển.', 'Hạ tầng, không gian đô thị và những thay đổi cần theo dõi.'],
      ['Nhà ở', '02', 'Tìm giá trị an cư.', 'Nguồn cung, nhu cầu ở thực và bối cảnh lựa chọn tổ ấm.'],
      ['Thị trường', '03', 'Hiểu nhịp thị trường.', 'Chuyển động bất động sản và các yếu tố đứng sau thông tin.'],
    ].map(([name, number, title, description]) => <a key={name} className="vr-explore-card vr-reveal" href="#ban-tin" onClick={() => { setTopic(name); setSearch(''); }}><div><span>{number} / {name}</span><ArrowUpRight size={23} /></div><h3>{title}</h3><p>{description}</p><span className="vr-explore-link">Khám phá chuyên mục <ArrowRight size={16} /></span></a>)}</div></section>
    <section className="vr-perspective" id="goc-nhin"><div className="vr-container vr-perspective-grid vr-reveal"><div><p className="vr-eyebrow">02 / THE PERSPECTIVE</p><h2>Giá trị bắt đầu<br />từ một góc nhìn<br /><em>rõ ràng.</em></h2></div><div><span className="vr-asterisk">✳</span><p className="vr-big-copy">Giữa rất nhiều thông tin,<br />điều bạn cần là sự thấu hiểu.</p><p>Vincente Realty kết nối tin tức thị trường với góc nhìn phân tích của Vượng Nguyễn. Từ chuyển động quy hoạch đến nhu cầu nhà ở, mỗi bài viết giúp bạn đặt thêm những câu hỏi đúng trước khi ra quyết định.</p><div className="vr-principles"><span>01 <strong>Đọc có nguồn</strong></span><span>02 <strong>Hiểu bối cảnh</strong></span><span>03 <strong>Nhìn dài hạn</strong></span></div></div></div></section>
    <section className="vr-connect vr-container vr-reveal" id="ket-noi"><p className="vr-eyebrow">03 / LET’S CONNECT</p><div><h2>Mỗi nhu cầu.<br />Một cuộc <em>trò chuyện.</em></h2><div><p>Bạn đang tìm nơi an cư, tìm hiểu một khu vực<br />hay muốn trao đổi về thị trường?</p><a className="vr-button" href={FACEBOOK} target="_blank" rel="noreferrer">Trò chuyện với Vượng Nguyễn <ArrowUpRight size={18} /></a><small>Kết nối trực tiếp qua Facebook</small></div></div></section>
    <section className="vr-news vr-container" id="ban-tin"><div className="vr-section-heading vr-reveal"><div><p className="vr-eyebrow">04 / THE JOURNAL</p><h2>Nhịp đập thị trường<span>.</span></h2></div><p>Tin nguồn được cập nhật từ kho bản tin.<br />Bài biên tập và nguồn báo được ghi rõ.</p></div><div className="vr-tools"><div className="vr-tabs" role="group" aria-label="Lọc chuyên mục">{topics.map(t => <button key={t} aria-pressed={topic === t} className={topic === t ? 'active' : ''} onClick={() => setTopic(t)}>{t}</button>)}</div><label className="vr-search"><Search size={17} /><input placeholder="Tìm trong bản tin…" aria-label="Tìm bài viết" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
      {status === 'loading' ? <div className="vr-empty" role="status">Đang cập nhật bản tin…</div> : status === 'error' ? <div className="vr-empty" role="alert">Chưa tải được bản tin. <button onClick={() => location.reload()}>Thử lại ↗</button></div> : !shown.length ? <div className="vr-empty"><span className="vr-empty-symbol" aria-hidden="true">V↗</span><span>VINCENTE REALTY JOURNAL</span><h3>{posts.length ? 'Chưa tìm thấy bài phù hợp.' : 'Góc nhìn mới đang được chuẩn bị.'}</h3><p>{posts.length ? 'Thử từ khóa khác hoặc chọn một chuyên mục mới.' : 'Tin tức thị trường, quy hoạch và nhà ở sẽ được cập nhật tại đây sau khi biên tập.'}</p>{posts.length > 0 ? <button onClick={() => { setSearch(''); setTopic('Tất cả'); }}>Xem tất cả bản tin →</button> : <a className="vr-read" href={FACEBOOK} target="_blank" rel="noreferrer">Trao đổi với Vượng Nguyễn <ArrowUpRight size={17} /></a>}</div> : <NewsPager posts={shown} onOpen={open} resetKey={`${topic}:${search}`} />}
      <div className="vr-news-foot"><span>VINCENTE REALTY JOURNAL · TIN NGUỒN & BÀI BIÊN TẬP</span><span>{posts.length} tin · Tự cập nhật mỗi phút</span></div></section>
    </main>
    <footer className="vr-footer"><div className="vr-container"><div className="vr-footer-top"><Logo /><p>Thông tin chọn lọc.<br />Tầm nhìn rộng mở.</p><a href="#ban-tin">Về đầu bản tin ↑</a></div><div className="vr-footer-bottom"><span>© {new Date().getFullYear()} Vincente Realty</span><span>Nội dung tham khảo, không phải cam kết lợi nhuận.</span><a href="/admin">Quản trị <ArrowUpRight size={13} /></a></div><div className="vr-wordmark" aria-hidden="true">VINCENTE.</div></div></footer>
    {articleId && <div className="vr-modal" onClick={e => { if (e.target === e.currentTarget) open(null); }}><section className="vr-dialog" role="dialog" aria-modal="true" aria-labelledby="vr-article-title" tabIndex={-1}><button className="vr-close" aria-label="Đóng bài viết" onClick={() => open(null)}><X /></button>{article ? <><p className="vr-eyebrow">{article.topic} / {date(article.publishedAt)}</p><h2 id="vr-article-title">{article.title}</h2><p>{article.kind === 'source' ? `Tin nguồn: ${article.source} · Tóm tắt RSS` : 'Biên tập: Vượng Nguyễn · Vincente Realty'}</p>{article.kind === 'source' && <aside className="vr-source-note">Phần dưới là tóm tắt do nguồn báo cung cấp. Đọc bài gốc để xem đầy đủ nội dung và bối cảnh.</aside>}{article.imageUrl && <figure><img src={article.imageUrl} alt={`Minh họa ${article.title}`} /><figcaption>{article.imageKind === 'ai' ? 'Ảnh AI minh họa' : 'Ảnh minh họa'}</figcaption></figure>}<div className="vr-article-body">{article.content}</div><a className="vr-read" href={article.sourceUrl} target="_blank" rel="noreferrer">Đọc nguồn: {article.source} <ArrowUpRight size={16} /></a></> : <p id="vr-article-title">{status === 'loading' ? 'Đang tải bài viết…' : 'Bài viết chưa được xuất bản hoặc đã được gỡ.'}</p>}</section></div>}
  </div>;
}
