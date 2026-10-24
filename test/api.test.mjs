import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../server/app.mjs';

const password = 'somente-testes-uma-senha-longa';
const apiKey = 'test-api-key';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFU4AAAAASUVORK5CYII=',
  'base64',
);

async function fixture(t, options = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json({ data: [{ b64_json: png.toString('base64') }] });
  };
  const app = createApp({ password, apiKey, fetchImpl, secureCookies: false, ...options });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, init) => fetch(`${base}${path}`, init);
  const login = async () => {
    const response = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    assert.equal(response.status, 200, await response.text());
    return response.headers.get('set-cookie').split(';')[0];
  };
  return { request, login, calls, base };
}

function imageForm(overrides = {}) {
  const form = new FormData();
  const fields = {
    mode: 'generate',
    prompt: 'Uma pequena casa em uma floresta com luz suave',
    size: '1024x1024',
    quality: 'medium',
    ...overrides,
  };
  for (const [name, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) form.set(name, value);
  }
  return form;
}

test('private image endpoint rejects anonymous callers before invoking the provider', async (t) => {
  const { request, calls } = await fixture(t);
  const response = await request('/api/images', { method: 'POST', body: imageForm() });
  assert.equal(response.status, 401);
  assert.equal(typeof (await response.json()).error, 'string');
  assert.equal(calls.length, 0);
});

test('password login creates a private cookie and logout revokes that session', async (t) => {
  const { request } = await fixture(t);
  const anonymous = await request('/api/session');
  assert.deepEqual(await anonymous.json(), {
    authenticated: false,
    configured: true,
    generationAvailable: true,
  });

  const wrong = await request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'incorrect-password' }),
  });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.headers.get('set-cookie'), null);

  const signedIn = await request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  assert.equal(signedIn.status, 200);
  const setCookie = signedIn.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Strict/i);
  assert.match(setCookie, /Path=\//i);
  const cookie = setCookie.split(';')[0];
  const authenticated = await request('/api/session', { headers: { Cookie: cookie } });
  assert.equal((await authenticated.json()).authenticated, true);
  const logout = await request('/api/logout', { method: 'POST', headers: { Cookie: cookie } });
  assert.equal(logout.status, 204);
  const after = await request('/api/session', { headers: { Cookie: cookie } });
  assert.equal((await after.json()).authenticated, false);
});

test('session cookies are marked Secure when HTTPS mode is enabled', async (t) => {
  const { request } = await fixture(t, { secureCookies: true });
  const response = await request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /;\s*Secure(?:;|$)/i);
});

test('cross-origin login and generation requests are rejected', async (t) => {
  const { request, login, calls } = await fixture(t);
  const evilLogin = await request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ password }),
  });
  assert.equal(evilLogin.status, 403);
  const cookie = await login();
  const evilGeneration = await request('/api/images', {
    method: 'POST',
    headers: { Cookie: cookie, Origin: 'https://evil.example' },
    body: imageForm(),
  });
  assert.equal(evilGeneration.status, 403);
  assert.equal(calls.length, 0);
});

test('an unconfigured site stays locked instead of using a default password', async (t) => {
  const { request } = await fixture(t, { password: '' });
  const session = await request('/api/session');
  const state = await session.json();
  assert.equal(state.configured, false);
  assert.equal(state.authenticated, false);
  const response = await request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: '' }),
  });
  assert.equal(response.status, 503);
});

for (const sitePassword of ['teste123', 'a'.repeat(256)]) {
  test(`a ${sitePassword.length}-character site password allows login`, async (t) => {
    const { request } = await fixture(t, { password: sitePassword });
    const state = await (await request('/api/session')).json();
    assert.equal(state.configured, true);

    const response = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: sitePassword }),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie').split(';')[0];
    const authenticated = await request('/api/session', { headers: { Cookie: cookie } });
    assert.equal((await authenticated.json()).authenticated, true);
  });
}

for (const sitePassword of ['teste12', 'a'.repeat(257)]) {
  test(`a ${sitePassword.length}-character site password leaves the site unconfigured`, async (t) => {
    const { request } = await fixture(t, { password: sitePassword });
    const state = await (await request('/api/session')).json();
    assert.equal(state.configured, false);
    assert.equal(state.authenticated, false);

    const response = await request('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: sitePassword }),
    });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('set-cookie'), null);
  });
}

test('missing API credentials give an actionable error without pretending to generate', async (t) => {
  const { request, login, calls } = await fixture(t, { apiKey: '' });
  const cookie = await login();
  const state = await (await request('/api/session', { headers: { Cookie: cookie } })).json();
  assert.equal(state.generationAvailable, false);
  const response = await request('/api/images', {
    method: 'POST', headers: { Cookie: cookie }, body: imageForm(),
  });
  assert.equal(response.status, 503);
  assert.equal(typeof (await response.json()).error, 'string');
  assert.equal(calls.length, 0);
});

test('valid generation forwards the prompt and returns a downloadable PNG', async (t) => {
  const { request, login, calls } = await fixture(t);
  const cookie = await login();
  const response = await request('/api/images', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: imageForm({ prompt: '  Um jardim brasileiro  ', size: '1536x1024', quality: 'high' }),
  });
  assert.equal(response.status, 200, await response.clone().text());
  const { image } = await response.json();
  assert.equal(image.dataUrl, `data:image/png;base64,${png.toString('base64')}`);
  assert.equal(image.prompt, 'Um jardim brasileiro');
  assert.equal(image.mode, 'generate');
  assert.equal(image.size, '1536x1024');
  assert.equal(image.quality, 'high');
  assert.equal(typeof image.id, 'string');
  assert.ok(image.createdAt);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.openai.com/v1/images/generations');
  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get('authorization'), `Bearer ${apiKey}`);
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    model: 'gpt-image-1.5',
    prompt: 'Um jardim brasileiro',
    n: 1,
    size: '1536x1024',
    quality: 'high',
    output_format: 'png',
  });
  assert.match(response.headers.get('cache-control'), /no-store/i);
});

test('image editing forwards the uploaded bytes to the edits endpoint', async (t) => {
  const { request, login, calls } = await fixture(t);
  const cookie = await login();
  const form = imageForm({ mode: 'edit', prompt: 'Mude o fundo para azul' });
  form.set('image', new Blob([png], { type: 'image/png' }), 'minha-imagem.png');
  const response = await request('/api/images', {
    method: 'POST', headers: { Cookie: cookie }, body: form,
  });
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).image.mode, 'edit');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.openai.com/v1/images/edits');
  const sent = calls[0].init.body;
  assert.ok(sent instanceof FormData);
  assert.equal(sent.get('prompt'), 'Mude o fundo para azul');
  assert.equal(sent.get('model'), 'gpt-image-1.5');
  assert.equal(sent.get('output_format'), 'png');
  const uploaded = sent.get('image');
  assert.equal(uploaded.type, 'image/png');
  assert.deepEqual(Buffer.from(await uploaded.arrayBuffer()), png);
});

test('invalid prompt, mode, size, quality and missing edit image never reach the provider', async (t) => {
  const { request, login, calls } = await fixture(t);
  const cookie = await login();
  const invalidCases = [
    { prompt: '' },
    { prompt: '   ' },
    { prompt: 'a'.repeat(4001) },
    { mode: 'unknown' },
    { size: '99999x99999' },
    { quality: 'unlimited' },
    { mode: 'edit' },
  ];
  for (const invalid of invalidCases) {
    const response = await request('/api/images', {
      method: 'POST', headers: { Cookie: cookie }, body: imageForm(invalid),
    });
    assert.equal(response.status, 400, `Invalid case ${JSON.stringify(invalid).slice(0, 100)}`);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  assert.equal(calls.length, 0);
});

test('an image MIME declaration cannot disguise a non-image upload', async (t) => {
  const { request, login, calls } = await fixture(t);
  const cookie = await login();
  for (const [type, bytes, name] of [
    ['image/png', '<script>private-file</script>', 'fake.png'],
    ['image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'vector.svg'],
  ]) {
    const form = imageForm({ mode: 'edit' });
    form.set('image', new Blob([bytes], { type }), name);
    const response = await request('/api/images', {
      method: 'POST', headers: { Cookie: cookie }, body: form,
    });
    assert.equal(response.status, 400);
  }
  assert.equal(calls.length, 0);
});

test('provider authentication, rate limit and server errors do not leak private details', async (t) => {
  for (const upstreamStatus of [401, 429, 500]) {
    await t.test(`provider status ${upstreamStatus}`, async (subtest) => {
      const privateMessage = `PRIVATE_UPSTREAM_DIAGNOSTIC_${apiKey}`;
      const { request, login } = await fixture(subtest, {
        fetchImpl: async () => Response.json({ error: { message: privateMessage } }, { status: upstreamStatus }),
      });
      const cookie = await login();
      const response = await request('/api/images', {
        method: 'POST', headers: { Cookie: cookie }, body: imageForm(),
      });
      assert.ok(response.status >= 400 && response.status < 600);
      const body = await response.text();
      assert.equal(typeof JSON.parse(body).error, 'string');
      assert.ok(!body.includes(privateMessage));
      assert.ok(!body.includes(apiKey));
    });
  }
});

test('expired sessions cannot authorize a generation request', async (t) => {
  let currentTime = Date.now();
  const { request, login, calls } = await fixture(t, {
    now: () => currentTime,
    sessionTtlMs: 1000,
  });
  const cookie = await login();
  currentTime += 1001;
  const response = await request('/api/images', {
    method: 'POST', headers: { Cookie: cookie }, body: imageForm(),
  });
  assert.equal(response.status, 401);
  assert.equal(calls.length, 0);
});

test('concurrent requests cannot start a second paid generation', async (t) => {
  const entered = Promise.withResolvers();
  const released = Promise.withResolvers();
  let providerCalls = 0;
  const { request, login } = await fixture(t, {
    fetchImpl: async () => {
      providerCalls++;
      entered.resolve();
      await released.promise;
      return Response.json({ data: [{ b64_json: png.toString('base64') }] });
    },
  });
  const cookie = await login();
  const firstRequest = request('/api/images', {
    method: 'POST', headers: { Cookie: cookie }, body: imageForm(),
  });
  try {
    await entered.promise;
    const concurrent = await request('/api/images', {
      method: 'POST', headers: { Cookie: cookie }, body: imageForm(),
    });
    assert.equal(concurrent.status, 409);
    assert.equal(providerCalls, 1);
  } finally {
    released.resolve();
    await firstRequest;
  }
  assert.equal((await firstRequest).status, 200);
});

test('the global hourly budget survives new logins and resets after the rolling window', async (t) => {
  let currentTime = Date.now();
  const { request, login, calls } = await fixture(t, { now: () => currentTime });
  const cookie = await login();
  for (let index = 0; index < 20; index++) {
    const response = await request('/api/images', {
      method: 'POST', headers: { Cookie: cookie }, body: imageForm(),
    });
    assert.equal(response.status, 200, `Generation ${index + 1}`);
    await response.arrayBuffer();
  }
  const newSessionCookie = await login();
  const blocked = await request('/api/images', {
    method: 'POST', headers: { Cookie: newSessionCookie }, body: imageForm(),
  });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  assert.equal(calls.length, 20);

  currentTime += 60 * 60 * 1000 + 1;
  const afterWindow = await request('/api/images', {
    method: 'POST', headers: { Cookie: newSessionCookie }, body: imageForm(),
  });
  assert.equal(afterWindow.status, 200);
  assert.equal(calls.length, 21);
});

test('ten failed logins block further attempts until the fifteen-minute window expires', async (t) => {
  let currentTime = Date.now();
  const { request } = await fixture(t, { now: () => currentTime });
  const attempt = (candidate) => request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: candidate }),
  });
  for (let index = 0; index < 10; index++) {
    const rejected = await attempt('incorrect-password');
    assert.equal(rejected.status, 401);
    assert.equal(rejected.headers.get('set-cookie'), null);
  }
  const blocked = await attempt(password);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('set-cookie'), null);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);

  currentTime += 15 * 60 * 1000 + 1;
  const afterWindow = await attempt(password);
  assert.equal(afterWindow.status, 200);
  assert.match(afterWindow.headers.get('set-cookie'), /HttpOnly/i);
});

test('provider timeouts return 504 without automatically retrying a potentially paid request', async (t) => {
  let providerCalls = 0;
  const { request, login } = await fixture(t, {
    fetchImpl: async () => {
      providerCalls++;
      if (providerCalls === 1) {
        throw new DOMException('PRIVATE_PROVIDER_TIMEOUT_DETAIL', 'TimeoutError');
      }
      return Response.json({ data: [{ b64_json: png.toString('base64') }] });
    },
  });
  const cookie = await login();
  const timedOut = await request('/api/images', {
    method: 'POST', headers: { Cookie: cookie }, body: imageForm(),
  });
  assert.equal(timedOut.status, 504);
  const failure = await timedOut.text();
  assert.equal(JSON.parse(failure).code, 'PROVIDER_TIMEOUT');
  assert.ok(!failure.includes('PRIVATE_PROVIDER_TIMEOUT_DETAIL'));
  assert.equal(providerCalls, 1);

  // An explicit later request is still possible after the timed-out request releases its lock.
  const explicitRetry = await request('/api/images', {
    method: 'POST', headers: { Cookie: cookie }, body: imageForm(),
  });
  assert.equal(explicitRetry.status, 200);
  assert.equal(providerCalls, 2);
});

test('a successful provider HTTP status without valid image data is reported as failure', async (t) => {
  for (const [name, result] of [
    ['empty data', { data: [] }],
    ['URL response instead of requested image bytes', { data: [{ url: 'https://example.invalid/private-image' }] }],
    ['invalid base64 bytes', { data: [{ b64_json: '<script>invalid-image</script>' }] }],
  ]) {
    await t.test(name, async (subtest) => {
      const { request, login } = await fixture(subtest, {
        fetchImpl: async () => Response.json(result),
      });
      const cookie = await login();
      const response = await request('/api/images', {
        method: 'POST', headers: { Cookie: cookie }, body: imageForm(),
      });
      assert.equal(response.status, 502);
      const body = await response.json();
      assert.equal(body.code, 'INVALID_PROVIDER_RESPONSE');
      assert.equal(body.image, undefined);
    });
  }
});
