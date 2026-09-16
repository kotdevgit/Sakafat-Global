import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest } from 'next/server.js';

const require = createRequire(import.meta.url);
const compile = path => ts.transpileModule(
  readFileSync(new URL(path, import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

const code = compile('../src/app/api/auth/[action]/route.ts');

/** The route shares its field rules with the browser form; load the real module. */
function validation() {
  const exports = {};
  vm.runInNewContext(compile('../src/lib/validation/auth.ts'), { exports, Object, RegExp, Array });
  return exports;
}
function handler(fetch, configured = true) {
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (name === '@/lib/api/config') return { getApiBaseUrl: () => { if (!configured) throw Error('not configured'); return 'http://django.test/api/'; } };
    if (name === '@/lib/validation/auth') return validation();
    return require(name);
  }, fetch, URL, Buffer, AbortSignal, process: { env: { NODE_ENV: 'production' } } });
  return exports;
}
const context = action => ({ params: Promise.resolve({ action }) });
function request(body, origin = 'https://sakafat.test') {
  return new NextRequest('https://sakafat.test/api/auth/login', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
const credentials = { username: 'test-user', password: 'example-test-password' };

test('login keeps JWT out of response body and sets secure HTTP-only cookie', async () => {
  const access = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+1800 })).toString('base64url')}.signature`;
  const route = handler(async (url, options) => {
    assert.equal(String(url), 'http://django.test/api/login/');
    assert.deepEqual(JSON.parse(options.body), credentials);
    return Response.json({ access, refresh: 'refresh-token-value', user: { username: 'test-user' } });
  });
  const response = await route.POST(request(credentials), context('login'));
  assert.equal(response.status, 200);
  const cookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get('set-cookie')];
  const accessCookie = cookies.find(c => c.includes('sakafat_access='));
  const refreshCookie = cookies.find(c => c.includes('sakafat_refresh='));
  assert.ok(accessCookie, 'access cookie should be set');
  assert.ok(refreshCookie, 'refresh cookie should be set');
  assert.match(accessCookie, /HttpOnly/i); assert.match(accessCookie, /Secure/i); assert.match(accessCookie, /SameSite=lax/i);
  assert.match(refreshCookie, /Path=\/api\/auth/i);
  assert.doesNotMatch(await response.text(), /signature|refresh-token-value/);
});
test('rejects cross-origin login before contacting Django', async () => {
  const response = await handler(() => { throw Error('must not fetch'); }).POST(request(credentials,'https://other.test'),context('login'));
  assert.equal(response.status,403);
});
test('preserves field validation errors without reflecting unrelated backend data',async()=>{
  const response=await handler(async()=>Response.json({email:['An account with this email already exists.'],internal:'hidden'},{status:400})).POST(request({...credentials,email:'qa@example.test'}),context('register'));
  assert.equal(response.status,400); const body=await response.json(); assert.match(body.errors.email,/already exists/); assert.equal(body.internal,undefined);
});
test('missing configuration and offline upstream return safe service errors',async()=>{
  assert.equal((await handler(()=>{throw Error('must not fetch');},false).POST(request(credentials),context('login'))).status,503);
  const response=await handler(()=>{throw Error('private network detail');}).POST(request(credentials),context('login'));
  assert.equal(response.status,503); assert.doesNotMatch(await response.text(),/private network/);
});
test('email verification maps to the Django endpoint and does not create a session',async()=>{
  const response=await handler(async(url,options)=>{assert.equal(String(url),'http://django.test/api/verify_otp/');assert.deepEqual(JSON.parse(options.body),{username:'test-user',otp:'123456'});return Response.json({message:'OTP_VERIFIED'});}).POST(request({username:'test-user',otp:'123456'}),context('verify'));
  assert.equal(response.status,200);assert.equal(response.headers.get('set-cookie'),null);
});
test('rejects expired login tokens and unknown endpoints',async()=>{
  const access=`header.${Buffer.from(JSON.stringify({exp:1})).toString('base64url')}.signature`;
  assert.equal((await handler(async()=>Response.json({access})).POST(request(credentials),context('login'))).status,502);
  assert.equal((await handler(()=>{throw Error('must not fetch');}).POST(request(credentials),context('unknown'))).status,404);
});
test('password reset endpoints forward to Django correctly', async () => {
  const route = handler(async (url, options) => {
    const u = String(url);
    if (u.endsWith('forgot-password/')) {
      assert.deepEqual(JSON.parse(options.body), { email: 'user@example.test' });
      return Response.json({ message: 'Password reset OTP sent to your email.' });
    }
    if (u.endsWith('verify-reset-otp/')) {
      assert.deepEqual(JSON.parse(options.body), { email: 'user@example.test', otp: '123456' });
      return Response.json({ message: 'OTP verified successfully.' });
    }
    if (u.endsWith('reset-password/')) {
      assert.deepEqual(JSON.parse(options.body), { email: 'user@example.test', otp: '123456', new_password: 'new-secure-password' });
      return Response.json({ message: 'Password reset successfully.' });
    }
    throw Error(`Unexpected URL: ${u}`);
  });

  const res1 = await route.POST(request({ email: 'user@example.test' }), context('forgot-password'));
  assert.equal(res1.status, 200);
  assert.match((await res1.json()).message, /reset code/i);

  const res2 = await route.POST(request({ email: 'user@example.test', otp: '123456' }), context('verify-reset-otp'));
  assert.equal(res2.status, 200);
  assert.match((await res2.json()).message, /verified/i);

  const res3 = await route.POST(request({ email: 'user@example.test', otp: '123456', new_password: 'new-secure-password' }), context('reset-password'));
  assert.equal(res3.status, 200);
  assert.match((await res3.json()).message, /reset successfully/i);
});
test('logout expires the access and refresh cookies without calling Django',async()=>{
  const response=await handler(()=>{throw Error('must not fetch');}).POST(request({}),context('logout'));
  assert.equal(response.status,200);
  const cookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get('set-cookie')];
  const access = cookies.find(c => c.includes('sakafat_access='));
  const refresh = cookies.find(c => c.includes('sakafat_refresh='));
  assert.match(access, /Max-Age=0/);
  assert.match(refresh, /Max-Age=0/);
});
test('supports a public request host differing from the internal Next URL',async()=>{
  const req=new NextRequest('http://localhost:3011/api/auth/register',{method:'POST',headers:{host:'127.0.0.1:3011',origin:'http://127.0.0.1:3011','Content-Type':'application/json'},body:JSON.stringify({...credentials,email:'qa@example.test'})});
  const response=await handler(async(url)=>{assert.equal(String(url),'http://django.test/api/register/');return Response.json({username:'test-user'},{status:201});}).POST(req,context('register'));
  assert.equal(response.status,200);assert.equal(response.headers.get('set-cookie'),null);
});
