import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest } from 'next/server.js';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/app/api/contact/route.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function handler(fetch, configured = true) {
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: name => name === '@/lib/api/config'
      ? { getApiBaseUrl: () => { if (!configured) throw Error('not configured'); return 'http://django.test/api/'; } }
      : require(name),
    fetch, URL, AbortSignal, File, FormData, Object, process: { env: { NODE_ENV: 'production' } },
  });
  return exports;
}

const enquiry = {
  fullName: 'Amina Rahim', email: 'amina@example.test', enquiryType: 'creative',
  subject: 'Creative collaboration proposal', message: 'We would like to collaborate.', consent: 'true',
};

function request(fields = enquiry, { origin = 'https://sakafat.test', attachment } = {}) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  if (attachment) body.set('attachment', attachment, 'sample.txt');
  return new NextRequest('https://sakafat.test/api/contact', { method: 'POST', headers: { origin }, body });
}

test('forwards a complete enquiry to Django as multipart form data', async () => {
  let seen;
  const route = handler(async (url, options) => {
    assert.equal(String(url), 'http://django.test/api/contact/');
    seen = options.body;
    return Response.json({ id: 1 }, { status: 201 });
  });
  const response = await route.POST(request({ ...enquiry, phone: '+44 7700 900123', portfolio: 'https://example.test/work' }));

  assert.equal(response.status, 200);
  assert.equal(seen.get('full_name'), 'Amina Rahim');
  assert.equal(seen.get('enquiry_type'), 'creative');
  assert.equal(seen.get('phone_number'), '+44 7700 900123');
  assert.equal(seen.get('relevant_link'), 'https://example.test/work');
  assert.equal(seen.get('consent'), 'true');
});

test('rejects cross-origin submissions before contacting Django', async () => {
  const response = await handler(() => { throw Error('must not fetch'); })
    .POST(request(enquiry, { origin: 'https://evil.test' }));
  assert.equal(response.status, 403);
});

test('rejects an enquiry without consent before contacting Django', async () => {
  const response = await handler(() => { throw Error('must not fetch'); })
    .POST(request({ ...enquiry, consent: 'false' }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).errors.consent, 'Please confirm you agree before sending.');
});

test('rejects an enquiry type that is not offered by the form', async () => {
  const response = await handler(() => { throw Error('must not fetch'); })
    .POST(request({ ...enquiry, enquiryType: 'hacked' }));
  assert.equal(response.status, 400);
  assert.ok((await response.json()).errors.enquiryType);
});

test('reports missing required fields without contacting Django', async () => {
  const response = await handler(() => { throw Error('must not fetch'); })
    .POST(request({ email: 'amina@example.test', enquiryType: 'general', consent: 'true' }));
  assert.equal(response.status, 400);
  const { errors } = await response.json();
  assert.deepEqual(Object.keys(errors).sort(), ['fullName', 'message', 'subject']);
});

test('rejects an attachment larger than the stated limit', async () => {
  const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'sample.txt');
  const response = await handler(() => { throw Error('must not fetch'); })
    .POST(request(enquiry, { attachment: big }));
  assert.equal(response.status, 400);
  assert.ok((await response.json()).errors.attachment);
});

test('maps Django field errors back to the form field names', async () => {
  const route = handler(async () => Response.json({ email: ['Enter a valid email address.'] }, { status: 400 }));
  const response = await route.POST(request({ ...enquiry, email: 'not-an-email' }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).errors.email, 'Enter a valid email address.');
});

test('does not echo the stored Django record back to the browser', async () => {
  const route = handler(async () => Response.json({ id: 7, email: 'amina@example.test', attachment: '/media/enquiries/sample.txt' }, { status: 201 }));
  const body = await (await route.POST(request())).text();
  assert.doesNotMatch(body, /media\/enquiries|amina@example\.test/);
});

test('reports an unreachable backend without losing the submission notice', async () => {
  const route = handler(async () => { throw Error('offline'); });
  const response = await route.POST(request());
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /try again/i);
});

test('reports unavailable enquiries when Django is not configured', async () => {
  const route = handler(() => { throw Error('must not fetch'); }, false);
  const response = await route.POST(request());
  assert.equal(response.status, 503);
});
