import React, { useState, useEffect, useRef } from 'react';
import {
  Globe, LayoutTemplate, Sparkles, Check, RefreshCw, AlertCircle,
  ExternalLink, MessageSquare, ShieldCheck, Home, Phone, Info, Loader2, ArrowUpRight,
  Plus, Trash2, ArrowUp, ArrowDown, ImagePlus, Eye, Layers
} from 'lucide-react';

const DEFAULT_PROJECTS = [
  {
    id: 'urban',
    category: 'URBAN LIVING',
    title: 'Sống giữa nhịp đô thị.',
    description: 'Khám phá cách kiến trúc, kết nối và tiện ích định hình trải nghiệm sống trong thành phố.',
    image: '/images/architecture.webp',
    tags: ['Đô thị', 'Kết nối', 'Tiện ích'],
    concept: true,
    linkUrl: '#du-an',
  },
  {
    id: 'private',
    category: 'PRIVATE RESIDENCE',
    title: 'Một khoảng riêng để trở về.',
    description: 'Góc nhìn về nhà ở thấp tầng: không gian riêng, ánh sáng tự nhiên và sự gắn kết với ngoài trời.',
    image: '/images/garden-residence.webp',
    tags: ['Nhà thấp tầng', 'Không gian riêng', 'Ánh sáng'],
    concept: true,
    linkUrl: '#du-an',
  },
  {
    id: 'retreat',
    category: 'THE ART OF RETREAT',
    title: 'Chậm lại. Sống nhiều hơn.',
    description: 'Tìm hiểu cảm hứng kiến trúc nghỉ dưỡng, nơi khoảng mở và mặt nước tạo nên nhịp sống thư thái.',
    image: '/images/retreat-residence.webp',
    tags: ['Nghỉ dưỡng', 'Khoảng mở', 'Trải nghiệm'],
    concept: true,
    linkUrl: '#du-an',
  },
];

export default function LandingCmsPanel({ landing, onSave, onReset }) {
  const [form, setForm] = useState(landing || {});
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRefs = useRef({});

  useEffect(() => {
    if (landing) {
      setForm(prev => ({
        ...landing,
        projects: Array.isArray(landing.projects) && landing.projects.length > 0
          ? landing.projects
          : (prev.projects || DEFAULT_PROJECTS),
      }));
    }
  }, [landing]);

  const updateSection = (section, field, value) => {
    setForm(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [field]: value,
      },
    }));
  };

  // PROJECT CRUD HANDLERS
  const projects = form.projects || DEFAULT_PROJECTS;

  const updateProject = (index, field, value) => {
    setForm(prev => {
      const nextProjects = [...(prev.projects || DEFAULT_PROJECTS)];
      nextProjects[index] = {
        ...nextProjects[index],
        [field]: value,
      };
      return { ...prev, projects: nextProjects };
    });
  };

  const addProject = () => {
    const newProject = {
      id: `proj-${Date.now()}`,
      category: 'GÓC NHÌN DỰ ÁN',
      title: 'Dự án không gian mới',
      description: 'Mô tả ngắn gọn về kiến trúc, vị trí và trải nghiệm sống của dự án.',
      image: '/images/architecture.webp',
      tags: ['Kiến trúc', 'Không gian', 'Tiện ích'],
      concept: true,
      linkUrl: '#du-an',
    };
    setForm(prev => ({
      ...prev,
      projects: [...(prev.projects || DEFAULT_PROJECTS), newProject],
    }));
  };

  const deleteProject = (index) => {
    if (projects.length <= 1) {
      setError('Cần giữ lại ít nhất 1 dự án trên trang chủ.');
      return;
    }
    setForm(prev => {
      const nextProjects = [...(prev.projects || DEFAULT_PROJECTS)];
      nextProjects.splice(index, 1);
      return { ...prev, projects: nextProjects };
    });
  };

  const moveProject = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= projects.length) return;
    setForm(prev => {
      const nextProjects = [...(prev.projects || DEFAULT_PROJECTS)];
      const temp = nextProjects[index];
      nextProjects[index] = nextProjects[targetIndex];
      nextProjects[targetIndex] = temp;
      return { ...prev, projects: nextProjects };
    });
  };

  const resetProjectsOnly = () => {
    setForm(prev => ({
      ...prev,
      projects: DEFAULT_PROJECTS,
    }));
  };

  // UPLOAD & AUTO SCALE/RESIZE
  async function handleUploadPhoto(index, event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Chỉ hỗ trợ file ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError('File ảnh không được vượt quá 12 MB.');
      return;
    }

    setUploadingIndex(index);
    setError('');
    try {
      const response = await fetch('/api/landing/upload', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload ảnh thất bại.');

      // Cập nhật URL ảnh đã được scale/resize chuẩn 1600x1067 px
      updateProject(index, 'image', data.imageUrl);
    } catch (err) {
      setError(err.message || 'Không thể upload ảnh.');
    } finally {
      setUploadingIndex(null);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || 'Lưu cấu hình thất bại.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    setError('');
    try {
      await onReset();
      setConfirmReset(false);
    } catch (err) {
      setError(err.message || 'Khôi phục mặc định thất bại.');
    } finally {
      setResetting(false);
    }
  }

  const hero = form.hero || {};
  const strip = form.strip || {};
  const perspective = form.perspective || {};
  const connect = form.connect || {};
  const footer = form.footer || {};

  return (
    <div className="settings-layout">
      <form className="settings-form" onSubmit={handleSubmit}>
        {/* HERO SECTION */}
        <section className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-section-icon"><LayoutTemplate size={19} /></span>
            <div>
              <h2>Hero &amp; Định vị thương hiệu</h2>
              <p>Phần đầu trang tiếp đón khách hàng của Vincente Realty.</p>
            </div>
          </div>

          <label className="form-label">
            Dòng Eyebrow trên đầu
            <input
              type="text"
              maxLength={120}
              value={hero.eyebrow || ''}
              onChange={e => updateSection('hero', 'eyebrow', e.target.value)}
              placeholder="GÓC NHÌN BẤT ĐỘNG SẢN · VƯỢNG NGUYỄN"
            />
          </label>

          <div className="settings-two-col">
            <label className="form-label">
              Tiêu đề chính
              <input
                type="text"
                maxLength={100}
                required
                value={hero.titleMain || ''}
                onChange={e => updateSection('hero', 'titleMain', e.target.value)}
                placeholder="Hiểu thị trường."
              />
            </label>
            <label className="form-label">
              Từ in nghiêng điểm nhấn
              <input
                type="text"
                maxLength={60}
                required
                value={hero.titleAccent || ''}
                onChange={e => updateSection('hero', 'titleAccent', e.target.value)}
                placeholder="giá trị."
              />
            </label>
          </div>

          <label className="form-label">
            Mô tả 2 dòng (ngắt dòng bằng Enter)
            <textarea
              rows="2"
              maxLength={300}
              value={hero.description || ''}
              onChange={e => updateSection('hero', 'description', e.target.value)}
              placeholder="Đọc những chuyển động hôm nay.&#10;Nhìn rõ hơn những lựa chọn ngày mai."
            />
          </label>

          <label className="form-label">
            Đoạn giới thiệu ngắn
            <textarea
              rows="3"
              maxLength={600}
              value={hero.intro || ''}
              onChange={e => updateSection('hero', 'intro', e.target.value)}
              placeholder="Tin tức chọn lọc, góc nhìn quy hoạch và câu chuyện nhà ở..."
            />
          </label>

          <div className="settings-two-col">
            <label className="form-label">
              Họ tên chuyên gia
              <input
                type="text"
                maxLength={80}
                value={hero.authorName || ''}
                onChange={e => updateSection('hero', 'authorName', e.target.value)}
                placeholder="Vượng Nguyễn"
              />
            </label>
            <label className="form-label">
              Chức danh / Định vị
              <input
                type="text"
                maxLength={120}
                value={hero.authorRole || ''}
                onChange={e => updateSection('hero', 'authorRole', e.target.value)}
                placeholder="Người kết nối thông tin & bất động sản"
              />
            </label>
          </div>

          <label className="form-label">
            Link Facebook cá nhân (Hero)
            <input
              type="url"
              value={hero.facebookUrl || ''}
              onChange={e => updateSection('hero', 'facebookUrl', e.target.value)}
              placeholder="https://www.facebook.com/vuong.nguyen.8694"
            />
          </label>
        </section>

        {/* QUẢN LÝ DỰ ÁN & BANNER CAROUSEL (CRUD ĐẦY ĐỦ) */}
        <section className="settings-card" style={{ border: '2px solid #2f5844' }}>
          <div className="settings-card-heading">
            <span className="settings-section-icon" style={{ background: '#2f5844', color: '#fff' }}><Layers size={19} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Quản lý Banner &amp; Dự án (Carousel &amp; Collection)</h2>
                <span style={{ fontSize: '12px', background: '#e5ebe4', color: '#2f5844', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                  {projects.length} slide
                </span>
              </div>
              <p>Quản lý toàn bộ danh sách slide hiển thị ở góc trên bên phải Hero và Bộ sưu tập The Space Collection. Tải ảnh lên tự động scale/resize chuẩn 1600×1067 px.</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
            {projects.map((proj, idx) => (
              <div
                key={proj.id || idx}
                style={{
                  background: '#f8faf7',
                  border: '1px solid #d8e2d6',
                  borderRadius: '8px',
                  padding: '16px',
                  position: 'relative',
                }}
              >
                {/* Header card slide */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e2ece0', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, color: '#2f5844', fontSize: '14px' }}>
                      SLIDE {String(idx + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '11px', background: proj.concept ? '#eaf1ea' : '#d5a470', color: proj.concept ? '#2f5844' : '#fff', padding: '2px 6px', borderRadius: '3px' }}>
                      {proj.concept ? 'Minh họa' : 'Dự án thật'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      className="icon-button"
                      title="Di chuyển lên trước"
                      disabled={idx === 0}
                      onClick={() => moveProject(idx, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title="Di chuyển xuống sau"
                      disabled={idx === projects.length - 1}
                      onClick={() => moveProject(idx, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      title="Xóa dự án này"
                      style={{ color: '#c0392b' }}
                      onClick={() => deleteProject(idx)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Content card slide */}
                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '16px' }}>
                  {/* Cột ảnh và nút upload replace */}
                  <div>
                    <div
                      style={{
                        width: '100%',
                        height: '120px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: '#e0e7df',
                        position: 'relative',
                        border: '1px solid #ccd8cb',
                      }}
                    >
                      <img
                        src={proj.image || '/images/architecture.webp'}
                        alt={proj.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.src = '/images/architecture.webp'; }}
                      />
                      {uploadingIndex === idx && (
                        <div style={{
                          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', gap: '6px'
                        }}>
                          <Loader2 className="spin" size={16} /> Đang scale ảnh…
                        </div>
                      )}
                    </div>

                    <input
                      ref={el => fileInputRefs.current[idx] = el}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={e => handleUploadPhoto(idx, e)}
                    />
                    <button
                      type="button"
                      className="button button-secondary full-width"
                      style={{ marginTop: '8px', fontSize: '12px', padding: '6px 8px' }}
                      disabled={uploadingIndex === idx}
                      onClick={() => fileInputRefs.current[idx]?.click()}
                    >
                      <ImagePlus size={14} /> Thay ảnh (tự scale)
                    </button>
                    <small style={{ fontSize: '10px', color: '#687e6d', display: 'block', textAlign: 'center', marginTop: '4px' }}>
                      Tự động resize 1600×1067 WebP
                    </small>
                  </div>

                  {/* Cột thông tin chữ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="settings-two-col" style={{ margin: 0 }}>
                      <label className="form-label" style={{ margin: 0 }}>
                        Danh mục / Phụ đề
                        <input
                          type="text"
                          maxLength={60}
                          value={proj.category || ''}
                          onChange={e => updateProject(idx, 'category', e.target.value)}
                          placeholder="URBAN LIVING"
                        />
                      </label>
                      <label className="form-label" style={{ margin: 0 }}>
                        Loại hiển thị
                        <select
                          value={proj.concept ? 'concept' : 'real'}
                          onChange={e => updateProject(idx, 'concept', e.target.value === 'concept')}
                        >
                          <option value="concept">Ý tưởng / Minh họa</option>
                          <option value="real">Dự án giới thiệu thật</option>
                        </select>
                      </label>
                    </div>

                    <label className="form-label" style={{ margin: 0 }}>
                      Tiêu đề slide
                      <input
                        type="text"
                        maxLength={120}
                        required
                        value={proj.title || ''}
                        onChange={e => updateProject(idx, 'title', e.target.value)}
                        placeholder="Sống giữa nhịp đô thị."
                      />
                    </label>

                    <label className="form-label" style={{ margin: 0 }}>
                      Mô tả dự án
                      <textarea
                        rows="2"
                        maxLength={400}
                        value={proj.description || ''}
                        onChange={e => updateProject(idx, 'description', e.target.value)}
                        placeholder="Khám phá cách kiến trúc, kết nối và tiện ích định hình trải nghiệm..."
                      />
                    </label>

                    <div className="settings-two-col" style={{ margin: 0 }}>
                      <label className="form-label" style={{ margin: 0 }}>
                        Thẻ Tags (phân cách bằng dấu phẩy)
                        <input
                          type="text"
                          value={Array.isArray(proj.tags) ? proj.tags.join(', ') : ''}
                          onChange={e => updateProject(idx, 'tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="Đô thị, Kết nối, Tiện ích"
                        />
                      </label>
                      <label className="form-label" style={{ margin: 0 }}>
                        Link chuyển đến khi click
                        <input
                          type="text"
                          value={proj.linkUrl || '#du-an'}
                          onChange={e => updateProject(idx, 'linkUrl', e.target.value)}
                          placeholder="#du-an"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons cho projects */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #d8e2d6' }}>
            <button
              type="button"
              className="button button-secondary"
              onClick={addProject}
              style={{ fontWeight: 600 }}
            >
              <Plus size={16} /> Thêm dự án / Banner mới
            </button>
            <button
              type="button"
              className="text-button"
              onClick={resetProjectsOnly}
              title="Khôi phục lại 3 slide ý tưởng mặc định"
            >
              <RefreshCw size={13} /> Khôi phục 3 slide mặc định
            </button>
          </div>
        </section>

        {/* STRIP BANNER */}
        <section className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-section-icon"><Sparkles size={19} /></span>
            <div>
              <h2>Dải biểu ngữ (Strip Banner)</h2>
              <p>Dải thông điệp chạy ngang phân cách các phần.</p>
            </div>
          </div>

          <label className="form-label">
            Nhãn biểu ngữ
            <input
              type="text"
              maxLength={60}
              value={strip.label || ''}
              onChange={e => updateSection('strip', 'label', e.target.value)}
              placeholder="VINCENTE JOURNAL"
            />
          </label>

          <div className="settings-two-col">
            <label className="form-label">
              Giá trị 1
              <input
                type="text"
                maxLength={80}
                value={strip.item1 || ''}
                onChange={e => updateSection('strip', 'item1', e.target.value)}
                placeholder="Thông tin có chọn lọc"
              />
            </label>
            <label className="form-label">
              Giá trị 2
              <input
                type="text"
                maxLength={80}
                value={strip.item2 || ''}
                onChange={e => updateSection('strip', 'item2', e.target.value)}
                placeholder="Góc nhìn có cơ sở"
              />
            </label>
          </div>
          <label className="form-label">
            Giá trị 3
            <input
              type="text"
              maxLength={80}
              value={strip.item3 || ''}
              onChange={e => updateSection('strip', 'item3', e.target.value)}
              placeholder="Kết nối giá trị bền vững"
            />
          </label>
        </section>

        {/* PERSPECTIVE SECTION */}
        <section className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-section-icon"><ShieldCheck size={19} /></span>
            <div>
              <h2>Góc nhìn Vincente (The Perspective)</h2>
              <p>Tuyên ngôn giá trị và triết lý làm việc.</p>
            </div>
          </div>

          <label className="form-label">
            Nhãn mục
            <input
              type="text"
              maxLength={80}
              value={perspective.eyebrow || ''}
              onChange={e => updateSection('perspective', 'eyebrow', e.target.value)}
              placeholder="02 / THE PERSPECTIVE"
            />
          </label>

          <div className="settings-two-col">
            <label className="form-label">
              Tiêu đề chính
              <input
                type="text"
                maxLength={120}
                value={perspective.titleMain || ''}
                onChange={e => updateSection('perspective', 'titleMain', e.target.value)}
                placeholder="Giá trị bắt đầu từ một góc nhìn"
              />
            </label>
            <label className="form-label">
              Từ in nghiêng
              <input
                type="text"
                maxLength={60}
                value={perspective.titleAccent || ''}
                onChange={e => updateSection('perspective', 'titleAccent', e.target.value)}
                placeholder="rõ ràng."
              />
            </label>
          </div>

          <label className="form-label">
            Trích dẫn nổi bật (Big Copy)
            <textarea
              rows="2"
              maxLength={300}
              value={perspective.bigCopy || ''}
              onChange={e => updateSection('perspective', 'bigCopy', e.target.value)}
              placeholder="Giữa rất nhiều thông tin, điều bạn cần là sự thấu hiểu."
            />
          </label>

          <label className="form-label">
            Nội dung chi tiết
            <textarea
              rows="4"
              maxLength={1000}
              value={perspective.description || ''}
              onChange={e => updateSection('perspective', 'description', e.target.value)}
              placeholder="Vincente Realty kết nối tin tức thị trường với góc nhìn phân tích của Vượng Nguyễn..."
            />
          </label>

          <div className="settings-two-col">
            <label className="form-label">
              Nguyên tắc 1
              <input
                type="text"
                maxLength={80}
                value={perspective.principle1Title || ''}
                onChange={e => updateSection('perspective', 'principle1Title', e.target.value)}
                placeholder="Đọc có nguồn"
              />
            </label>
            <label className="form-label">
              Nguyên tắc 2
              <input
                type="text"
                maxLength={80}
                value={perspective.principle2Title || ''}
                onChange={e => updateSection('perspective', 'principle2Title', e.target.value)}
                placeholder="Hiểu bối cảnh"
              />
            </label>
          </div>
          <label className="form-label">
            Nguyên tắc 3
            <input
              type="text"
              maxLength={80}
              value={perspective.principle3Title || ''}
              onChange={e => updateSection('perspective', 'principle3Title', e.target.value)}
              placeholder="Nhìn dài hạn"
            />
          </label>
        </section>

        {/* CONNECT & CONTACT SECTION */}
        <section className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-section-icon"><MessageSquare size={19} /></span>
            <div>
              <h2>Khối Liên hệ &amp; Tư vấn (Let's Connect)</h2>
              <p>Mời gọi khách hàng kết nối, trao đổi nhu cầu BĐS.</p>
            </div>
          </div>

          <div className="settings-two-col">
            <label className="form-label">
              Tiêu đề chính
              <input
                type="text"
                maxLength={100}
                value={connect.titleMain || ''}
                onChange={e => updateSection('connect', 'titleMain', e.target.value)}
                placeholder="Mỗi nhu cầu. Một cuộc"
              />
            </label>
            <label className="form-label">
              Từ in nghiêng
              <input
                type="text"
                maxLength={60}
                value={connect.titleAccent || ''}
                onChange={e => updateSection('connect', 'titleAccent', e.target.value)}
                placeholder="trò chuyện."
              />
            </label>
          </div>

          <label className="form-label">
            Lời mời tư vấn
            <textarea
              rows="2"
              maxLength={300}
              value={connect.description || ''}
              onChange={e => updateSection('connect', 'description', e.target.value)}
              placeholder="Bạn đang tìm nơi an cư, tìm hiểu một khu vực hay muốn trao đổi về thị trường?"
            />
          </label>

          <div className="settings-two-col">
            <label className="form-label">
              Chữ trên nút kêu gọi (CTA)
              <input
                type="text"
                maxLength={80}
                value={connect.ctaText || ''}
                onChange={e => updateSection('connect', 'ctaText', e.target.value)}
                placeholder="Trò chuyện với Vượng Nguyễn"
              />
            </label>
            <label className="form-label">
              Dòng ghi chú nhỏ dưới nút
              <input
                type="text"
                maxLength={100}
                value={connect.ctaSubtext || ''}
                onChange={e => updateSection('connect', 'ctaSubtext', e.target.value)}
                placeholder="Kết nối trực tiếp qua Facebook"
              />
            </label>
          </div>

          <label className="form-label">
            Link liên hệ đích (Facebook / Zalo / Website)
            <input
              type="url"
              value={connect.contactUrl || ''}
              onChange={e => updateSection('connect', 'contactUrl', e.target.value)}
              placeholder="https://www.facebook.com/vuong.nguyen.8694"
            />
          </label>
        </section>

        {/* FOOTER SECTION */}
        <section className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-section-icon"><Home size={19} /></span>
            <div>
              <h2>Chân trang &amp; Bản quyền (Footer)</h2>
              <p>Thông điệp cuối trang và tuyên bố trách nhiệm.</p>
            </div>
          </div>

          <label className="form-label">
            Tagline chân trang
            <textarea
              rows="2"
              maxLength={200}
              value={footer.tagline || ''}
              onChange={e => updateSection('footer', 'tagline', e.target.value)}
              placeholder="Thông tin chọn lọc.&#10;Tầm nhìn rộng mở."
            />
          </label>

          <label className="form-label">
            Tuyên bố miễn trừ trách nhiệm
            <input
              type="text"
              maxLength={300}
              value={footer.disclaimer || ''}
              onChange={e => updateSection('footer', 'disclaimer', e.target.value)}
              placeholder="Nội dung tham khảo, không phải cam kết lợi nhuận."
            />
          </label>

          <label className="form-label">
            Tên thương hiệu bản quyền
            <input
              type="text"
              maxLength={100}
              value={footer.copyright || ''}
              onChange={e => updateSection('footer', 'copyright', e.target.value)}
              placeholder="Vincente Realty"
            />
          </label>
        </section>

        {error && (
          <div className="notice notice-error" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        <div className="settings-save">
          <span>Thay đổi sẽ hiển thị ngay lập tức trên trang chủ.</span>
          <button type="submit" className="button button-primary" disabled={saving}>
            {saving ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
            {saving ? 'Đang lưu…' : 'Lưu nội dung CMS'}
          </button>
        </div>
      </form>

      {/* ASIDE PREVIEW & ACTIONS */}
      <aside className="settings-aside">
        <section className="connection-card">
          <div className="connection-heading">
            <Globe size={21} />
            <span className="connection-status connected"><span />Đang hoạt động</span>
          </div>
          <h2>Landing Page Vincente</h2>
          <p>Trang chủ công khai phục vụ độc giả và khách hàng tìm hiểu bất động sản.</p>
          <a className="button button-secondary full-width" href="/" target="_blank" rel="noreferrer" style={{ marginTop: '12px' }}>
            <ExternalLink size={15} /> Xem trang công khai
          </a>
        </section>

        <section className="demo-card">
          <span className="eyebrow">QUẢN TRỊ AN TOÀN</span>
          <h3>Khôi phục mặc định</h3>
          <p>Nếu muốn đưa toàn bộ câu chữ trên trang chủ trở về văn bản nguyên bản của Vincente Realty.</p>
          {!confirmReset ? (
            <button
              className="button button-secondary full-width"
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={resetting}
            >
              <RefreshCw size={15} /> Khôi phục mặc định
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
              <p style={{ fontSize: '12px', color: '#c0392b', margin: '4px 0' }}>Xác nhận đặt lại toàn bộ chữ về mặc định?</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="button button-primary"
                  style={{ flex: 1, backgroundColor: '#c0392b' }}
                  type="button"
                  onClick={handleReset}
                  disabled={resetting}
                >
                  {resetting ? <Loader2 className="spin" size={14} /> : 'Xác nhận'}
                </button>
                <button
                  className="button button-secondary"
                  style={{ flex: 1 }}
                  type="button"
                  onClick={() => setConfirmReset(false)}
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="settings-local-note">
          <Info size={17} />
          <p>Dữ liệu CMS được lưu bền vững trong cơ sở dữ liệu SQLite của máy chủ. Khách truy cập xem ngay lập tức mà không cần build lại code.</p>
        </div>
      </aside>
    </div>
  );
}
