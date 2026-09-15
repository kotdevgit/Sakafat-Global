import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest } from 'next/server.js';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/app/api/auth/[action]/route.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function handler(fetch, configured = true) {
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => name === '@/lib/api/config' ? { getApiBaseUrl: () => { if (!configured) throw Error('not configured'); return 'http://django.test/api/'; } } : require(name), fetch, URL, Buffer, AbortSignal, process: { env: { NODE_ENV: 'production' } } });
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
    return Response.json({ access, refresh: 'never-expose', user: { username: 'test-user' } });
  });
  const response = await route.POST(request(credentials), context('login'));
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/i); assert.match(cookie, /Secure/i); assert.match(cookie, /SameSite=lax/i);
  assert.doesNotMatch(await response.text(), /signature|never-expose/);
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
  assert.equal((await handler(()=>{throw Error('must not fetch');}).POST(request(credentials),context('reset-password'))).status,404);
});
test('logout expires the access cookie without calling Django',async()=>{
  const response=await handler(()=>{throw Error('must not fetch');}).POST(request({}),context('logout'));
  assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/Max-Age=0/);
});
test('supports a public request host differing from the internal Next URL',async()=>{
  const req=new NextRequest('http://localhost:3011/api/auth/register',{method:'POST',headers:{host:'127.0.0.1:3011',origin:'http://127.0.0.1:3011','Content-Type':'application/json'},body:JSON.stringify({...credentials,email:'qa@example.test'})});
  const response=await handler(async(url)=>{assert.equal(String(url),'http://django.test/api/register/');return Response.json({username:'test-user'},{status:201});}).POST(req,context('register'));
  assert.equal(response.status,200);assert.equal(response.headers.get('set-cookie'),null);
});
