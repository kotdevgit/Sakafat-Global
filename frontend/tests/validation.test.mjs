import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const load = path => {
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  vm.runInNewContext(code, { exports, Object, Array, RegExp, URL });
  return exports;
};

const contact = load('../src/lib/validation/contact.ts');
const auth = load('../src/lib/validation/auth.ts');

test('a name may not contain digits or symbols', () => {
  for (const value of ['Amina 4', 'Amina<script>', 'Amina_Rahim', '123']) {
    assert.ok(contact.validateField('fullName', value), `${value} was accepted`);
  }
});

test('a name may be written in any script, with the usual joiners', () => {
  for (const value of ['Muhammad Ali-Khan', 'O’Brien', 'St. John Smith', 'امینہ رحیم']) {
    assert.equal(contact.validateField('fullName', value), null, `${value} was rejected`);
  }
});

test('typing a digit into a name leaves nothing behind', () => {
  assert.equal(contact.filterValue('fullName', 'Amina4 Rahim9'), 'Amina Rahim');
  assert.equal(contact.filterValue('fullName', 'Amina<>#Rahim'), 'AminaRahim');
});

test('typing a letter into a phone number leaves nothing behind', () => {
  assert.equal(contact.filterValue('phone', '+92abc300'), '+92300');
  // A + is only meaningful as a country-code prefix.
  assert.equal(contact.filterValue('phone', '+92+300+1'), '+923001');
});

test('free-text fields keep the punctuation a real enquiry needs', () => {
  const text = 'Budget: $5,000 — see item #3!';
  for (const field of ['subject', 'message', 'email', 'portfolio']) {
    assert.equal(contact.filterValue(field, text), text);
  }
});

test('invisible characters are stripped from free text', () => {
  assert.equal(contact.filterValue('message', 'He\u200Bllo\u202Ethere'), 'Hellothere');
  // A subject is a single line, so pasted newlines collapse to spaces.
  assert.equal(contact.filterValue('subject', 'Line one\nLine two'), 'Line one Line two');
  // A message keeps its paragraphs.
  assert.equal(contact.filterValue('message', 'Line one\nLine two'), 'Line one\nLine two');
});

test('subject and message are held to a minimum length', () => {
  assert.ok(contact.validateField('subject', 'Hi'));
  assert.ok(contact.validateField('message', 'Too short'));
  assert.ok(contact.validateField('subject', '......'), 'a subject with no letters was accepted');
  assert.equal(contact.validateField('subject', 'Collaboration'), null);
  assert.equal(contact.validateField('message', 'We would like to collaborate on a series.'), null);
});

test('name, phone and email are required; the rest are optional', () => {
  for (const field of ['fullName', 'phone', 'email', 'enquiryType', 'subject', 'message']) {
    assert.ok(contact.validateField(field, ''), `${field} was not required`);
  }
  for (const field of ['organisation', 'location', 'portfolio']) {
    assert.equal(contact.validateField(field, ''), null, `${field} was required`);
  }
});

test('a phone number needs a plausible number of digits', () => {
  assert.ok(contact.validateField('phone', '12345'));
  assert.ok(contact.validateField('phone', '+' + '9'.repeat(20)));
  assert.equal(contact.validateField('phone', '+92 300 1234567'), null);
  assert.equal(contact.validateField('phone', '(042) 3577 1234'), null);
});

test('character limits are enforced per field', () => {
  assert.ok(contact.validateField('fullName', 'A'.repeat(151)));
  assert.equal(contact.validateField('fullName', 'A'.repeat(150)), null);
  assert.equal(contact.validateField('subject', 'S'.repeat(100)), null);
  assert.ok(contact.validateField('subject', 'S'.repeat(101)));
  assert.equal(contact.validateField('message', 'M'.repeat(500)), null);
  assert.ok(contact.validateField('message', 'M'.repeat(501)));
});

test('a value is capped however it arrives, not only by typing', () => {
  assert.equal(contact.filterValue('subject', 'S'.repeat(150)).length, 100);
  assert.equal(contact.filterValue('message', 'M'.repeat(800)).length, 500);
  assert.equal(contact.filterValue('fullName', 'A'.repeat(200)).length, 150);
});

test('only web links are accepted as a portfolio', () => {
  assert.ok(contact.validateField('portfolio', 'javascript:alert(1)'));
  assert.ok(contact.validateField('portfolio', 'example.test'));
  assert.equal(contact.validateField('portfolio', 'https://example.test/work'), null);
});

test('registering enforces a username shape, signing in does not', () => {
  assert.ok(auth.validateAuthField('username', 'a b', { context: 'register' }));
  assert.ok(auth.validateAuthField('username', 'ab', { context: 'register' }));
  // An account created before the rules tightened must still be able to log in.
  assert.equal(auth.validateAuthField('username', 'ab', { context: 'login' }), null);
});

test('a new password must clear the rules Django applies', () => {
  assert.ok(auth.validateAuthField('password', 'short', { context: 'register' }));
  assert.ok(auth.validateAuthField('password', '12345678', { context: 'register' }));
  assert.ok(auth.validateAuthField('password', 'aminarahim1', { context: 'register', username: 'aminarahim' }));
  assert.equal(auth.validateAuthField('password', 'heritage-archive-92', { context: 'register' }), null);
});

test('an existing password is not re-judged at sign-in', () => {
  assert.equal(auth.validateAuthField('password', 'short', { context: 'login' }), null);
  assert.ok(auth.validateAuthField('password', '', { context: 'login' }));
});

test('the confirmation field must match', () => {
  assert.ok(auth.validateAuthField('confirmPassword', 'other', { password: 'secret-pass-1' }));
  assert.equal(auth.validateAuthField('confirmPassword', 'secret-pass-1', { password: 'secret-pass-1' }), null);
});

test('a verification code is exactly six digits', () => {
  assert.ok(auth.validateAuthField('otp', '12345'));
  assert.ok(auth.validateAuthField('otp', 'abcdef'));
  assert.equal(auth.validateAuthField('otp', '123456'), null);
  assert.equal(auth.filterAuthValue('otp', '1a2b3c4d5e6f7'), '123456');
});

test('a username cannot be typed with spaces', () => {
  assert.equal(auth.filterAuthValue('username', 'amina rahim!'), 'aminarahim');
});

test('passwords are never filtered, only judged', () => {
  const password = 'p a s s!@#$%';
  assert.equal(auth.filterAuthValue('password', password), password);
});
