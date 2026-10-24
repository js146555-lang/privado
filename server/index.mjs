import express from 'express';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
// Render supplies its own HTTPS address, so the first deploy needs no custom domain.
// An explicit PUBLIC_ORIGIN takes precedence when a custom domain is configured.
const origin = process.env.PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL || '';
if (origin && (!/^https?:\/\//.test(origin) || new URL(origin).origin !== origin)) throw new Error('PUBLIC_ORIGIN deve ser uma origem exata, como https://imagens.exemplo.com, sem barra final.');
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5) throw new Error('TRUST_PROXY_HOPS deve ser um inteiro de 0 a 5.');
if (process.env.SITE_PASSWORD && (process.env.SITE_PASSWORD.length < 8 || process.env.SITE_PASSWORD.length > 256)) throw new Error('SITE_PASSWORD deve ter entre 8 e 256 caracteres.');
if (production && (!process.env.SITE_PASSWORD || !origin.startsWith('https://'))) throw new Error('Produção requer SITE_PASSWORD e uma origem HTTPS (PUBLIC_ORIGIN ou RENDER_EXTERNAL_URL). Consulte README.md.');

const app = createApp({ secureCookies: production, publicOrigin: origin, trustProxyHops: proxyHops });
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('X-Frame-Options', 'DENY');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.set('Cache-Control', 'no-store');
  if (production) {
    res.set('Strict-Transport-Security', 'max-age=31536000');
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  }
  next();
});

let vite;
if (production) {
  const dist = resolve(root, 'dist');
  if (!existsSync(resolve(dist, 'index.html'))) throw new Error('Execute npm run build antes de npm start.');
  app.use(express.static(dist, { index: false }));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
} else {
  const { createServer } = await import('vite');
  vite = await createServer({ configFile: resolve(root, 'vite.config.mjs'), server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

const server = app.listen(port, process.env.HOST || '0.0.0.0', () => {
  console.log(`Ateliê iniciado na porta ${port} (${production ? 'produção' : 'desenvolvimento'}).`);
  if (!process.env.SITE_PASSWORD) console.log('Configure SITE_PASSWORD em .env para habilitar o acesso privado.');
  if (!process.env.IMAGE_API_KEY && !process.env.OPENAI_API_KEY) console.log('Configure IMAGE_API_KEY no servidor para habilitar geração e edição.');
});
server.requestTimeout = 210000;
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
  server.close(async () => { await vite?.close(); process.exit(0); });
  setTimeout(() => process.exit(0), 10000).unref();
});
