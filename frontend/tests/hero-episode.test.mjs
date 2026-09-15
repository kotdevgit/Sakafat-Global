import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/lib/api/episodes.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function load() {
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => name === './config' ? { getApiBaseUrl: () => 'http://django.test/api/' } : require(name),
    URL, AbortSignal, Object, Array, fetch: async () => { throw Error('not used'); },
  });
  return exports;
}

const episode = (overrides = {}) => ({
  id: 1, title: 'A Culture in Motion', slug: 'culture-in-motion',
  category: 'documentary', categoryLabel: 'Documentary', description: 'People and places.',
  imageUrl: 'http://django.test/media/episodes/image1.png',
  imageWidth: 1600, imageHeight: 1200, heroImageUrl: null, imageAlt: '', videoUrl: null,
  ...overrides,
});

const CARD = 'http://django.test/media/episodes/image1.png';
const PORTRAIT = 'http://django.test/media/episodes/hero/upright.png';

test('a portrait upload is preferred over centre-cropping the card image', () => {
  const { heroPhotoUrl } = load();
  assert.equal(heroPhotoUrl(episode({ heroImageUrl: PORTRAIT })), PORTRAIT);
});

test('without a portrait upload the card image is used', () => {
  const { heroPhotoUrl } = load();
  assert.equal(heroPhotoUrl(episode()), CARD);
});

test('a card-sized photo is still used, soft rather than withheld', () => {
  const { heroPhotoUrl } = load();
  // The real dimensions of the originally hardcoded images.
  assert.equal(heroPhotoUrl(episode({ imageWidth: 400, imageHeight: 222 })), CARD);
});

test('a portrait upload carries the hero even when there is no card image', () => {
  const { heroPhotoUrl } = load();
  assert.equal(heroPhotoUrl(episode({ imageUrl: null, heroImageUrl: PORTRAIT })), PORTRAIT);
});

test('an episode with no artwork at all falls back to the supplied hero image', () => {
  const { heroPhotoUrl } = load();
  assert.equal(heroPhotoUrl(episode({ imageUrl: null })), null);
});

test('the hero slot keeps the artwork proportions', () => {
  const { heroImageWidth, heroImageHeight } = load();
  assert.equal(heroImageWidth, 520);
  assert.equal(heroImageHeight, 594);
});
