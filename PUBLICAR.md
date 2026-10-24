# Colocar o Ateliê no ar, sem comprar domínio

A opção preparada é o **Render**, com um serviço web Node.js e endereço HTTPS fornecido pela plataforma. O código continua no seu repositório privado do GitHub e o uso do site exige sua senha. A página de entrada é acessível pela internet; apenas os pedidos de imagem exigem autenticação.

## O que já está preparado

- `render.yaml` descreve a instalação e a inicialização no Render, incluindo a solicitação das duas variáveis privadas.
- A aplicação reconhece automaticamente `RENDER_EXTERNAL_URL`, a URL fornecida pelo Render. Você não precisa configurar um domínio nem copiar a URL para outra variável no primeiro deploy.
- Os cookies são seguros em produção e a chave da OpenAI fica somente no servidor.
- O arquivo pede o plano `free`. Confira a disponibilidade e as condições atuais na sua conta antes de confirmar a criação; não é necessário selecionar um plano pago para seguir esta configuração.

## Passos para publicar

1. **Confirmar o projeto no GitHub.** Todos os arquivos do projeto precisam estar em uma branch do repositório `js146555-lang/privado`, incluindo `render.yaml` e `package-lock.json`. Não envie `.env`, `node_modules`, `dist`, capturas de teste ou credenciais. Confira a presença dos arquivos no GitHub antes de conectar a hospedagem.
2. Crie sua conta em [Render](https://dashboard.render.com/) usando seu GitHub. Autorize o Render a acessar somente o repositório `privado` pelo aplicativo GitHub do próprio Render. Não é necessário criar nem compartilhar um token pessoal aqui no chat.
3. No painel, escolha **New → Blueprint**, conecte `js146555-lang/privado` e selecione a branch em que o código foi enviado. Use o arquivo `render.yaml` da raiz.
4. Preencha os campos solicitados **diretamente no painel do Render**:
   - `SITE_PASSWORD`: sua senha exclusiva para entrar no site, com 8 a 256 caracteres.
   - `IMAGE_API_KEY`: sua chave criada em [OpenAI Platform](https://platform.openai.com/api-keys), com saldo e acesso ao modelo de imagem.
5. Confira o serviço, o plano e as condições de cobrança mostradas no painel e confirme a implantação.
6. Aguarde o estado de serviço ativo e abra o endereço HTTPS que o próprio Render apresentar. Não há um endereço criado antes dessa etapa, e o nome exato depende da disponibilidade na plataforma.
7. Entre com sua senha. Teste a criação de uma imagem, depois envie uma imagem para editar e baixe os resultados. Esses pedidos reais usam os créditos da API da OpenAI.

Não compartilhe a senha nem a chave neste chat. As configurações do ambiente do Codex não são copiadas automaticamente para o Render: as variáveis da hospedagem precisam ser preenchidas lá também.

## Se o painel pedir os comandos manualmente

Crie um **Web Service**, com **Node** como runtime e os seguintes valores:

| Campo | Valor |
| --- | --- |
| Root directory | deixe vazio |
| Build command | `npm ci --include=dev --no-fund && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/session` |
| `NODE_VERSION` | `24.19.0` |
| `NODE_ENV` | `production` |
| `IMAGE_MODEL` | `gpt-image-1.5` |
| `SITE_PASSWORD` | sua senha, preenchida somente no painel |
| `IMAGE_API_KEY` | sua chave, preenchida somente no painel |

O Render define `PORT` e `RENDER_EXTERNAL_URL`. Não fixe `PORT=3000` nem defina `PUBLIC_ORIGIN` no primeiro deploy. Mantenha somente uma instância: sessões e limites ficam na memória dela.

## Custos e limitações

- A hospedagem e a API de imagens são serviços separados. Mesmo com hospedagem gratuita, gerar e editar imagens usa uma API paga; uma assinatura do ChatGPT não inclui esses créditos.
- Planos gratuitos podem pausar o serviço e impor limites. A primeira abertura pode demorar, e reinícios encerram sessões. Confira as regras atuais no painel; o projeto não garante disponibilidade contínua.
- O estúdio não é uma galeria permanente: resultados ficam na memória da página e desaparecem ao sair ou recarregar. Baixe as imagens que deseja guardar.
- Uma falha de conexão ou timeout não garante que um pedido de imagem deixou de ser cobrado. Evite reenviar repetidamente.

## Se algo não abrir

- Nos logs do serviço, procure a mensagem de que o Ateliê iniciou. Nunca copie logs que contenham credenciais.
- Se aparecer erro de versão do Node, confirme `NODE_VERSION=24.19.0` e refaça a implantação.
- Se a aplicação recusar a inicialização, confirme a senha de 8 a 256 caracteres e a presença de `RENDER_EXTERNAL_URL`. Em uma instalação fora do Render, defina `PUBLIC_ORIGIN` com a URL HTTPS exata.
- Se o login funcionar, mas não houver geração, confira a chave, o saldo e as permissões de imagem na conta da OpenAI.
- Se adicionar um domínio próprio depois, configure `PUBLIC_ORIGIN` com a nova origem HTTPS, sem barra final, e reinicie o serviço.

Publicar o ambiente do Codex não cria o serviço do Render. Esta configuração prepara o projeto para implantação; a conta, a conexão com o GitHub, as credenciais e a criação do serviço são etapas externas.
