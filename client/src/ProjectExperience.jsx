import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from 'lucide-react';

// Visual concepts until approved project articles are available. These are not listings.
export const SPACE_CONCEPTS = [
  { id: 'urban', category: 'URBAN LIVING', title: 'Sống giữa nhịp đô thị.', description: 'Khám phá cách kiến trúc, kết nối và tiện ích định hình trải nghiệm sống trong thành phố.', image: '/images/architecture.webp', tags: ['Đô thị', 'Kết nối', 'Tiện ích'], concept: true },
  { id: 'private', category: 'PRIVATE RESIDENCE', title: 'Một khoảng riêng để trở về.', description: 'Góc nhìn về nhà ở thấp tầng: không gian riêng, ánh sáng tự nhiên và sự gắn kết với ngoài trời.', image: '/images/garden-residence.webp', tags: ['Nhà thấp tầng', 'Không gian riêng', 'Ánh sáng'], concept: true },
  { id: 'retreat', category: 'THE ART OF RETREAT', title: 'Chậm lại. Sống nhiều hơn.', description: 'Tìm hiểu cảm hứng kiến trúc nghỉ dưỡng, nơi khoảng mở và mặt nước tạo nên nhịp sống thư thái.', image: '/images/retreat-residence.webp', tags: ['Nghỉ dưỡng', 'Khoảng mở', 'Trải nghiệm'], concept: true },
];

export function createProjectSlides(posts, customProjects = null) {
  if (Array.isArray(customProjects) && customProjects.length > 0) {
    return customProjects.map(proj => ({
      id: proj.id,
      category: proj.category || 'GÓC NHÌN DỰ ÁN',
      title: proj.title,
      description: proj.description,
      image: proj.image || '/images/architecture.webp',
      tags: Array.isArray(proj.tags) ? proj.tags : [],
      concept: proj.concept !== false,
      linkUrl: proj.linkUrl || '#du-an',
    }));
  }
  const projects = (posts || []).filter(post => post.contentMode === 'project');
  if (!projects.length) return SPACE_CONCEPTS;
  return projects.slice(0, 8).map(post => ({ id: post.id, category: 'GÓC NHÌN DỰ ÁN', title: post.title, description: post.content.replace(/\n\nNguồn:[\s\S]*$/u, '').slice(0, 190), image: post.imageUrl || '/images/architecture.webp', tags: [post.topic, post.source].filter(Boolean), post, concept: false, imageKind: post.imageKind }));
}

export function ProjectCarousel({ slides, selected, onSelect, onOpen, reducedMotion }) {
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState !== 'hidden');
  const root = useRef(null), touch = useRef(null);
  const index = Math.min(selected, slides.length - 1), slide = slides[index];
  const running = playing && !hovered && visible && tabVisible && !reducedMotion && slides.length > 1;
  const select = next => onSelect((next + slides.length) % slides.length);
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => onSelect((index + 1) % slides.length), 6500);
    return () => clearTimeout(timer);
  }, [running, index, slides.length, onSelect]);
  useEffect(() => {
    const changed = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', changed);
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .1 }) : null;
    if (root.current) observer?.observe(root.current);
    return () => { observer?.disconnect(); document.removeEventListener('visibilitychange', changed); };
  }, []);
  return <section ref={root} className="vr-hero-visual vr-carousel" aria-label="Khám phá không gian và dự án" aria-roledescription="carousel"
    data-running={running} onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}
    onFocusCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPlaying(false); }}
    onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); setPlaying(false); select(index + (event.key === 'ArrowRight' ? 1 : -1)); } }}
    onTouchStart={event => { const point = event.touches[0]; touch.current = { x: point.clientX, y: point.clientY }; }}
    onTouchCancel={() => { touch.current = null; }}
    onTouchEnd={event => { if (!touch.current) return; const point = event.changedTouches[0]; const dx = point.clientX - touch.current.x, dy = point.clientY - touch.current.y; touch.current = null; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) { setPlaying(false); select(index + (dx < 0 ? 1 : -1)); } }}>
    <div className="vr-slides" aria-hidden="true">{slides.map((item, i) => <div className={`vr-slide ${i === index ? 'is-active' : ''}`} key={item.id}><img src={item.image} alt="" fetchPriority={i === 0 ? 'high' : 'auto'} loading={i < 2 ? 'eager' : 'lazy'} onError={event => { if (!event.currentTarget.src.endsWith('/images/architecture.webp')) event.currentTarget.src = '/images/architecture.webp'; }} /></div>)}</div>
    <div className="vr-carousel-top"><span>{slide.concept ? 'SPACE COLLECTION · MINH HỌA' : 'VINCENTE PROJECT JOURNAL'}</span><span className="vr-carousel-count">{String(index + 1).padStart(2, '0')}<i> / {String(slides.length).padStart(2, '0')}</i></span></div>
    <div className="vr-carousel-caption" aria-live={running ? 'off' : 'polite'} aria-atomic="true"><div className="vr-caption-inner" key={slide.id}><p>{slide.category}</p><h2>{slide.title}</h2><p className="vr-carousel-description">{slide.description}</p><div className="vr-carousel-tags">{slide.tags.map(tag => <span key={tag}>{tag}</span>)}</div>{slide.post ? <button className="vr-carousel-link" onClick={() => onOpen(slide.post)}>Đọc giới thiệu dự án <ArrowUpRight size={16} /></button> : <a className="vr-carousel-link" href="#du-an">Khám phá bộ sưu tập <ArrowUpRight size={16} /></a>}</div></div>
    <div className="vr-carousel-bottom"><div className="vr-carousel-dots" role="group" aria-label="Chọn ảnh">{slides.map((item, i) => <button key={item.id} className={i === index ? 'is-active' : ''} onClick={() => { setPlaying(false); select(i); }} aria-label={`Xem ${item.title}`} aria-pressed={i === index}><span key={`${item.id}-${index}-${running}`} /></button>)}</div><div className="vr-carousel-controls"><button onClick={() => { setPlaying(false); select(index - 1); }} aria-label="Dự án trước" disabled={slides.length < 2}><ArrowLeft size={17} /></button><button onClick={() => setPlaying(!playing)} aria-label={playing ? 'Tạm dừng tự chuyển ảnh' : 'Bật tự chuyển ảnh'} aria-pressed={playing} disabled={reducedMotion || slides.length < 2}>{playing && !reducedMotion ? <Pause size={14} /> : <Play size={14} />}</button><button onClick={() => { setPlaying(false); select(index + 1); }} aria-label="Dự án tiếp theo" disabled={slides.length < 2}><ArrowRight size={17} /></button></div></div>
    <span className="vr-carousel-disclosure">{slide.concept ? 'Ý tưởng không gian · Ảnh minh họa, không phải dự án chào bán' : 'Dự án chọn lọc · Nội dung đã được biên tập'}</span>
  </section>;
}

export function ProjectCollection({ slides, selected, onSelect, onOpen }) {
  const rail = useRef(null), drag = useRef(null), suppressClick = useRef(false);
  function scroll(direction) { rail.current?.scrollBy({ left: direction * rail.current.clientWidth * .8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }
  return <section className="vr-projects vr-container" id="du-an" aria-labelledby="vr-projects-title"><div className="vr-section-heading vr-reveal"><div><p className="vr-eyebrow">THE SPACE COLLECTION</p><h2 id="vr-projects-title">Nhiều không gian.<br />Nhiều cách <em>sống.</em></h2></div><div className="vr-project-intro"><p>{slides[0]?.concept ? 'Khám phá các cảm hứng kiến trúc và không gian sống được chọn lọc.' : 'Khám phá các dự án đã được chọn lọc và biên tập.'}</p><div className="vr-rail-controls"><button aria-label="Cuộn bộ sưu tập sang trái" onClick={() => scroll(-1)}><ArrowLeft size={18} /></button><button aria-label="Cuộn bộ sưu tập sang phải" onClick={() => scroll(1)}><ArrowRight size={18} /></button></div></div></div><div className="vr-project-rail" ref={rail} tabIndex={0}
      onPointerDown={event => { if (event.pointerType === 'mouse' && event.button === 0) { suppressClick.current = false; drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft }; } }}
      onPointerMove={event => { if (!drag.current || !event.buttons) return; const distance = event.clientX - drag.current.x; if (Math.abs(distance) > 7 || suppressClick.current) { suppressClick.current = true; event.currentTarget.classList.add('is-dragging'); event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.scrollLeft = drag.current.left - distance; event.preventDefault(); } }}
      onPointerUp={event => { drag.current = null; event.currentTarget.classList.remove('is-dragging'); setTimeout(() => { suppressClick.current = false; }, 0); }} onPointerCancel={event => { drag.current = null; event.currentTarget.classList.remove('is-dragging'); suppressClick.current = false; }}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }} aria-label="Bộ sưu tập không gian, cuộn ngang để khám phá">{slides.map((slide, i) => <article className={`vr-project-card vr-reveal ${selected === i ? 'is-selected' : ''}`} key={slide.id}><button className="vr-project-image" onClick={() => { onSelect(i); if (slide.post) onOpen(slide.post); else document.querySelector('.vr-carousel')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' }); }} aria-label={`Khám phá ${slide.title}`}><img src={slide.image} alt={`Minh họa: ${slide.title}`} loading="lazy" draggable={false} onError={event => { if (!event.currentTarget.src.endsWith('/images/architecture.webp')) event.currentTarget.src = '/images/architecture.webp'; }} /><span>{String(i + 1).padStart(2, '0')} / {slide.concept ? 'CẢM HỨNG KHÔNG GIAN' : 'DỰ ÁN'}</span><i><ArrowUpRight size={22} /></i></button><div className="vr-project-copy"><p>{slide.category}</p><h3>{slide.title}</h3><p>{slide.description}</p><div>{slide.tags.map(tag => <span key={tag}>{tag}</span>)}</div></div></article>)}</div><div className="vr-project-foot"><span>KÉO ĐỂ KHÁM PHÁ <ArrowRight size={14} /></span><span>{slides[0]?.concept ? 'Dự án thực tế sẽ hiển thị khi có bài giới thiệu được duyệt.' : `${slides.length} dự án & không gian`}</span></div></section>;
}
