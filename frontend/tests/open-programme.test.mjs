import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/lib/api/programmes.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

/** Loads the module with a stubbed API returning the supplied programme payloads. */
function load(payload) {
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => {
      if (name === './config') return { getApiBaseUrl: () => 'http://django.test/api/' };
      if (name === './unavailable') return { reportUnavailable() {}, missingApiBaseUrl: '' };
      return require(name);
    },
    URL, AbortSignal, Object, Array, JSON,
    fetch: async () => payload === null
      ? { ok: false }
      : { ok: true, json: async () => payload },
  });
  return exports;
}

const programme = (slug, status) => ({
  id: slug.length, name: slug, slug, pillar: 'sama', description: 'x', status,
});

test('the call to action points at the first programme accepting participants', async () => {
  const { getOpenProgramme } = load([
    programme('lawtency', 'development'),
    programme('signals', 'open'),
    programme('confidence', 'register_interest'),
  ]);
  const open = await getOpenProgramme();
  assert.equal(open?.slug, 'signals');
});

test('a register-interest programme counts as open when nothing else is', async () => {
  const { getOpenProgramme } = load([
    programme('lawtency', 'development'),
    programme('confidence', 'register_interest'),
  ]);
  const open = await getOpenProgramme();
  assert.equal(open?.slug, 'confidence');
});

test('nothing open yields null so the caller falls back to the listing', async () => {
  const { getOpenProgramme } = load([
    programme('lawtency', 'development'),
    programme('career', 'upcoming'),
  ]);
  assert.equal(await getOpenProgramme(), null);
});

test('an unreachable backend yields null rather than throwing', async () => {
  const { getOpenProgramme } = load(null);
  assert.equal(await getOpenProgramme(), null);
});
