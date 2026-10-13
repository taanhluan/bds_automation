export function facebookPost(draft, article) {
  const title = (draft.title || article?.title || '').trim();
  let content = (draft.content || '').trim();
  if (draft.isDemo || article?.isDemo) return content;
  content = content.replace(/\n\nNguồn:[\s\S]*$/u, '').trim();
  const blocks = [content.startsWith(title) ? content : `${title}\n\n${content}`];
  const facts = (draft.facts || []).map(fact => typeof fact === 'string' ? fact.split(' — RSS:')[0].trim() : fact.statement?.trim()).filter(Boolean).slice(0, 4);
  if (!draft.perspective && facts.length && !content.includes('Điểm đáng chú ý:')) blocks.push(`Điểm đáng chú ý:\n${facts.map(fact => `• ${fact}`).join('\n')}`);
  if (article?.url?.startsWith('https://')) blocks.push(`Nguồn: ${article.source || 'Bài viết gốc'}\n${article.url}`);
  const contextSources = (draft.contextSources || []).filter(url => { try { const parsed = new URL(url); return parsed.protocol === 'https:' && !parsed.username && !parsed.password; } catch { return false; } });
  if (draft.contextUsed && contextSources.length) blocks.push(`Nguồn context dự án (người dùng cung cấp):\n${[...new Set(contextSources)].join('\n')}`);
  return blocks.filter(Boolean).join('\n\n');
}
