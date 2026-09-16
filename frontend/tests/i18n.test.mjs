import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { dictionaries, loadModule } from './helpers/load.mjs';

const config = loadModule('lib/i18n/config.ts');
const dictionary = loadModule('lib/i18n/dictionary.ts');
const contact = loadModule('lib/validation/contact.ts');
const auth = loadModule('lib/validation/auth.ts');
const proxy = loadModule('proxy.ts');

/** Every leaf in a dictionary, as dotted paths, so two can be compared. */
function paths(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => paths(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => paths(item, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

/** The {names} a string interpolates. */
const placeholders = text => [...String(text).matchAll(/\{(\w+)\}/gu)].map(match => match[1]).sort();

function leaf(dict, path) {
  return path.split('.').reduce((value, part) => {
    const index = part.match(/^(.*)\[(\d+)\]$/u);
    return index ? value[index[1]][Number(index[2])] : value[part];
  }, dict);
}

test('both languages carry exactly the same set of strings', () => {
  const en = paths(dictionaries.en);
  const ur = paths(dictionaries.ur);
  assert.deepEqual(en.filter(path => !ur.includes(path)), [], 'missing from Urdu');
  assert.deepEqual(ur.filter(path => !en.includes(path)), [], 'not present in English');
});

// A dropped or renamed placeholder is invisible until a page renders a literal
// "{name}" at someone, so it is checked rather than trusted.
test('every interpolated value survives translation', () => {
  for (const path of paths(dictionaries.en)) {
    assert.deepEqual(
      placeholders(leaf(dictionaries.ur, path)),
      placeholders(leaf(dictionaries.en, path)),
      `${path} does not interpolate the same values in both languages`,
    );
  }
});

// An email address reads the same in both languages; prose does not. Anything
// else still sitting in English is a string nobody translated.
test('no sentence is left untranslated', () => {
  const sameOnPurpose = new Set(['footer.contact.email']);
  const untranslated = paths(dictionaries.en).filter(path => {
    if (sameOnPurpose.has(path)) return false;
    const english = String(leaf(dictionaries.en, path));
    // Separators, numbers and strings made only of {placeholders} carry no words.
    if (!/\p{L}/u.test(english.replace(/\{\w+\}/gu, ''))) return false;
    return leaf(dictionaries.ur, path) === english;
  });
  assert.deepEqual(untranslated, []);
});

test('a locale is added to a path and taken off again', () => {
  assert.equal(config.localePath('ur', '/'), '/ur');
  assert.equal(config.localePath('ur', '/programs'), '/ur/programs');
  assert.equal(config.localePath('en', '/contact?type=media#enquiry-form'), '/en/contact?type=media#enquiry-form');
  // Anything that is not a site path belongs to someone else.
  assert.equal(config.localePath('ur', 'https://example.test'), 'https://example.test');
  assert.equal(config.stripLocale('/ur/programs/signals'), '/programs/signals');
  assert.equal(config.stripLocale('/ur'), '/');
  // A first segment that is not a language is part of the path, not a locale.
  assert.equal(config.stripLocale('/programs'), '/programs');
});

test('an unknown language falls back to English rather than failing', () => {
  assert.equal(dictionary.getDictionary('fr'), dictionaries.en);
  assert.equal(dictionary.getDictionary('ur'), dictionaries.ur);
});

test('placeholders are filled, and unknown ones left alone', () => {
  assert.equal(dictionary.format('Explore the {pillar} pillar', { pillar: 'Sama' }), 'Explore the Sama pillar');
  assert.equal(dictionary.format('{count} shown: {filter}.', { count: 3, filter: 'Open Now' }), '3 shown: Open Now.');
  assert.equal(dictionary.format('{unknown}', {}), '{unknown}');
});

test('a field error is reported in the language being read', () => {
  const issue = contact.validateField('fullName', '');
  assert.equal(contact.resolveContactMessage(dictionaries.en, 'fullName', issue), 'Full Name is required.');
  assert.equal(contact.resolveContactMessage(dictionaries.ur, 'fullName', issue), 'پورا نام ضروری ہے۔');
});

test('no resolved message leaves a placeholder unfilled', () => {
  const cases = [
    ['fullName', 'A'.repeat(200)],
    ['subject', 'Hi'],
    ['phone', '123'],
    ['phone', '1'.repeat(20)],
  ];
  for (const [locale, dict] of Object.entries(dictionaries)) {
    for (const [field, value] of cases) {
      const issue = contact.validateField(field, value);
      assert.ok(issue, `${field} "${value}" produced no issue`);
      const text = contact.resolveContactMessage(dict, field, issue);
      assert.doesNotMatch(text, /\{\w+\}/u, `${locale}/${field} left a placeholder`);
    }
    const otp = auth.validateAuthField('otp', '123');
    assert.doesNotMatch(auth.resolveAuthMessage(dict, otp), /\{\w+\}/u);
  }
});

const ask = (path, headers = {}, cookie = '') =>
  new NextRequest(`https://sakafat.test${path}`, {
    headers: { ...headers, ...(cookie ? { cookie } : {}) },
  });

test('a path without a language is sent to one', () => {
  const response = proxy.proxy(ask('/programs'));
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get('location')).pathname, '/en/programs');
});

test('a path that already names a language is left alone', () => {
  assert.equal(proxy.proxy(ask('/ur/programs')).headers.get('location'), null);
  assert.equal(proxy.proxy(ask('/en')).headers.get('location'), null);
});

test('the query and fragment of a redirected address are kept', () => {
  const response = proxy.proxy(ask('/contact?type=media&subject=Press'));
  const location = new URL(response.headers.get('location'));
  assert.equal(location.pathname, '/en/contact');
  assert.equal(location.searchParams.get('subject'), 'Press');
});

test('the browser’s own language preference is honoured', () => {
  const response = proxy.proxy(ask('/', { 'accept-language': 'ur-PK,ur;q=0.9,en;q=0.5' }));
  assert.equal(new URL(response.headers.get('location')).pathname, '/ur');
});

test('a weaker preference does not beat a stronger one', () => {
  const response = proxy.proxy(ask('/', { 'accept-language': 'ur;q=0.3,en-GB;q=0.9' }));
  assert.equal(new URL(response.headers.get('location')).pathname, '/en');
});

test('a language the site does not publish falls back to English', () => {
  const response = proxy.proxy(ask('/', { 'accept-language': 'fr-FR,fr;q=0.9' }));
  assert.equal(new URL(response.headers.get('location')).pathname, '/en');
});

// A choice made on the site is more deliberate than a browser setting, so it wins.
test('a remembered choice outranks the browser’s preference', () => {
  const response = proxy.proxy(ask('/about', { 'accept-language': 'en-GB,en;q=0.9' }, 'sakafat_locale=ur'));
  assert.equal(new URL(response.headers.get('location')).pathname, '/ur/about');
});
