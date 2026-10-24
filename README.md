# Ateliê — seu estúdio privado de imagens

Um site em português para criar imagens a partir de uma descrição e editar uma imagem enviada. Interface responsiva, entrada por senha, download em PNG e reaproveitamento do resultado como referência para uma nova edição.

O site usa a API de imagens da OpenAI no servidor. Não treina um modelo próprio. A assinatura do ChatGPT não inclui os créditos dessa API; você precisa de uma conta com saldo e acesso ao modelo. O modelo padrão é `gpt-image-1.5`, configurável por `IMAGE_MODEL`.

## Rodar no seu computador ou neste ambiente

Requer Node.js **24.10 ou superior** e npm. Use o checkout existente; não precisa criar outro repositório ou worktree.

```bash
cd /workspace/privado
npm ci
cp .env.example .env
```

Edite `.env` **somente no servidor**, preenchendo:

- `SITE_PASSWORD`: uma senha exclusiva de 8 a 256 caracteres para entrar no seu site.
- `IMAGE_API_KEY`: sua chave da API, criada em <https://platform.openai.com/api-keys>.

Não envie essas informações por chat, não coloque a chave no navegador e não versione `.env`. Em uma hospedagem, use as variáveis privadas/segredos do serviço em vez de um arquivo.

```bash
npm run dev
```

O servidor inicia na porta `3000`, ou na porta definida por `PORT`, e atende tanto o site quanto a API. Sem senha, exibe apenas a orientação de configuração. Sem chave de API, permite entrar e explorar a interface, mas informa que geração e edição estão indisponíveis. Não existe senha padrão, modo público ou resultado falso no aplicativo.

## Usar

1. Entre com a senha que você configurou.
2. Em **Criar imagem**, descreva a imagem desejada.
3. Em **Editar imagem**, envie um PNG, JPEG ou WebP de até 20 MB e descreva a alteração.
4. Escolha proporção e qualidade, crie a imagem e baixe o PNG. O resultado também pode servir como referência para outra edição.

Cada envio solicita **uma imagem** e pode gerar cobrança na OpenAI. Há no máximo um pedido em processamento e 20 pedidos por hora por instância. Limites e saldo também podem ser definidos na conta da API. Fechar a aba ou perder a conexão não garante o cancelamento da cobrança; o site não repete pedidos automaticamente.

## Publicar em um site privado

**Sem domínio ou hospedagem?** Siga o [passo a passo de publicação no Railway](PUBLICAR.md), usando o Dockerfile já preparado e um endereço HTTPS fornecido pela hospedagem. A [alternativa pelo Render](PUBLICAR-RENDER.md) continua disponível em `render.yaml`. O estúdio exige sua senha em ambos os casos.

Você pode hospedar em um serviço que execute Node.js, ou usar o Dockerfile incluído. É necessário um servidor: uma hospedagem que sirva apenas HTML estático não executa esta aplicação.

1. Configure `SITE_PASSWORD`, `IMAGE_API_KEY` e `PUBLIC_ORIGIN` nas variáveis privadas da hospedagem. `PUBLIC_ORIGIN` deve ser a URL HTTPS exata, por exemplo `https://imagens.seudominio.com`, sem barra final.
2. Execute `npm ci --include=dev` e `npm run build` na etapa de construção.
3. Execute `npm start`. Ele exige senha e origem HTTPS, ativa cookies `Secure` e serve a interface compilada.
4. Encaminhe o tráfego HTTPS do seu domínio para `PORT`. Se houver exatamente um proxy reverso confiável, configure `TRUST_PROXY_HOPS=1`. Ajuste o número à sua infraestrutura e bloqueie o acesso direto ao Node.
5. Confirme a entrada com senha, a saída e a rejeição de acesso anônimo. Com saldo na API, faça uma geração e uma edição de teste. Esses dois pedidos são cobrados.

O servidor precisa de saída HTTPS para `api.openai.com`; a instalação usa `registry.npmjs.org`. Os comandos de inicialização respeitam `HTTP_PROXY`, `HTTPS_PROXY` e `NO_PROXY` e usam as autoridades certificadoras do sistema, sem desativar TLS.

O código estar pronto neste ambiente não publica o site nem configura um domínio. Salvar/publicar o ambiente do Codex também não equivale a hospedar a aplicação na internet.

No Railway, gere o domínio público para que `RAILWAY_PUBLIC_DOMAIN` seja reconhecida automaticamente. No Render, a variável equivalente é `RENDER_EXTERNAL_URL`. Defina `PUBLIC_ORIGIN` se usar uma origem própria, como um domínio personalizado; ela tem precedência sobre os endereços das hospedagens.

## Privacidade e acesso

- A chave fica no servidor e não é retornada ao navegador.
- Autenticação por uma senha de proprietário; não há cadastro de usuários ou recuperação por e-mail.
- Cookies de sessão são `HttpOnly`, `SameSite=Strict` e, em produção, `Secure`. As sessões expiram em oito horas, são revogadas ao sair e deixam de valer ao reiniciar o processo.
- Senha é comparada por derivação `scrypt`; tentativas de entrada e chamadas de imagem têm limites.
- Imagens e descrições ficam apenas na memória da aba durante o uso e na memória do servidor durante o pedido. Não há banco de dados, histórico persistente, analytics ou gravação de uploads. Ao sair ou recarregar a página, os resultados são descartados: baixe o que deseja guardar.
- **Descrições e imagens enviadas para geração/edição são transmitidas à OpenAI.** As políticas de uso e retenção do provedor continuam aplicáveis; o serviço não funciona offline.
- Arquivos aceitos são limitados por tamanho, tipo e assinatura. Eles não são publicados em um diretório de uploads.
- Limites e sessões ficam na memória de uma única instância. Para várias instâncias, é preciso acrescentar armazenamento compartilhado de sessões e limites.

## Verificar

```bash
npm test
npm run build
```

Os testes de API verificam acesso privado, expiração e saída, origem dos pedidos, validação de imagens e a integração de geração/edição com respostas **simuladas** do provedor. Não consomem créditos e não substituem a validação com uma chave real.

Os testes de navegador usam Chromium e um provedor simulado, isolados da aplicação normal:

```bash
npx playwright install chromium
npm run test:browser
```

Se já houver Chromium no sistema, defina `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` para seu executável. Os cenários incluem entrada, geração, download, edição, saída e uso em tela pequena.

## Estrutura

- `client/`: interface React, estilos e ilustrações locais.
- `server/app.mjs`: autenticação, limites, uploads e chamadas à API.
- `server/index.mjs`: inicialização, Vite no desenvolvimento e arquivos compilados em produção.
- `test/`: testes de API e navegador, com provedor simulado.

Nunca use a senha ou chave dos testes fora deles. Nenhuma credencial real está incluída no projeto.
