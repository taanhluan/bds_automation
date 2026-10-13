import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDraft, validateGroundedDraft } from '../server/ai.js';
import { selectProjectContext } from '../server/perspective.js';
import { facebookPost } from '../shared/facebook.js';

const article = {
  title: 'Đề xuất bổ sung không gian xanh tại An Phú',
  summary: 'Khu vực An Phú đang được nghiên cứu bổ sung không gian xanh và tiện ích công cộng cho cư dân.',
  url: 'https://vnexpress.net/test-12345.html', source: 'VnExpress',
};
const projectContext = 'Liên hệ: An Phú; Rạch Chiếc\nDự án: Nhà mẫu kiểm thử\nTrạng thái: đề xuất, chưa thi công.\nNguồn: https://example.org/project';
const structured = {
  status: 'ready', title: 'An Phú và câu chuyện không gian sống',
  summary: article.summary,
  perspective: 'Với mình, nếu không gian xanh được triển khai phù hợp nhu cầu cư dân, khu vực có thể hấp dẫn hơn về chất lượng sống.',
  watchpoint: 'Cần theo dõi kết quả nghiên cứu và tiến độ triển khai.',
  question: 'Bạn coi trọng yếu tố nào khi chọn nơi ở?',
  hashtags: ['#AnPhu', '#BatDongSan'], contextUsed: false,
  facts: [{ statement: article.summary, sourceField: 'summary' }], reviewFlags: [],
  imageBrief: 'Minh họa không gian xanh, không mô phỏng dự án thật.',
};

test('context selection matches explicit complete phrases and omits unrelated projects and URLs from paid input', () => {
  const selected = selectProjectContext(article, { projectContext });
  assert.ok(selected.text.includes('Nhà mẫu kiểm thử'));
  assert.ok(selected.text.includes('chưa thi công'));
  assert.ok(!selected.text.includes('https://'));
  assert.deepEqual(selected.urls, ['https://example.org/project']);
  for (const title of ['Thị trường Bắc Ninh', 'Dự án tại An Phúc']) {
    assert.equal(selectProjectContext({ title, summary: 'Một tin không liên quan đến context.' }, { projectContext }).text, '');
  }
  assert.equal(selectProjectContext(article, { projectContext: 'Dự án: Không khai báo mối liên hệ' }).text, '');
  assert.equal(selectProjectContext(article, { projectContext: `${projectContext}\n${'a'.repeat(2000)}` }).text, '');
});

test('structured drafts separate opinion from RSS facts and export without duplicate fact blocks', () => {
  const result = validateGroundedDraft(structured, article);
  assert.equal(result.summary, article.summary);
  assert.equal(result.perspective, structured.perspective);
  const post = facebookPost(result, article);
  assert.ok(post.includes(article.url));
  assert.equal(post.split(article.summary).length - 1, 1);
  assert.ok(post.includes(structured.perspective));
  assert.ok(!post.includes('Điểm đáng chú ý:'));
});

test('owner context has its own attribution, source links and validation', () => {
  const context = selectProjectContext(article, { projectContext });
  const withContext = { ...structured, contextUsed: true, facts: [...structured.facts, { statement: 'Nhà mẫu kiểm thử mới ở trạng thái đề xuất.', sourceField: 'projectContext' }] };
  const result = validateGroundedDraft(withContext, article, context);
  assert.ok(result.facts[1].includes('Context người dùng:'));
  assert.ok(result.reviewFlags.some(flag => flag.includes('chưa được RSS xác nhận')));
  assert.ok(facebookPost(result, article).includes('https://example.org/project'));
  assert.throws(() => validateGroundedDraft(withContext, article), { code: 'needs_context' });
  assert.throws(() => validateGroundedDraft({ ...structured, facts: withContext.facts }, article, context), { code: 'needs_context' });
  assert.throws(() => validateGroundedDraft({ ...structured, perspective: 'Theo mình giá sẽ tăng 99%.' }, article), { code: 'needs_context' });
  assert.throws(() => validateGroundedDraft({ ...structured, perspective: 'Sân bay sẽ tạo ra cơ hội việc làm cho cộng đồng.' }, article), { code: 'needs_context' });
  assert.throws(() => validateGroundedDraft({ ...structured, perspective: 'Theo mình nếu có vị trí thuận lợi, nơi này có thể cháy hàng.' }, article), { code: 'needs_context' });
});

test('free writing uses real RSS without a key or any API request and does not claim project linkage', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Free mode must never call an API'); });
  const result = await buildDraft(article, { writingMode: 'free', projectContext });
  assert.equal(result.provider, 'local');
  assert.equal(result.usage, undefined);
  assert.equal(result.summary, article.summary);
  assert.ok(result.perspective.length > 30);
  assert.equal(result.contextUsed, false);
  assert.ok(!result.content.includes('Nhà mẫu kiểm thử'));
  assert.ok(result.reviewFlags.some(flag => flag.includes('không gọi ChatGPT')));
});

test('OpenAI receives relevant bounded context once and returns structured personal assessment', async (t) => {
  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  t.after(() => { if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey; });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    calls++;
    const body = JSON.parse(options.body);
    const input = JSON.parse(body.input[1].content);
    assert.ok(input.projectContext.includes('Nhà mẫu kiểm thử'));
    assert.ok(!input.projectContext.includes('https://'));
    assert.equal(body.tools, undefined);
    assert.equal(body.max_output_tokens, 1200);
    return { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(structured) }] }] }) };
  });
  const result = await buildDraft(article, { projectContext });
  assert.equal(calls, 1);
  assert.equal(result.perspective, structured.perspective);
  assert.deepEqual(result.contextSources, []); // Model declined to use supplied context.
});

test('a first-person introduction before conditional bullets is accepted without weakening outcome checks', () => {
  const result = validateGroundedDraft({ ...structured, perspective: `Với mình, đây là những điều đáng theo dõi:\n- ${structured.perspective}\n- Nếu tiện ích đáp ứng nhu cầu thực tế, khu vực có thể hấp dẫn hơn về tính đáng sống.` }, article);
  assert.ok(result.perspective.includes('Với mình'));
  assert.throws(() => validateGroundedDraft({ ...structured, perspective: `Với mình, đây là những điều đáng theo dõi:\n- ${structured.perspective}\n- Khu vực sẽ tăng giá.` }, article), { code: 'needs_context' });
});


test('benefit schema reuses RSS facts and assembles explicit conditional opinions and normalized hashtags locally', () => {
  const { summary, perspective, facts, ...rest } = structured;
  const result = validateGroundedDraft({ ...rest, benefits: [{ condition: 'tiện ích được triển khai theo nhu cầu cư dân', benefit: 'cải thiện tính thuận tiện của nơi ở' }], hashtags: [' #AnPhu ', '#BatDongSan'] }, article);
  assert.equal(result.summary, article.summary);
  assert.ok(result.perspective.includes('Nếu tiện ích'));
  assert.ok(result.perspective.includes('có thể cải thiện'));
  assert.deepEqual(result.hashtags, ['#AnPhu', '#BatDongSan']);
  assert.ok(result.facts[0].includes(article.summary));
  assert.throws(() => validateGroundedDraft({ ...rest, benefits: [{ condition: '', benefit: 'cam kết lợi nhuận' }] }, article), { code: 'invalid_response' });
});
