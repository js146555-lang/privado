import express from 'express';
import { resolve } from 'node:path';
import { createApp } from '../../server/app.mjs';
import { png } from './fixture-image.mjs';

// This server is invoked only by Playwright. It never contacts the image API.
const app = createApp({
  password: 'somente-testes-senha-longa',
  apiKey: 'fake-test-only',
  secureCookies: false,
  publicOrigin: '',
  fetchImpl: async () => Response.json({ data: [{ b64_json: png.toString('base64') }] }),
});
app.use(express.static(resolve('dist')));
app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
const server = app.listen(4173, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
