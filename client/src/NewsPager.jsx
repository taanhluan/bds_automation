import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';

const PAGE_SIZE = 4;
const date = value => !value || !Number.isFinite(Date.parse(value)) ? 'Chưa có ngày nguồn' : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));

export default function NewsPager({ posts, onOpen, resetKey }) {
  const [page, setPage] = useState(0), [direction, setDirection] = useState(1);
  const rail = useRef(null), touch = useRef(null), wheelLock = useRef(0);
  const pages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const shown = posts.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  useEffect(() => { setPage(0); rail.current?.scrollTo({ left: 0, behavior: 'instant' }); }, [resetKey]);
  function go(next) {
    if (next < 0 || next >= pages || next === current) return;
    setDirection(next > current ? 1 : -1); setPage(next);
    rail.current?.scrollTo({ left: 0, behavior: 'instant' });
  }
  const numbers = [...new Set([0, current - 1, current, current + 1, pages - 1].filter(n => n >= 0 && n < pages))].sort((a, b) => a - b);
  return <div className="vr-news-pager">
    <div className="vr-news-page-heading"><span>{posts.length} tin tức</span><span id="vr-page-status" role="status" aria-live="polite">{current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, posts.length)} / {posts.length}</span></div>
    <div className="vr-news-viewport" ref={rail} tabIndex={0} aria-label="Tin tức, cuộn ngang hoặc dùng phím mũi tên để xem tiếp"
      onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); go(current + (event.key === 'ArrowRight' ? 1 : -1)); } }}
      onWheel={event => { const node = event.currentTarget; if (Math.abs(event.deltaX) < Math.abs(event.deltaY) || Math.abs(event.deltaX) < 25 || node.scrollWidth > node.clientWidth + 2 || Date.now() < wheelLock.current) return; wheelLock.current = Date.now() + 650; go(current + (event.deltaX > 0 ? 1 : -1)); }}
      onTouchStart={event => { const p = event.touches[0], node = event.currentTarget; touch.current = { x: p.clientX, y: p.clientY, left: node.scrollLeft, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 4 }; }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={event => { if (!touch.current) return; const p = event.changedTouches[0], start = touch.current; touch.current = null; const dx = p.clientX - start.x, dy = p.clientY - start.y; if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.4 && (dx < 0 ? start.end : start.left <= 4)) go(current + (dx < 0 ? 1 : -1)); }}>
      <div className="vr-news-page" key={`${resetKey}-${current}`} style={{ '--page-direction': direction }}>
        {shown.map(post => <article className="vr-news-tile" key={post.id}>
          <button className={`vr-news-thumbnail ${post.imageUrl ? '' : 'vr-news-type-cover'}`} onClick={() => onOpen(post)} aria-label={`Đọc ${post.title}`}>
            {post.imageUrl ? <img src={post.imageUrl} alt={`Minh họa ${post.title}`} loading="lazy" /> : <><span className="vr-news-cover-mark">V / R</span><strong>{post.topic}</strong><span className="vr-news-cover-line" /></>}
            <span className="vr-news-thumbnail-label">{post.imageUrl ? (post.imageKind === 'ai' ? 'Ảnh AI minh họa' : 'Ảnh minh họa') : post.source}</span><i><ArrowUpRight size={18} /></i>
          </button>
          <div className="vr-news-tile-body"><div className="vr-news-tile-meta"><span>{post.topic}</span><time dateTime={post.publishedAt || undefined}>{date(post.publishedAt)}</time></div>
            <button className="vr-news-tile-title" onClick={() => onOpen(post)}><h3>{post.title}</h3></button>
            <p>{post.content}</p><button className="vr-news-tile-read" onClick={() => onOpen(post)}>{post.kind === 'source' ? 'Tóm tắt & nguồn' : 'Đọc toàn bài'}<ArrowUpRight size={16} /></button>
          </div>
        </article>)}
      </div>
    </div>
    <nav className="vr-news-pagination" aria-label="Phân trang tin tức"><button className="vr-news-page-arrow" disabled={current === 0} onClick={() => go(current - 1)} aria-label="Trang tin trước"><ArrowLeft size={18} /><span>Trước</span></button><div className="vr-news-page-numbers">{numbers.map((number, i) => <span key={number}>{i > 0 && number - numbers[i - 1] > 1 && <span className="vr-news-page-gap" aria-hidden="true">…</span>}<button aria-label={`Trang ${number + 1}`} aria-current={current === number ? 'page' : undefined} onClick={() => go(number)}>{String(number + 1).padStart(2, '0')}</button></span>)}</div><button className="vr-news-page-arrow" disabled={current === pages - 1} onClick={() => go(current + 1)} aria-label="Trang tin tiếp"><span>Sau</span><ArrowRight size={18} /></button></nav>
    <p className="vr-news-swipe-hint">4 bài mỗi trang · Kéo ngang để khám phá</p>
  </div>;
}
