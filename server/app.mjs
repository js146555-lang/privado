import express from 'express';
import multer from 'multer';
import { randomBytes, randomUUID, scrypt, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
const COOKIE = 'atelie_session';
const MAX_UPLOAD = 20 * 1024 * 1024;
const SIZES = new Set(['1024x1024', '1536x1024', '1024x1536']);
const QUALITIES = new Set(['low', 'medium', 'high']);
const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const digest = (value) => createHash('sha256').update(value).digest('hex');

function imageType(buffer) {
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.toString('ascii',12,16) === 'IHDR') return 'image/png';
  if (buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
  if (buffer.length >= 16 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP') return 'image/webp';
  return null;
}

export function createApp({
  password = process.env.SITE_PASSWORD || '',
  apiKey = process.env.IMAGE_API_KEY || process.env.OPENAI_API_KEY || '',
  model = process.env.IMAGE_MODEL || 'gpt-image-1.5',
  fetchImpl = globalThis.fetch,
  secureCookies = false,
  publicOrigin = process.env.PUBLIC_ORIGIN || '',
  trustProxyHops = 0,
  sessionTtlMs = 8 * 60 * 60 * 1000,
  now = Date.now,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (trustProxyHops > 0) app.set('trust proxy', trustProxyHops);
  const configured = password.length >= 8 && password.length <= 256;
  const salt = randomBytes(32);
  const passwordHash = scryptSync(password || randomBytes(32).toString('hex'), salt, 64);
  const sessions = new Map();
  const loginAttempts = new Map();
  let imageRequests = [];
  let activeGeneration = false;

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const expectedOrigin = publicOrigin || `${req.protocol}://${req.get('host')}`;
      if ((req.get('origin') && req.get('origin') !== expectedOrigin) || req.get('sec-fetch-site') === 'cross-site') {
        return res.status(403).json({ error: 'Esta ação só pode ser feita no seu próprio site.', code: 'INVALID_ORIGIN' });
      }
    }
    for (const [key, session] of sessions) if (session.expires <= now()) sessions.delete(key);
    const token = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    const sessionKey = token && token.length < 256 ? digest(token) : null;
    req.sessionKey = sessionKey && sessions.has(sessionKey) ? sessionKey : null;
    next();
  });
  app.use('/api', express.json({ limit: '16kb' }));

  app.get('/api/session', (req, res) => {
    res.json({ authenticated: Boolean(req.sessionKey), configured, generationAvailable: Boolean(apiKey) });
  });

  app.post('/api/login', async (req, res, next) => {
    try {
      if (!configured) return res.status(503).json({ error: 'Configure SITE_PASSWORD no servidor com 8 a 256 caracteres.', code: 'SETUP_REQUIRED' });
      const timestamp = now();
      for (const [key, value] of loginAttempts) if (value.reset <= timestamp) loginAttempts.delete(key);
      const ip = req.ip;
      const attempts = loginAttempts.get(ip) || { count: 0, reset: timestamp + 15 * 60 * 1000 };
      if (attempts.count >= 10 || (!loginAttempts.has(ip) && loginAttempts.size >= 10000)) {
        res.set('Retry-After', String(Math.max(1, Math.ceil((attempts.reset - timestamp) / 1000))));
        return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' });
      }
      attempts.count++;
      loginAttempts.set(ip, attempts);
      const candidate = req.body?.password;
      if (typeof candidate !== 'string' || candidate.length > 256) return res.status(401).json({ error: 'Senha incorreta.' });
      const candidateHash = await deriveKey(candidate, salt, 64);
      if (!timingSafeEqual(passwordHash, candidateHash)) return res.status(401).json({ error: 'Senha incorreta.' });
      // A new login rotates this browser's token; at most 100 active sessions are retained.
      if (req.sessionKey) sessions.delete(req.sessionKey);
      if (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
      const token = randomBytes(32).toString('base64url');
      sessions.set(digest(token), { expires: timestamp + sessionTtlMs });
      res.cookie(COOKIE, token, { httpOnly: true, secure: secureCookies, sameSite: 'strict', path: '/', maxAge: sessionTtlMs });
      res.json({ authenticated: true });
    } catch (error) { next(error); }
  });

  app.post('/api/logout', (req, res) => {
    if (req.sessionKey) sessions.delete(req.sessionKey);
    res.clearCookie(COOKIE, { httpOnly: true, secure: secureCookies, sameSite: 'strict', path: '/' });
    res.status(204).end();
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD, files: 1, fields: 4, fieldSize: 16 * 1024, parts: 5 },
    fileFilter: (_req, file, callback) => {
      if (!TYPES.has(file.mimetype)) {
        const error = new Error('Envie uma imagem PNG, JPEG ou WebP.');
        error.status = 400;
        return callback(error);
      }
      callback(null, true);
    },
  }).single('image');

  app.post('/api/images', (req, res, next) => {
    if (!req.sessionKey) return res.status(401).json({ error: 'Entre com sua senha para continuar.', code: 'UNAUTHENTICATED' });
    if (!apiKey) return res.status(503).json({ error: 'A chave da API de imagens ainda não foi configurada no servidor.', code: 'API_KEY_MISSING' });
    if (activeGeneration) return res.status(409).json({ error: 'Uma imagem já está sendo criada. Aguarde a conclusão.' });
    next();
  }, upload, async (req, res, next) => {
    const { mode, size, quality } = req.body || {};
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!['generate', 'edit'].includes(mode) || !SIZES.has(size) || !QUALITIES.has(quality) || !prompt || prompt.length > 4000) {
      return res.status(400).json({ error: 'Confira a descrição (1 a 4.000 caracteres), o modo, o formato e a qualidade.' });
    }
    if (mode === 'generate' && req.file) return res.status(400).json({ error: 'Para usar uma imagem de referência, selecione Editar imagem.' });
    if (mode === 'edit' && !req.file) return res.status(400).json({ error: 'Envie uma imagem para editar.' });
    if (req.file && imageType(req.file.buffer) !== req.file.mimetype) return res.status(400).json({ error: 'O arquivo não parece ser uma imagem PNG, JPEG ou WebP válida.' });
    // Recheck after parsing a potentially slow upload to avoid simultaneous paid requests.
    if (activeGeneration) return res.status(409).json({ error: 'Uma imagem já está sendo criada. Aguarde a conclusão.' });
    imageRequests = imageRequests.filter((timestamp) => timestamp > now() - 60 * 60 * 1000);
    if (imageRequests.length >= 20) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((imageRequests[0] + 60 * 60 * 1000 - now()) / 1000))));
      return res.status(429).json({ error: 'Limite de 20 pedidos por hora atingido. Aguarde antes de criar mais imagens.' });
    }
    activeGeneration = true;
    imageRequests.push(now());
    try {
      const fields = { model, prompt, n: 1, size, quality, output_format: 'png' };
      const headers = { Authorization: `Bearer ${apiKey}` };
      let body;
      if (mode === 'edit') {
        body = new FormData();
        for (const [key, value] of Object.entries(fields)) body.set(key, String(value));
        const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[req.file.mimetype];
        body.set('image', new Blob([req.file.buffer], { type: req.file.mimetype }), `reference.${extension}`);
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(fields);
      }
      const response = await fetchImpl(`https://api.openai.com/v1/images/${mode === 'edit' ? 'edits' : 'generations'}`, {
        method: 'POST', headers, body, signal: AbortSignal.timeout(180000),
      });
      if (!response.ok) {
        // Provider responses can contain prompts or account details. Never relay or log them.
        await response.body?.cancel?.();
        const messages = {
          400: 'A API não aceitou este pedido. Revise a descrição ou a imagem e tente novamente.',
          401: 'A chave da API não foi aceita. Confira a configuração no servidor.',
          403: 'A conta da API não tem acesso a este modelo. Confira as permissões e a verificação da conta.',
          429: 'A API atingiu um limite ou está sem créditos. Confira o saldo e tente mais tarde.',
        };
        return res.status(response.status === 429 ? 429 : 502).json({ error: messages[response.status] || 'O serviço de imagens está indisponível. Tente novamente mais tarde.', code: `PROVIDER_${response.status}` });
      }
      const result = await response.json();
      const data = result?.data?.[0];
      if (!data?.b64_json || typeof data.b64_json !== 'string' || data.b64_json.length > 64 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.b64_json)) {
        return res.status(502).json({ error: 'O serviço não retornou uma imagem válida. Tente novamente.', code: 'INVALID_PROVIDER_RESPONSE' });
      }
      res.json({ image: {
        id: randomUUID(), dataUrl: `data:image/png;base64,${data.b64_json}`, prompt,
        revisedPrompt: typeof data.revised_prompt === 'string' ? data.revised_prompt : null,
        createdAt: new Date(now()).toISOString(), mode, size, quality,
      } });
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') return res.status(504).json({ error: 'A imagem demorou mais que o esperado. Aguarde antes de reenviar: o provedor pode ter processado o pedido.', code: 'PROVIDER_TIMEOUT' });
      next(error);
    } finally {
      activeGeneration = false;
    }
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endereço não encontrado.' }));
  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'A imagem deve ter no máximo 20 MB.' : 'Envie apenas uma imagem e os campos do formulário.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'O pedido é muito grande.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'O pedido contém dados inválidos.' });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    res.status(502).json({ error: 'Não foi possível falar com o serviço de imagens. Tente novamente em instantes.', code: 'SERVICE_UNAVAILABLE' });
  });
  return app;
}
