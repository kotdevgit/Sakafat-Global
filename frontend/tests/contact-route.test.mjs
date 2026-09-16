import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { loadModule } from './helpers/load.mjs';

/**
 * The route shares its field rules with the browser form and its wording with
 * the rest of the site, so both are loaded for real; only Django's address is
 * stubbed, and only so the test can assert what is sent there.
 */
function handler(fetch, configured = true) {
  return loadModule('app/api/contact/route.ts', name => {
    if (name === '@/lib/api/config') {
      return { getApiBaseUrl: () => { if (!configured) throw Error('not configured'); return 'http://django.test/api/'; } };
    }
    return undefined;
  }, { fetch, AbortSignal, File, FormData, process: { env: { NODE_ENV: 'production' } } });
}

const enquiry = {
  fullName: 'Amina Rahim', email: 'amina@example.test', phone: '+92 300 1234567',
  enquiryType: 'creative', subject: 'Creative collaboration proposal',
  message: 'We would like to collaborate on a heritage music series.', consent: 'true',
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
  const response = await route.POST(request({ ...enquiry, portfolio: 'https://example.test/work' }));

  assert.equal(response.status, 200);
  assert.equal(seen.get('full_name'), 'Amina Rahim');
  assert.equal(seen.get('enquiry_type'), 'creative');
  assert.equal(seen.get('phone_number'), '+92 300 1234567');
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
  assert.deepEqual(Object.keys(errors).sort(), ['fullName', 'message', 'phone', 'subject']);
});

test('rejects an attachment larger than the stated limit', async () => {
  const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'sample.txt');
  const response = await handler(() => { throw Error('must not fetch'); })
    .POST(request(enquiry, { attachment: big }));
  assert.equal(response.status, 400);
  assert.ok((await response.json()).errors.attachment);
});

// The submission passes the route's own checks, so Django is what rejects it and
// the mapping from its field names back to the form's is what this exercises.
test('maps Django field errors back to the form field names', async () => {
  const route = handler(async () => Response.json({ phone_number: ['Enter a reachable number.'] }, { status: 400 }));
  const response = await route.POST(request());
  assert.equal(response.status, 400);
  assert.equal((await response.json()).errors.phone, 'Enter a reachable number.');
});

test('rejects malformed values before contacting Django', async () => {
  const route = handler(() => { throw Error('must not fetch'); });
  const cases = [
    ['fullName', 'Amina 4'],
    ['email', 'not-an-email'],
    ['phone', 'call me'],
    ['location', 'Lahore 54000'],
    ['portfolio', 'javascript:alert(1)'],
    ['message', 'too short'],
  ];
  for (const [field, value] of cases) {
    const response = await route.POST(request({ ...enquiry, [field]: value }));
    assert.equal(response.status, 400, `${field} was accepted`);
    assert.ok((await response.json()).errors[field], `${field} reported no error`);
  }
});

test('accepts names in any script, not just Latin', async () => {
  let seen;
  const route = handler(async (_url, options) => { seen = options.body; return Response.json({ id: 1 }, { status: 201 }); });
  const response = await route.POST(request({ ...enquiry, fullName: 'امینہ رحیم' }));
  assert.equal(response.status, 200);
  assert.equal(seen.get('full_name'), 'امینہ رحیم');
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
