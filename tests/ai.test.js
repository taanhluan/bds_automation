import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { buildDraft, parseResponseOutput, validateGroundedDraft } from '../server/ai.js';
import { escapeXml, generateBackground, makeCoverSvg, renderCover, wrapTitle } from '../server/images.js';

const article = {
  title: 'Khu nhà ở tăng diện tích cây xanh',
  summary: 'Một khu nhà ở điều chỉnh thiết kế để bổ sung diện tích cây xanh và không gian sinh hoạt chung.',
  source: 'Báo thử nghiệm',
  url: 'https://example.org/nguon',
};
const draft = {
  status: 'ready',
  title: 'Thêm mảng xanh cho không gian sống',
  content: 'Một khu nhà ở điều chỉnh thiết kế để bổ sung diện tích cây xanh và không gian sinh hoạt chung. Bạn quan tâm điều gì khi chọn nơi ở?',
  facts: [{ statement: 'Thiết kế được điều chỉnh để thêm cây xanh.', evidence: 'điều chỉnh thiết kế để bổ sung diện tích cây xanh' }],
  reviewFlags: [],
  imageBrief: 'Minh họa khu nhà tưởng tượng với cây xanh.',
};

function withKey(context, key) {
  const previous = process.env.OPENAI_API_KEY;
  if (key === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = key;
  context.after(() => {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  });
}

test('demo draft is explicitly fictional and does not call any provider', async (context) => {
  withKey(context, undefined);
  context.mock.method(globalThis, 'fetch', () => { throw new Error('Demo must never use the network'); });
  const result = await buildDraft({ ...article, isDemo: true });
  assert.equal(result.provider, 'demo');
  assert.match(result.content, /Nội dung mẫu — không phải tin thực tế/u);
  assert.doesNotMatch(result.content, /https?:\/\//u);
  assert.deepEqual(result.facts, []);
});

test('real generation without a key reports missing_key and makes no request', async (context) => {
  withKey(context, undefined);
  context.mock.method(globalThis, 'fetch', () => { throw new Error('Missing key must never use the network'); });
  await assert.rejects(buildDraft(article), { code: 'missing_key' });
  await assert.rejects(generateBackground('A building'), { code: 'missing_key' });
});

test('real draft uses Responses structured output and validates RSS evidence', async (context) => {
  withKey(context, 'local-test-key');
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.text.format.type, 'json_schema');
    assert.equal(body.text.format.strict, true);
    assert.equal(body.max_output_tokens, 1200);
    assert.equal(body.tools, undefined);
    assert.equal(JSON.parse(body.input[1].content).summary, article.summary);
    assert.equal(body.input.some((item) => item.content.includes(article.url)), false);
    return { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(draft) }] }], usage: { input_tokens: 12, output_tokens: 34 } }) };
  });
  const result = await buildDraft(article);
  assert.equal(result.provider, 'openai');
  assert.equal(result.title, draft.title);
  assert.deepEqual(result.usage, { inputTokens: 12, outputTokens: 34 });
  assert.match(result.facts[0], /RSS:/u);
  assert.match(result.reviewFlags[0], /tóm tắt RSS/u);
});

test('insufficient summary stops before a paid request', async (context) => {
  withKey(context, 'local-test-key');
  context.mock.method(globalThis, 'fetch', () => { throw new Error('Insufficient context must not use the network'); });
  await assert.rejects(buildDraft({ ...article, summary: 'Quá ngắn' }), { code: 'needs_context' });
});

test('grounding rejects fabricated evidence, cross-field splices and new numbers', () => {
  assert.throws(() => validateGroundedDraft({ ...draft, facts: [{ statement: 'Giá tăng.', evidence: 'Giá tăng 20% trong quý này.' }] }, article), { code: 'needs_context' });
  assert.throws(() => validateGroundedDraft({ ...draft, facts: [{ statement: 'Tin mới.', evidence: `${article.title}\n${article.summary.slice(0, 12)}` }] }, article), { code: 'needs_context' });
  assert.throws(() => validateGroundedDraft({ ...draft, content: `${draft.content} Diện tích tăng 25%.` }, article), { code: 'needs_context' });
  assert.throws(() => validateGroundedDraft({ ...draft, status: 'needs_context' }, article), { code: 'needs_context' });
});

test('compact source references resolve to actual RSS fields and reject unknown references', () => {
  const compact = { ...draft, facts: [{ statement: 'Thiết kế có thêm cây xanh.', sourceField: 'summary' }] };
  assert.ok(validateGroundedDraft(compact, article).facts[0].includes(article.summary));
  assert.throws(() => validateGroundedDraft({ ...compact, facts: [{ statement: 'Tin mới.', sourceField: 'invented' }] }, article), { code: 'needs_context' });
});

test('refused, incomplete and malformed provider output is rejected', () => {
  assert.throws(() => parseResponseOutput({ status: 'incomplete', output: [] }), { code: 'incomplete_response' });
  assert.throws(() => parseResponseOutput({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }] }), { code: 'refusal' });
  assert.throws(() => parseResponseOutput({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'not JSON' }] }] }), { code: 'invalid_response' });
});

test('network failure reports uncertainty and never silently retries', async (context) => {
  withKey(context, 'local-test-key');
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => { calls += 1; throw new TypeError('network error'); });
  await assert.rejects(generateBackground('Minh họa khu nhà'), { code: 'uncertain' });
  assert.equal(calls, 1);
});

test('image request uses a single square PNG and accepts base64 only', async (context) => {
  withKey(context, 'local-test-key');
  const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#204536' } }).png().toBuffer();
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/images/generations');
    const body = JSON.parse(options.body);
    assert.equal(body.n, 1);
    assert.equal(body.size, '1024x1024');
    assert.equal(body.output_format, 'png');
    assert.match(body.prompt, /Do not depict or recreate/u);
    return { ok: true, json: async () => ({ data: [{ b64_json: png.toString('base64') }], usage: { total_tokens: 3 } }) };
  });
  const result = await generateBackground('Một công trình tưởng tượng');
  assert.deepEqual(result.buffer, png);
  assert.equal(result.usage.total_tokens, 3);
});

test('covers escape source text and retain disclosure labels', async () => {
  const malicious = 'Nhà & đất <script>alert("x")</script>';
  const svg = makeCoverSvg({ title: malicious, topic: '<test>', isDemo: true });
  assert.equal(escapeXml('<&"\''), '&lt;&amp;&quot;&apos;');
  assert.doesNotMatch(svg, /<script>/u);
  assert.match(svg, /&lt;script&gt;/u);
  assert.match(svg, /Hình minh họa/u);
  assert.match(svg, /Nội dung mẫu — không phải tin thực tế/u);
  const png = await renderCover({ title: malicious, isDemo: true });
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.width, 1080);
  assert.equal(metadata.height, 1080);
  assert.match(makeCoverSvg({ title: 'Tiêu đề', hasBackground: true }), /Ảnh minh họa AI/u);
});

test('long cover titles wrap to the fixed line budget', () => {
  const lines = wrapTitle('Một góc nhìn về thị trường bất động sản Việt Nam '.repeat(20));
  assert.ok(lines.length <= 5);
  assert.ok(lines.every((line) => line.length > 0));
  assert.ok(wrapTitle('a'.repeat(220)).length <= 5);
});
