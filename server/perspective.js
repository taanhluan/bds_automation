import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const perspectivePrompt = readFileSync(new URL('../skills/rss-property-perspective/references/runtime.txt', import.meta.url), 'utf8').trim();
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
  return [parts.summary, `💭 Góc nhìn của mình\n${parts.perspective}`, `🔎 Điều cần theo dõi\n${parts.watchpoint}`, parts.question, parts.hashtags.join(' ')].join('\n\n');
}

export function localPerspective(article, settings = {}) {
  const source = `${article.title} ${article.summary}`;
  const angle = /sân bay|cao tốc|metro|giao thông|nút giao|cầu đường/iu.test(source)
    ? 'Với mình, kết nối thuận tiện là một tiêu chí đáng cân nhắc khi chọn nơi ở. Nếu hạ tầng liên quan được triển khai đúng kế hoạch và phục vụ nhu cầu đi lại thực tế, khu vực có thể hấp dẫn hơn về tính tiện dụng. Mình vẫn muốn nhìn vào tiến độ thực hiện trước khi đánh giá xa hơn.'
    : /quy hoạch|tái định cư/iu.test(source)
      ? 'Với mình, quy hoạch rõ ràng là điểm khởi đầu đáng quan tâm khi tìm hiểu một khu vực. Nếu được thực hiện đồng bộ với tiện ích và nhu cầu ở thực tế, kế hoạch có thể góp phần tạo môi trường sống thuận tiện hơn. Mình sẽ theo dõi cách triển khai thay vì chỉ nhìn vào kỳ vọng.'
      : 'Với mình, sức hút của một nơi ở nên được nhìn từ nhu cầu sử dụng thực tế: không gian sống, tiện ích và khả năng phù hợp với gia đình. Nếu những yếu tố đó được đáp ứng tốt, khu vực có thể có lợi thế về tính đáng sống. Một bản tin vẫn chưa đủ để kết luận về tiềm năng tăng giá.';
  const parts = {
    summary: String(article.summary).slice(0, 2400), perspective: angle,
    watchpoint: 'Cần đọc bài gốc và đối chiếu thông tin hiện hành; phân biệt kế hoạch, phê duyệt và thực tế triển khai.',
    question: 'Anh em đánh giá yếu tố nào đáng theo dõi nhất trong câu chuyện này?',
    hashtags: ['#BatDongSan', '#GocNhinCaNhan'], contextUsed: false,
  };
  return {
    ...parts, title: String(article.title).slice(0, 150), content: composePerspective(parts),
    facts: [`${parts.summary} — RSS: ${parts.summary}`],
    reviewFlags: ['Mẫu cục bộ miễn phí, không gọi ChatGPT. Phần nhận định là khung tham khảo, cần chỉnh lại theo quan điểm của anh.', 'Chỉ dựa trên tiêu đề và tóm tắt RSS. Cần đọc bài gốc, kiểm tra dữ kiện trước khi đăng.', ...(settings.projectContext?.trim() ? ['Chế độ mẫu không tự liên hệ dự án; chọn OpenAI để diễn giải context liên quan.'] : [])],
    imageBrief: 'Bìa đồ họa về nhà ở và không gian sống, không mô phỏng dự án thực tế.',
    provider: 'local', skillVersion: perspectiveVersion,
  };
}
