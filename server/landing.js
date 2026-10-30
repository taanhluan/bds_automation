import { randomUUID } from 'node:crypto';

export const defaultLandingProjects = [
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

export const defaultLandingCms = {
  hero: {
    eyebrow: 'GÓC NHÌN BẤT ĐỘNG SẢN · VƯỢNG NGUYỄN',
    titleMain: 'Hiểu thị trường.',
    titleAccent: 'giá trị.',
    description: 'Đọc những chuyển động hôm nay.\nNhìn rõ hơn những lựa chọn ngày mai.',
    intro: 'Tin tức chọn lọc, góc nhìn quy hoạch và câu chuyện nhà ở. Cùng Vincente Realty đặt thông tin vào đúng bối cảnh trước mỗi quyết định.',
    badge: 'V.',
    authorName: 'Vượng Nguyễn',
    authorRole: 'Người kết nối thông tin & bất động sản',
    facebookUrl: 'https://www.facebook.com/vuong.nguyen.8694',
  },
  strip: {
    label: 'VINCENTE JOURNAL',
    item1: 'Thông tin có chọn lọc',
    item2: 'Góc nhìn có cơ sở',
    item3: 'Kết nối giá trị bền vững',
  },
  projects: defaultLandingProjects,
  perspective: {
    eyebrow: '02 / THE PERSPECTIVE',
    titleMain: 'Giá trị bắt đầu\ntừ một góc nhìn\n',
    titleAccent: 'rõ ràng.',
    bigCopy: 'Giữa rất nhiều thông tin,\nđiều bạn cần là sự thấu hiểu.',
    description: 'Vincente Realty kết nối tin tức thị trường với góc nhìn phân tích của Vượng Nguyễn. Từ chuyển động quy hoạch đến nhu cầu nhà ở, mỗi bài viết giúp bạn đặt thêm những câu hỏi đúng trước khi ra quyết định.',
    principle1Num: '01',
    principle1Title: 'Đọc có nguồn',
    principle2Num: '02',
    principle2Title: 'Hiểu bối cảnh',
    principle3Num: '03',
    principle3Title: 'Nhìn dài hạn',
  },
  connect: {
    eyebrow: '03 / LET’S CONNECT',
    titleMain: 'Mỗi nhu cầu.\nMột cuộc ',
    titleAccent: 'trò chuyện.',
    description: 'Bạn đang tìm nơi an cư, tìm hiểu một khu vực\nhay muốn trao đổi về thị trường?',
    ctaText: 'Trò chuyện với Vượng Nguyễn',
    ctaSubtext: 'Kết nối trực tiếp qua Facebook',
    contactUrl: 'https://www.facebook.com/vuong.nguyen.8694',
    phone: '',
    email: '',
  },
  footer: {
    tagline: 'Thông tin chọn lọc.\nTầm nhìn rộng mở.',
    disclaimer: 'Nội dung tham khảo, không phải cam kết lợi nhuận.',
    copyright: 'Vincente Realty',
  },
};

function sanitizeText(value, maxLength = 500, fallback = '') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.slice(0, maxLength);
}

function sanitizeUrl(value, fallback = '') {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

function sanitizeUrlOrPath(value, fallback = '/images/architecture.webp') {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const trimmed = value.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('..')) {
    return trimmed.slice(0, 500);
  }
  return sanitizeUrl(trimmed, fallback);
}

function sanitizeProjects(inputProjects, fallbackProjects = defaultLandingProjects) {
  if (!Array.isArray(inputProjects)) return fallbackProjects;
  const valid = inputProjects.slice(0, 20).map((item, index) => {
    if (!item || typeof item !== 'object') return null;
    const fallback = fallbackProjects[index] || defaultLandingProjects[0];
    return {
      id: sanitizeText(item.id, 50, randomUUID()),
      category: sanitizeText(item.category, 60, 'DỰ ÁN KHÔNG GIAN'),
      title: sanitizeText(item.title, 120, 'Không gian kiến trúc'),
      description: sanitizeText(item.description, 400, ''),
      image: sanitizeUrlOrPath(item.image, fallback?.image || '/images/architecture.webp'),
      tags: Array.isArray(item.tags)
        ? item.tags.slice(0, 5).map(t => sanitizeText(t, 40)).filter(Boolean)
        : (fallback?.tags || []),
      concept: item.concept !== false,
      linkUrl: sanitizeText(item.linkUrl, 300, '#du-an'),
    };
  }).filter(Boolean);

  return valid.length > 0 ? valid : fallbackProjects;
}

export function validateLandingCms(input, current = defaultLandingCms) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return current;
  const prev = current || defaultLandingCms;

  const heroIn = input.hero || {};
  const prevHero = prev.hero || defaultLandingCms.hero;
  const hero = {
    eyebrow: sanitizeText(heroIn.eyebrow, 120, prevHero.eyebrow),
    titleMain: sanitizeText(heroIn.titleMain, 100, prevHero.titleMain),
    titleAccent: sanitizeText(heroIn.titleAccent, 60, prevHero.titleAccent),
    description: sanitizeText(heroIn.description, 300, prevHero.description),
    intro: sanitizeText(heroIn.intro, 600, prevHero.intro),
    badge: sanitizeText(heroIn.badge, 10, prevHero.badge),
    authorName: sanitizeText(heroIn.authorName, 80, prevHero.authorName),
    authorRole: sanitizeText(heroIn.authorRole, 120, prevHero.authorRole),
    facebookUrl: sanitizeUrl(heroIn.facebookUrl, prevHero.facebookUrl),
  };

  const stripIn = input.strip || {};
  const prevStrip = prev.strip || defaultLandingCms.strip;
  const strip = {
    label: sanitizeText(stripIn.label, 60, prevStrip.label),
    item1: sanitizeText(stripIn.item1, 80, prevStrip.item1),
    item2: sanitizeText(stripIn.item2, 80, prevStrip.item2),
    item3: sanitizeText(stripIn.item3, 80, prevStrip.item3),
  };

  const projects = sanitizeProjects(input.projects, prev.projects || defaultLandingProjects);

  const persIn = input.perspective || {};
  const prevPers = prev.perspective || defaultLandingCms.perspective;
  const perspective = {
    eyebrow: sanitizeText(persIn.eyebrow, 80, prevPers.eyebrow),
    titleMain: sanitizeText(persIn.titleMain, 120, prevPers.titleMain),
    titleAccent: sanitizeText(persIn.titleAccent, 60, prevPers.titleAccent),
    bigCopy: sanitizeText(persIn.bigCopy, 300, prevPers.bigCopy),
    description: sanitizeText(persIn.description, 1000, prevPers.description),
    principle1Num: sanitizeText(persIn.principle1Num, 10, prevPers.principle1Num),
    principle1Title: sanitizeText(persIn.principle1Title, 80, prevPers.principle1Title),
    principle2Num: sanitizeText(persIn.principle2Num, 10, prevPers.principle2Num),
    principle2Title: sanitizeText(persIn.principle2Title, 80, prevPers.principle2Title),
    principle3Num: sanitizeText(persIn.principle3Num, 10, prevPers.principle3Num),
    principle3Title: sanitizeText(persIn.principle3Title, 80, prevPers.principle3Title),
  };

  const connIn = input.connect || {};
  const prevConn = prev.connect || defaultLandingCms.connect;
  const connect = {
    eyebrow: sanitizeText(connIn.eyebrow, 80, prevConn.eyebrow),
    titleMain: sanitizeText(connIn.titleMain, 100, prevConn.titleMain),
    titleAccent: sanitizeText(connIn.titleAccent, 60, prevConn.titleAccent),
    description: sanitizeText(connIn.description, 300, prevConn.description),
    ctaText: sanitizeText(connIn.ctaText, 80, prevConn.ctaText),
    ctaSubtext: sanitizeText(connIn.ctaSubtext, 100, prevConn.ctaSubtext),
    contactUrl: sanitizeUrl(connIn.contactUrl, prevConn.contactUrl),
    phone: sanitizeText(connIn.phone, 30, prevConn.phone || ''),
    email: sanitizeText(connIn.email, 100, prevConn.email || ''),
  };

  const footIn = input.footer || {};
  const prevFoot = prev.footer || defaultLandingCms.footer;
  const footer = {
    tagline: sanitizeText(footIn.tagline, 200, prevFoot.tagline),
    disclaimer: sanitizeText(footIn.disclaimer, 300, prevFoot.disclaimer),
    copyright: sanitizeText(footIn.copyright, 100, prevFoot.copyright),
  };

  return { hero, strip, projects, perspective, connect, footer };
}
