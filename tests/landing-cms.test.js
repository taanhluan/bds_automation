import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { defaultLandingCms, defaultLandingProjects, validateLandingCms } from '../server/landing.js';
import { createStore } from '../server/store.js';

test('validateLandingCms sanitizes inputs, enforces length limits and strips malicious urls', () => {
  const defaults = defaultLandingCms;
  const input = {
    hero: {
      eyebrow: '   Tiêu đề ngắn   ',
      titleMain: 'a'.repeat(200),
      titleAccent: 'b'.repeat(100),
      facebookUrl: 'javascript:alert(1)',
    },
    connect: {
      contactUrl: 'https://www.facebook.com/vuong.nguyen.8694',
    },
    projects: [
      {
        id: 'test-1',
        category: 'URBAN',
        title: 'Dự án test',
        description: 'Mô tả',
        image: 'javascript:bad',
        tags: ['Tag 1', 'Tag 2'],
      },
    ],
  };

  const validated = validateLandingCms(input, defaults);
  assert.equal(validated.hero.eyebrow, 'Tiêu đề ngắn');
  assert.equal(validated.hero.titleMain.length, 100);
  assert.equal(validated.hero.titleAccent.length, 60);
  // javascript: URL must be rejected and fallback to default
  assert.equal(validated.hero.facebookUrl, defaults.hero.facebookUrl);
  // valid https: URL is accepted
  assert.equal(validated.connect.contactUrl, 'https://www.facebook.com/vuong.nguyen.8694');
  // projects validation
  assert.equal(validated.projects.length, 1);
  assert.equal(validated.projects[0].title, 'Dự án test');
  assert.equal(validated.projects[0].image, '/images/architecture.webp'); // strips malicious url
  assert.deepEqual(validated.projects[0].tags, ['Tag 1', 'Tag 2']);
});

test('store landingCms persists project CRUD changes and supports reset to default', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-test-'));
  try {
    const store = createStore(tmpDir);
    const initial = store.landingCms();
    assert.equal(initial.hero.titleMain, defaultLandingCms.hero.titleMain);
    assert.equal(initial.projects.length, defaultLandingProjects.length);

    // Update with customized projects (Create / Replace / Update)
    const customProjects = [
      {
        id: 'new-tower',
        category: 'LUXURY LIVING',
        title: 'Tháp xanh ven sông',
        description: 'Trải nghiệm không gian sống thượng lưu.',
        image: '/api/public/landing/assets/landing-test.webp',
        tags: ['Thượng lưu', 'Ven sông'],
        concept: false,
        linkUrl: '#du-an',
      },
      ...defaultLandingProjects.slice(0, 2),
    ];

    const updated = store.saveLandingCms({
      ...initial,
      projects: customProjects,
    });

    assert.equal(updated.projects.length, 3);
    assert.equal(updated.projects[0].id, 'new-tower');
    assert.equal(updated.projects[0].title, 'Tháp xanh ven sông');

    // Reload from store
    const reloaded = store.landingCms();
    assert.equal(reloaded.projects.length, 3);
    assert.equal(reloaded.projects[0].title, 'Tháp xanh ven sông');

    // Test Delete (remove 1 project)
    const afterDelete = store.saveLandingCms({
      ...reloaded,
      projects: reloaded.projects.slice(1),
    });
    assert.equal(afterDelete.projects.length, 2);

    // Test reset
    const reset = store.resetLandingCms();
    assert.equal(reset.projects.length, defaultLandingProjects.length);
    assert.equal(reset.projects[0].title, defaultLandingProjects[0].title);

    store.close();
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('sharp auto scale and resize produces 1600x1067 WebP image', async () => {
  // Create a raw test PNG with arbitrary dimension (e.g. 800x1200 portrait)
  const inputBuffer = await sharp({
    create: {
      width: 800,
      height: 1200,
      channels: 4,
      background: { r: 50, g: 100, b: 150, alpha: 1 },
    },
  }).png().toBuffer();

  // Run the same resizing logic as /api/landing/upload
  const resizedBuffer = await sharp(inputBuffer)
    .rotate()
    .resize(1600, 1067, { fit: 'cover', position: 'center' })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  const metadata = await sharp(resizedBuffer).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 1067);
});
