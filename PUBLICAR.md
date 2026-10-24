# Colocar o Ateliê no ar pelo Railway

O **Railway** é a alternativa preparada ao Render. Ele fornece um endereço HTTPS sem você precisar comprar um domínio. O estúdio continua protegido por sua senha.

O `Dockerfile` da raiz é detectado automaticamente: não precisa definir comandos de instalação ou criar um arquivo `railway.json`. A aplicação reconhece o endereço fornecido em `RAILWAY_PUBLIC_DOMAIN`.

## 1. Conectar o projeto

1. Acesse [Railway](https://railway.com/) e escolha entrar com **GitHub**, usando a conta do repositório `js146555-lang/privado`.
2. Confira o plano, eventuais créditos de teste e as condições na sua conta. A hospedagem pode ter custo. Se for pedido pagamento, confira os valores antes de confirmar.
3. Escolha **New Project → Deploy from GitHub repo** e selecione `privado`. Autorize o aplicativo GitHub do Railway a acessar esse repositório, caso seja solicitado.
4. Escolha **Add Variables**, em vez de iniciar imediatamente, para configurar o serviço antes da primeira implantação. Use a branch **main** e a raiz do repositório.

Se o repositório não aparecer, revise o acesso em **Account → General Settings → Account Integrations → GitHub → Edit Scope**. Entrar na conta e autorizar o GitHub exige sua participação; não compartilhe senhas de conta ou códigos de confirmação no chat.

## 2. Configurar a senha

Na aba **Variables**, adicione:

| Nome | Valor |
| --- | --- |
| `SITE_PASSWORD` | sua senha do estúdio, com 8 a 256 caracteres |
| `PORT` | `3000` |
| `IMAGE_API_KEY` | sua chave de API da OpenAI, quando quiser habilitar imagens reais |

Você pode adicionar `IMAGE_API_KEY` depois: sem ela, consegue entrar e explorar a interface, mas criar e editar imagens ficam indisponíveis. Preencha senha e chave apenas nas variáveis privadas do painel, nunca nos arquivos do GitHub.

Não precisa configurar `NODE_VERSION`, `NODE_ENV` ou comandos de build: o Dockerfile já usa Node.js 24 e inicia em produção. Não defina `PUBLIC_ORIGIN` no primeiro deploy. A configuração privada do ambiente Codex não é transferida automaticamente para o Railway.

## 3. Criar o endereço e publicar

1. Abra **Settings → Networking → Public Networking → Generate Domain** no serviço.
2. Configure/confirme **3000** como porta de destino (*target port*), igual à variável `PORT`.
3. Se configurar uma verificação de saúde, use **`/api/session`**. Ela não gera imagens nem consome créditos da API.
4. Depois de gerar o domínio, aplique as alterações pendentes pelo botão **Deploy**.
5. Aguarde a implantação ficar ativa, abra o endereço HTTPS apresentado pelo Railway e entre com sua senha.

A aplicação precisa da senha e do domínio para iniciar em produção. Se uma tentativa tiver começado antes de configurá-los, complete essas duas etapas e faça **Redeploy**. O nome exato do endereço é definido pela hospedagem; este guia não significa que um site já foi publicado.

## 4. Habilitar imagens reais

Crie uma chave em [OpenAI Platform](https://platform.openai.com/api-keys), com saldo e acesso ao modelo de imagens. Preencha `IMAGE_API_KEY` no serviço e aplique a alteração com uma nova implantação.

Faça uma geração e uma edição de teste. Esses pedidos são cobrados pela OpenAI separadamente da hospedagem e da assinatura do ChatGPT. O modelo padrão é `gpt-image-1.5`, configurável por `IMAGE_MODEL`.

Se o Railway mostrar **Limited Trial**, a saída de rede pode estar limitada e impedir chamadas à OpenAI. Confira a [verificação da conta](https://railway.com/verify) e as condições do plano antes de contratar qualquer recurso. A disponibilidade de teste gratuito depende da conta.

## Se algo não funcionar

- **Servidor recusa iniciar:** confirme a senha, o domínio gerado e as alterações aplicadas.
- **Site não abre:** confirme `PORT=3000` e o domínio direcionado à porta 3000.
- **Login funciona, mas não gera imagens:** confira a chave, o saldo, o acesso ao modelo e eventuais limites de rede do plano.
- **Domínio próprio:** defina `PUBLIC_ORIGIN` com sua origem HTTPS exata, sem barra final, e reimplante. Essa variável tem precedência sobre o endereço automático.

Mantenha somente uma instância: sessões e limites ficam na memória e reinícios encerram as sessões. Baixe os resultados que deseja guardar; eles desaparecem da página ao sair ou recarregar. Evite reenviar repetidamente pedidos com timeout, pois podem ter sido processados e cobrados.

## Referências

- [Publicar um repositório GitHub no Railway](https://docs.railway.com/quick-start#deploying-your-project---from-github)
- [Detecção de Dockerfile](https://docs.railway.com/builds/dockerfiles)
- [Variáveis fornecidas pela hospedagem](https://docs.railway.com/variables/reference#railway-provided-variables)
- [Alternativa: instruções do Render](PUBLICAR-RENDER.md)

Publicar o ambiente do Codex não cria um serviço no Railway. A conta, a conexão com o GitHub, as variáveis privadas e a implantação são etapas separadas.
