import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const contentPlaybook = readFileSync(new URL('../CONTENT_PLAYBOOK.md', import.meta.url), 'utf8').trim();
export const writingPlaybook = contentPlaybook.split('## Giọng viết')[1].split('## Hình ảnh')[0].trim();
export const imagePlaybook = contentPlaybook.split('## Hình ảnh')[1].trim();
export const perspectivePrompt = `${readFileSync(new URL('../skills/rss-property-perspective/references/runtime.txt', import.meta.url), 'utf8').trim()}\n\nMandatory owner writing rules (override conflicting style samples):\n${writingPlaybook}`;
export const perspectiveVersion = createHash('sha256').update(perspectivePrompt).digest('hex').slice(0, 16);
const fold = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/gu, 'd').replace(/[^a-z0-9]+/gu, ' ').trim();

// Explicit relation phrases prevent spending tokens on unrelated portfolio entries.
// Matching is an editorial filter, not evidence that a project benefits from the news.
export function selectProjectContext(article, settings = {}) {
  const source = ` ${fold(`${article.title} ${article.summary}`)} `;
  const selected = String(settings.projectContext || '').split(/\n\s*\n/u).filter(block => {
    const relation = block.split('\n').find(line => /^Liên hệ\s*:/iu.test(line.trim()));
    if (!relation) return false;
    return relation.slice(relation.indexOf(':') + 1).split(';').some(term => {
      const phrase = fold(term);
      return phrase.length >= 4 && phrase.split(' ').length >= 2 && source.includes(` ${phrase} `);
    });
  });
  const blocks = [];
  let length = 0;
  for (const block of selected) {
    const compact = block.replace(/https?:\/\/[^\s<>]+/giu, '').trim();
    if (length + compact.length > 1600) continue; // Do not truncate a fact or its qualification.
    blocks.push(compact);
    length += compact.length;
  }
  const text = blocks.join('\n\n');
  // Only keep links belonging to blocks actually sent to the model.
  const urls = selected.filter(block => blocks.includes(block.replace(/https?:\/\/[^\s<>]+/giu, '').trim()))
    .flatMap(block => block.match(/https?:\/\/[^\s<>]+/giu) || [])
    .filter(url => { try { const parsed = new URL(url); return parsed.protocol === 'https:' && !parsed.username && !parsed.password; } catch { return false; } });
  return { text, urls: [...new Set(urls)].slice(0, 5) };
}

export function composePerspective(parts) {
  return [parts.summary, parts.mechanism && `📍 Tác động đối với khu vực\n${parts.mechanism}`, `💡 Triển vọng và điều kiện\n${parts.perspective}`, parts.audienceNote && `👥 Ai nên quan tâm\n${parts.audienceNote}`, `🔎 Điểm cần theo dõi\n${parts.watchpoint}`, parts.question, parts.hashtags.join(' ')].filter(Boolean).join('\n\n');
}

export function localPerspective(article, settings = {}) {
  const source = `${article.title} ${article.summary}`;
  const angle = /sân bay|cao tốc|metro|giao thông|nút giao|cầu đường/iu.test(source)
    ? 'Nếu hạ tầng liên quan được triển khai đúng kế hoạch và phục vụ nhu cầu đi lại thực tế, khu vực có thể cải thiện tính thuận tiện cho cư dân. Cần đánh giá tiến độ thực hiện và khả năng kết nối với nơi ở, nơi làm việc trước khi kết luận về tác động dài hạn.'
    : /quy hoạch|tái định cư/iu.test(source)
      ? 'Nếu quy hoạch được thực hiện đồng bộ với tiện ích và nhu cầu ở thực tế, khu vực có thể cải thiện chất lượng môi trường sống. Cần phân biệt kế hoạch, quyết định phê duyệt và tiến độ triển khai khi đánh giá khả năng đáp ứng nhu cầu cư dân.'
      : 'Nếu không gian sống, tiện ích và khả năng sử dụng đáp ứng nhu cầu của người mua, khu vực có thể có lợi thế trong việc phục vụ nhu cầu ở thực. Một bản tin riêng lẻ chưa đủ cơ sở để kết luận về khả năng tăng giá.';
  const parts = {
    summary: String(article.summary).slice(0, 2400), perspective: angle,
    watchpoint: 'Cần đọc bài gốc và đối chiếu thông tin hiện hành; phân biệt kế hoạch, phê duyệt và thực tế triển khai.',
    question: 'Yếu tố nào trong thông tin này cần được làm rõ trước khi đánh giá tác động đối với người mua nhà?',
    hashtags: ['#BatDongSan', '#PhanTichKhuVuc'], contextUsed: false,
  };
  return {
    ...parts, title: String(article.title).slice(0, 150), content: composePerspective(parts),
    facts: [`${parts.summary} — RSS: ${parts.summary}`],
    reviewFlags: ['Mẫu cục bộ miễn phí, không gọi ChatGPT. Phần nhận định là khung tham khảo, cần chỉnh lại theo quan điểm của anh.', 'Chỉ dựa trên tiêu đề và tóm tắt RSS. Cần đọc bài gốc, kiểm tra dữ kiện trước khi đăng.', ...(settings.projectContext?.trim() ? ['Chế độ mẫu không tự liên hệ dự án; chọn OpenAI để diễn giải context liên quan.'] : [])],
    imageBrief: 'Ảnh minh họa chân thực về nhà ở và không gian sống; không tái hiện dự án cụ thể.',
    provider: 'local', skillVersion: perspectiveVersion,
  };
}
