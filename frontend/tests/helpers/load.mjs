import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const nodeRequire = createRequire(import.meta.url);
const src = name => new URL(`../../src/${name}`, import.meta.url);

const compile = url => ts.transpileModule(readFileSync(url, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

/**
 * Loads a TypeScript module from src/ into a sandbox, resolving the handful of
 * imports the validation and route modules actually make. The dictionaries are
 * the real JSON files, so a test that checks a message is checking the words the
 * site would really show.
 */
const cache = new Map();

export function loadModule(name, extraRequire = () => undefined, sandbox = null) {
  // A module given its own sandbox is one under test with stubs wired into it;
  // those are never shared, so only plain loads are cached.
  const cached = sandbox ? undefined : cache.get(name);
  if (cached) return cached;

  const exports = {};
  if (!sandbox) cache.set(name, exports);
  const require = request => {
    const resolved = extraRequire(request);
    if (resolved !== undefined) return resolved;
    if (request.endsWith('.json')) {
      return nodeRequire(new URL(request.replace('./', 'lib/i18n/'), src('')).pathname);
    }
    if (request === './config' || request === '@/lib/i18n/config') return loadModule('lib/i18n/config.ts');
    if (request === '@/lib/i18n/dictionary') return loadModule('lib/i18n/dictionary.ts');
    if (request === '@/lib/validation/contact') return loadModule('lib/validation/contact.ts');
    if (request === '@/lib/validation/auth') return loadModule('lib/validation/auth.ts');
    if (request === '@/lib/i18n/request') return loadModule('lib/i18n/request.ts');
    return nodeRequire(request);
  };

  vm.runInNewContext(compile(src(name)), {
    exports, require, Object, Array, RegExp, URL, String, Number, JSON, Boolean, Math, ...sandbox,
  });
  return exports;
}

export const dictionaries = {
  en: nodeRequire('../../src/lib/i18n/dictionaries/en.json'),
  ur: nodeRequire('../../src/lib/i18n/dictionaries/ur.json'),
};
