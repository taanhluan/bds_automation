import { perspectivePrompt, perspectiveVersion, selectProjectContext, composePerspective, localPerspective } from './perspective.js';
const RESPONSES_URL = 'https://api.openai.com/v1';
const RSS_REVIEW_FLAG = 'Chỉ dựa trên tiêu đề và tóm tắt RSS. Cần đọc bài gốc, kiểm tra dữ kiện trước khi đăng.';

export class GenerationError extends Error {
  constructor(message, code = 'provider_error', status = 502) {
    super(message);
    this.name = 'GenerationError';
    this.code = code;
    this.status = status;
  }
}

export function requireOpenAIKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new GenerationError('Chưa có OPENAI_API_KEY. Thêm khóa vào .env.local rồi khởi động lại để viết từ tin thật.', 'missing_key', 503);
  }
  return key;
}

// Deliberately no retries: a failed connection may still have consumed paid API usage.
export async function requestOpenAI(path, body, { timeoutMs = 60_000, kind = 'text' } = {}) {
  const key = requireOpenAIKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${RESPONSES_URL}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      // Provider error bodies may contain request details, so do not expose or log them.
      if (response.status === 401) throw new GenerationError('OpenAI từ chối khóa API. Kiểm tra OPENAI_API_KEY.', 'invalid_key', 503);
      if (response.status === 429) throw new GenerationError('OpenAI đang giới hạn yêu cầu hoặc tài khoản hết hạn mức. Kiểm tra tài khoản trước khi thử lại.', 'rate_limit', 429);
      if (response.status === 403) throw new GenerationError('Tài khoản chưa có quyền dùng model này. Kiểm tra quyền truy cập hoặc đổi model trong .env.local.', 'provider_access', 503);
      throw new GenerationError(`OpenAI trả lỗi HTTP ${response.status}. Kiểm tra model và tài khoản trước khi thử lại.`, 'provider_error');
    }
    const result = await response.json();
    if (!result || typeof result !== 'object' || result.error) {
      throw new GenerationError('OpenAI trả kết quả không hợp lệ. Chưa lưu nội dung để duyệt.', 'invalid_response');
    }
    return result;
  } catch (error) {
    if (error instanceof GenerationError) throw error;
    const subject = kind === 'image' ? 'tạo hình' : 'viết bài';
    if (controller.signal.aborted || error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new GenerationError(`Yêu cầu ${subject} quá thời gian chờ. OpenAI có thể vẫn đã xử lý và tính phí; ứng dụng không tự gửi lại.`, 'uncertain', 504);
    }
    throw new GenerationError(`Không nhận được kết quả ${subject} từ OpenAI. Yêu cầu có thể đã được xử lý và tính phí; ứng dụng không tự gửi lại.`, 'uncertain', 502);
  } finally {
    clearTimeout(timer);
  }
}

const draftSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['ready', 'needs_context'] },
    title: { type: 'string' },
    benefits: {
      type: 'array', items: {
        type: 'object', additionalProperties: false,
        properties: { condition: { type: 'string' }, benefit: { type: 'string' } },
        required: ['condition', 'benefit'],
      },
    },
    watchpoint: { type: 'string' },
    question: { type: 'string' },
    hashtags: { type: 'array', items: { type: 'string' } },
    contextUsed: { type: 'boolean' },
    reviewFlags: { type: 'array', items: { type: 'string' } },
    imageBrief: { type: 'string' },
    mechanism: { type: 'string' },
    audienceNote: { type: 'string' },
  },
  required: ['status', 'title', 'benefits', 'watchpoint', 'question', 'hashtags', 'contextUsed', 'reviewFlags', 'imageBrief', 'mechanism', 'audienceNote'],
};

const SYSTEM_PROMPT = perspectivePrompt;

const textValue = (value, maxLength) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

export function parseResponseOutput(response) {
  if (response.status !== 'completed') {
    throw new GenerationError('OpenAI chưa hoàn thành bản nháp. Không dùng phần nội dung chưa hoàn chỉnh.', 'incomplete_response');
  }
  const parts = (Array.isArray(response.output) ? response.output : [])
    .filter((item) => item?.type === 'message')
    .flatMap((item) => Array.isArray(item.content) ? item.content : []);
  if (parts.some((part) => part?.type === 'refusal')) {
    throw new GenerationError('OpenAI từ chối tạo nội dung này. Hãy chọn tin khác hoặc kiểm tra nguồn.', 'refusal', 422);
  }
  const text = parts.filter((part) => part?.type === 'output_text' && typeof part.text === 'string').map((part) => part.text).join('');
  if (!text || text.length > 30_000) throw new GenerationError('Không có bản nháp JSON hợp lệ từ OpenAI.', 'invalid_response');
  try {
    return JSON.parse(text);
  } catch {
    throw new GenerationError('Không đọc được kết quả có cấu trúc từ OpenAI.', 'invalid_response');
  }
}

const numbersIn = (text) => (text.match(/\d+(?:[.,]\d+)*/gu) || []);

export function validateGroundedDraft(draft, article, context = { text: '', urls: [] }) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    throw new GenerationError('Bản nháp thiếu cấu trúc cần thiết.', 'invalid_response');
  }
  if (draft.status === 'needs_context') {
    throw new GenerationError('Tóm tắt RSS chưa đủ dữ kiện để viết bài. Hãy đọc bài gốc hoặc chọn một tin có tóm tắt rõ hơn.', 'needs_context', 422);
  }
  if ('benefits' in draft) {
    if (!Array.isArray(draft.benefits) || draft.benefits.length < 1 || draft.benefits.length > 3
      || draft.benefits.some(item => !item || typeof item.condition !== 'string' || !item.condition.trim() || item.condition.length > 230 || typeof item.benefit !== 'string' || !item.benefit.trim() || item.benefit.length > 230)) {
      throw new GenerationError('Thiếu điều kiện hoặc lợi ích để viết nhận định cá nhân.', 'invalid_response');
    }
    draft = { ...draft, benefits: draft.benefits.map(item => ({ condition: item.condition.trim().replace(/^(?:nếu\s+)+/iu, ''), benefit: item.benefit.trim().replace(/^(?:có thể\s+)+/iu, '') })) };
    if (draft.benefits.some(item => !item.condition || !item.benefit)) throw new GenerationError('Thiếu nội dung nhận định sau khi chuẩn hóa.', 'invalid_response');
    draft = { ...draft, summary: textValue(article.summary, 2400),
      perspective: draft.benefits.map(item => `• Nếu ${item.condition.trim()}, có thể ${item.benefit.trim()}.`).join('\n'),
      facts: [{ statement: textValue(article.summary, 700), sourceField: 'summary' }],
    };
  }
  if (Array.isArray(draft.hashtags)) draft = { ...draft, hashtags: [...new Set(draft.hashtags.map(tag => typeof tag === 'string' ? tag.trim().normalize('NFC') : tag))] };
  for (const key of ['mechanism', 'audienceNote']) {
    if (key in draft && (typeof draft[key] !== 'string' || draft[key].length > 450)) throw new GenerationError('Phân tích vượt giới hạn hoặc không hợp lệ.', 'invalid_response');
  }
  const structured = 'perspective' in draft;
  if (structured) {
    for (const [key, max] of [['summary', 2400], ['perspective', 1400], ['watchpoint', 350], ['question', 180]]) {
      if (typeof draft[key] !== 'string' || !draft[key].trim() || draft[key].length > max) {
        throw new GenerationError('Thiếu phần tóm tắt hoặc nhận định cá nhân hợp lệ.', 'invalid_response');
      }
    }
    if (typeof draft.contextUsed !== 'boolean' || (draft.contextUsed && !context.text)
      || !Array.isArray(draft.hashtags) || draft.hashtags.length > 4
      || draft.hashtags.some(tag => typeof tag !== 'string' || !/^#[\p{L}\p{N}_]{2,40}$/u.test(tag))) {
      throw new GenerationError('Context dự án hoặc hashtag chưa hợp lệ.', 'needs_context', 422);
    }
    draft = { ...draft, content: composePerspective(draft) };
  }
  if (draft.status !== 'ready' || typeof draft.title !== 'string' || !draft.title.trim() || draft.title.length > 150
    || typeof draft.content !== 'string' || draft.content.trim().length < 30 || draft.content.length > 3600
    || typeof draft.imageBrief !== 'string' || !draft.imageBrief.trim() || draft.imageBrief.length > 600
    || !Array.isArray(draft.facts) || draft.facts.length < 1 || draft.facts.length > 8
    || !Array.isArray(draft.reviewFlags) || draft.reviewFlags.length > 5 || draft.reviewFlags.some((flag) => typeof flag !== 'string' || flag.length > 400)) {
    throw new GenerationError('Bản nháp chưa đạt cấu trúc hoặc giới hạn nội dung. Chưa lưu để duyệt.', 'invalid_response');
  }
  const title = textValue(article.title, 500);
  const summary = textValue(article.summary, 2400);
  const projectContext = draft.contextUsed ? context.text : '';
  const source = `${title}\n${summary}\n${projectContext}`;
  for (const fact of draft.facts) {
    // Resolve references locally: the model never needs to reproduce source quotes.
    const evidence = fact?.sourceField === 'title' ? title : fact?.sourceField === 'summary' ? summary : fact?.sourceField === 'projectContext' ? projectContext : fact?.evidence;
    if (!fact || typeof fact.statement !== 'string' || !fact.statement.trim() || fact.statement.length > 700
      || ('sourceField' in fact && !['title', 'summary', 'projectContext'].includes(fact.sourceField))
      || typeof evidence !== 'string' || evidence.trim().length < 8
      || !(title.includes(evidence) || summary.includes(evidence) || (projectContext && projectContext.includes(evidence)))) {
      throw new GenerationError('Có dữ kiện chưa khớp nguyên văn với RSS. Cần kiểm tra bài gốc trước khi viết.', 'needs_context', 422);
    }
  }
  if (structured) {
    const bullets = draft.perspective.split(/^\s*[-•]\s+/mu);
    const opinions = (bullets.length > 1 ? bullets.slice(1) : bullets).map(line => line.trim()).filter(Boolean);
    if (!opinions.length || opinions.some(line => !/nếu/iu.test(line) || !/có thể/iu.test(line)) || /(?:^|\s)sẽ(?:\s|$)/iu.test(draft.perspective)) {
      throw new GenerationError('Nhận định cần có điều kiện và khả năng, chưa đủ cơ sở để khẳng định kết quả.', 'needs_context', 422);
    }
    const unsupported = ['vị trí thuận lợi', 'vị trí chiến lược', 'cháy hàng', 'cam kết lợi nhuận', 'không lo kẹt xe'];
    if (unsupported.some(claim => draft.content.toLocaleLowerCase('vi').includes(claim) && !source.toLocaleLowerCase('vi').includes(claim))) {
      throw new GenerationError('Nhận định có lợi thế hoặc cam kết chưa có trong nguồn.', 'needs_context', 422);
    }
  }
  const generatedText = [draft.title, draft.content, ...draft.facts.map((fact) => fact.statement)].join('\n');
  const authoredText = [draft.title, draft.perspective, draft.mechanism, draft.audienceNote, draft.watchpoint, draft.question].filter(Boolean).join('\n');
  if (/góc nhìn của mình|với mình|theo mình|mình cho rằng|mình nghĩ|mình thấy|theo quan điểm của mình|(?:^|[^\p{L}])mình(?:$|[^\p{L}])|anh em/iu.test(authoredText)) {
    throw new GenerationError('Giọng viết chưa đúng quy tắc chuyên nghiệp đã chốt. Chỉnh hướng dẫn hoặc tạo bản mới; không tự gọi lại API.', 'invalid_response');
  }
  const sourceNumbers = new Set(numbersIn(source));
  if (numbersIn(generatedText).some((number) => !sourceNumbers.has(number))) {
    throw new GenerationError('Bản nháp có số liệu không xuất hiện trong nguồn RSS. Cần kiểm tra bài gốc.', 'needs_context', 422);
  }
  if (/https?:\/\/|www\./iu.test(generatedText)) {
    throw new GenerationError('Bản nháp chứa liên kết ngoài nội dung nguồn. Chưa lưu để duyệt.', 'invalid_response');
  }
  // Evidence matching is a guardrail, not a semantic fact-check; keep review mandatory.
  return {
    title: draft.title.trim(),
    content: draft.content.trim(),
    facts: draft.facts.map((fact) => fact.sourceField === 'projectContext' ? `${fact.statement.trim()} — Context người dùng: ${projectContext}` : `${fact.statement.trim()} — RSS: ${fact.sourceField === 'title' ? title : fact.sourceField === 'summary' ? summary : fact.evidence}`),
    reviewFlags: [...new Set([RSS_REVIEW_FLAG, ...(draft.contextUsed ? ['Liên hệ dự án dựa trên context người dùng cung cấp, chưa được RSS xác nhận; cần đối chiếu nguồn và thời điểm.'] : []), ...draft.reviewFlags.map((flag) => flag.trim()).filter(Boolean)])],
    ...(structured ? { summary: draft.summary.trim(), perspective: draft.perspective.trim(), mechanism: draft.mechanism || '', audienceNote: draft.audienceNote || '', ...(draft.benefits ? { benefits: draft.benefits } : {}), watchpoint: draft.watchpoint.trim(), question: draft.question.trim(), hashtags: draft.hashtags, contextUsed: draft.contextUsed, contextSources: draft.contextUsed ? context.urls : [] } : {}),
    skillVersion: perspectiveVersion,
    imageBrief: draft.imageBrief.trim(),
  };
}

function demoDraft(article) {
  const title = textValue(article.title, 120) || 'Phân tích không gian sống';
  const summary = textValue(article.summary, 1200).replace(/^Nội dung mẫu để thử ứng dụng, không phải tin báo thực tế\.\s*/u, '');
  const question = article.topic === 'Quy hoạch' ? 'Bạn thường kiểm tra nguồn nào khi đọc một thông tin quy hoạch?' : article.topic === 'Thị trường' ? 'Theo bạn, cần thêm thông tin gì trước khi so sánh các mức giá?' : 'Với bạn, điều gì quan trọng nhất khi chọn một nơi để gọi là nhà?';
  return {
    title,
    content: `Nội dung mẫu — không phải tin thực tế\n\n${title}\n\n${summary || 'Ví dụ minh họa để thử sửa, lưu và copy một bài viết.'}\n\n${question}`,
    facts: [],
    reviewFlags: ['Nội dung mẫu — không phải tin thực tế. Không dùng như bản tin hoặc dữ kiện thị trường.', 'Đây là mẫu được dựng sẵn để thử giao diện; chưa gọi OpenAI và không phát sinh phí API.'],
    imageBrief: 'Minh họa hình học một khu nhà chung và mảng xanh, không thể hiện địa điểm hay dự án thật.',
    provider: 'demo',
  };
}

export async function buildDraft(article, settings = {}) {
  if (article?.isDemo === true || article?.isDemo === 1) return demoDraft(article);
  if (settings.writingMode !== 'free') requireOpenAIKey();
  const title = textValue(article?.title, 500);
  const summary = textValue(article?.summary, 2400);
  if (title.length < 8 || summary.length < 35) {
    throw new GenerationError('RSS chưa có đủ tiêu đề và tóm tắt để viết. Hãy đọc bài gốc hoặc chọn tin khác.', 'needs_context', 422);
  }
  if (settings.writingMode === 'free') return localPerspective({ ...article, title, summary }, settings);
  const context = selectProjectContext({ title, summary }, settings);
  const response = await requestOpenAI('/responses', {
    model: process.env.TEXT_MODEL?.trim() || 'gpt-4o-mini',
    store: false,
    input: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify({ title, summary, ...(context.text ? { projectContext: context.text } : {}), styleReference: { guide: textValue(settings.styleGuide, 1200), samples: textValue(settings.styleSamples, 4000) }, preferences: { contentMode: context.text && settings.contentMode === 'project' ? 'project' : 'analysis', tone: textValue(settings.tone, 200) || 'Gần gũi, trung tính', audience: textValue(settings.audience, 200) || 'Bạn bè trên Facebook cá nhân', focusArea: textValue(settings.focusArea, 140) } }) },
    ],
    max_output_tokens: 1200,
    text: { format: { type: 'json_schema', name: 'rss_facebook_draft', strict: true, schema: draftSchema } },
  });
  const parsed = parseResponseOutput(response);
  let result;
  try { result = validateGroundedDraft(parsed, { title, summary }, context); }
  catch (error) {
    error.draftPreview = parsed; // Available to the local test CLI only; HTTP exposes the message.
    error.usage = { inputTokens: response.usage?.input_tokens, outputTokens: response.usage?.output_tokens };
    throw error;
  }
  const inputTokens = response.usage?.input_tokens;
  const outputTokens = response.usage?.output_tokens;
  return {
    ...result,
    contentMode: context.text && result.contextUsed && settings.contentMode === 'project' ? 'project' : 'analysis',
    ...(Number.isInteger(inputTokens) && Number.isInteger(outputTokens) ? { usage: { inputTokens, outputTokens } } : {}),
    provider: 'openai',
  };
}
