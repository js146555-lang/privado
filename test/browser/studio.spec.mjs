import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { png } from './fixture-image.mjs';

async function login(page) {
  await page.goto('/');
  await page.getByLabel('Senha de acesso', { exact: true }).fill('somente-testes-senha-longa');
  await page.getByRole('button', { name: 'Entrar no estúdio' }).click();
  await expect(page.getByRole('heading', { name: 'O que vamos criar hoje?' })).toBeVisible();
}

test('private studio creates, downloads, re-edits and clears results on logout', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await expect(page.getByRole('button', { name: 'Gerar imagem', exact: true })).toBeDisabled();
  const prompt = 'Uma casa brasileira em meio a um jardim tropical';
  await page.getByLabel('Descreva sua ideia').fill(prompt);
  await page.getByRole('radio', { name: 'Paisagem' }).check();
  await page.getByLabel('Qualidade').selectOption('high');
  await page.getByRole('button', { name: 'Gerar imagem', exact: true }).click();
  const result = page.locator('.result-image');
  await expect(result).toHaveAttribute('alt', prompt);
  await expect.poll(() => result.evaluate((element) => element.naturalWidth)).toBe(128);
  await expect(page.getByText('1536 × 1024 px · PNG')).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar imagem' }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/^atelie-.+\.png$/);
  expect(await readFile(await download.path())).toEqual(png);
  await page.getByRole('button', { name: 'Editar resultado' }).click();
  await expect(page.getByRole('img', { name: 'Imagem original para edição' })).toBeVisible();
  const edit = 'Mude o fundo para um jardim azul';
  await page.getByLabel('O que você quer mudar?').fill(edit);
  await page.getByRole('button', { name: 'Transformar imagem' }).click();
  await expect(result).toHaveAttribute('alt', edit);
  await expect(page.getByRole('button', { name: /^Ver criação:/ })).toHaveCount(2);
  await page.screenshot({ path: 'test-results/studio-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Sair do estúdio' }).click();
  await expect(page.getByLabel('Senha de acesso', { exact: true })).toBeVisible();
  await expect(page.locator('.result-image')).toHaveCount(0);
  expect((await (await page.request.get('/api/session')).json()).authenticated).toBe(false);
  expect((await page.request.post('/api/images')).status()).toBe(401);
  expect(errors).toEqual([]);
});

test('mobile studio uploads a reference, edits and stays within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole('button', { name: 'Editar imagem', exact: true }).click();
  await page.locator('#source-image').setInputFiles({ name: 'referencia.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByRole('img', { name: 'Imagem original para edição' })).toBeVisible();
  const prompt = 'Troque o fundo por um campo de flores';
  await page.getByLabel('O que você quer mudar?').fill(prompt);
  await page.getByRole('button', { name: 'Transformar imagem' }).click();
  await expect(page.locator('.result-image')).toHaveAttribute('alt', prompt);
  await expect.poll(() => page.locator('.result-image').evaluate((element) => element.naturalWidth)).toBe(128);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/studio-mobile.png', fullPage: true });
});

test('provider errors appear without a fabricated result, and the guide is keyboard accessible', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Guia rápido' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.route('**/api/images', (route) => route.fulfill({
    status: 429,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'A API atingiu um limite ou está sem créditos.' }),
  }));
  await page.getByLabel('Descreva sua ideia').fill('Um estudo de luz e sombra');
  await page.getByRole('button', { name: 'Gerar imagem', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('A API atingiu um limite ou está sem créditos.');
  await expect(page.locator('.result-image')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Gerar imagem', exact: true })).toBeEnabled();
});
