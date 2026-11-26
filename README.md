# MatchPoint

Sistema web para organizar partidas esportivas entre amigos. Usuários podem criar partidas, acompanhar vagas, entrar ou sair de uma partida e consultar participantes.

## Status

MVP implementado. O backend está preparado para execução local e publicação no Render. O frontend está preparado para build com Vite e publicação na Vercel, após configurar a URL de produção da API.

## Funcionalidades

- **Partidas individuais:** criação, edição, cancelamento, vagas, valor por pessoa e participação.
- **Convites por link:** cada partida e cada confronto têm um endereço próprio (por exemplo, `/#/partida/<id>`), que pode ser compartilhado pelo WhatsApp, pelo menu de compartilhamento do celular ou copiado. Quem abre o link sem estar logado vê um aviso de convite e, depois de entrar ou criar a conta, cai direto na partida.
- **Navegação:** as telas têm endereço próprio, então o botão Voltar do navegador, o F5 e os favoritos funcionam. No celular, há uma barra de navegação fixa na parte de baixo. Cada ação (confirmar presença, aprovar jogador, criar partida...) mostra um aviso de confirmação, e ações destrutivas pedem confirmação antes.
- **Localização:** CEP com busca de endereço (ViaCEP), mapa interativo para marcar o local (OpenStreetMap/Leaflet) e link para o Google Maps.
- **Times e confrontos:** cadastro de times, publicação e aceite de confrontos e previsão do tempo para jogos ao ar livre (Open-Meteo).
- **Solicitações para entrar em times:** qualquer jogador pode pedir para entrar no time de outra pessoa. O responsável pelo time (ou um administrador) aprova ou recusa. Jogadores aprovados veem os confrontos do time na própria agenda e podem sair quando quiserem. O responsável pode remover jogadores.
- **Perfil do usuário:** informações pessoais (o e-mail só aparece para o próprio usuário e para administradores), estatísticas, conquistas, avaliações recebidas e histórico das partidas e confrontos que já aconteceram.
- **Avaliações:** cada usuário pode dar uma nota de 1 a 5 estrelas, com comentário opcional, no perfil de outro jogador. A avaliação pode ser editada ou removida, e não é possível avaliar a si mesmo.
- **Gamificação:** XP, níveis (Novato, Amador, Titular, Destaque, Craque e Lenda), conquistas com barra de progresso e ranking dos jogadores. Os pontos são calculados a partir da atividade registrada:
  - organizar uma partida com pelo menos um participante: +30 XP;
  - confirmar presença em uma partida: +20 XP;
  - disputar um confronto entre times: +25 XP;
  - criar um time ou ser aceito em um: +10 XP (até 3 de cada);
  - cada estrela recebida em avaliações: +2 XP.

## Tecnologias

- Frontend: React, TypeScript e Vite
- Backend: Node.js, Express e TypeScript
- ORM: Prisma
- Banco: PostgreSQL, com suporte ao Neon
- Deploy planejado: Vercel, Render e Neon

## Arquitetura

O backend usa arquitetura em camadas:

- `routes`: definição dos endpoints
- `controllers`: entrada e resposta HTTP
- `services`: regras de negócio
- `repositories`: acesso ao banco via Prisma
- `middlewares`: autenticação JWT, autorização de administrador, CORS, erros e rota não encontrada
- `config`: ambiente e cliente Prisma
- `prisma`: schema e migrations

O frontend permanece na raiz do projeto e é organizado em componentes, contexto e serviço HTTP.

## Estrutura principal

```text
src/
  components/
  context/
  services/
  App.tsx
backend/
  prisma/
    migrations/
    schema.prisma
  src/
    config/
    controllers/
    errors/
    middlewares/
    repositories/
    routes/
    services/
    server.ts
```

## Executar localmente

### Backend

Crie `backend/.env` a partir de `backend/.env.example`:

```env
DATABASE_URL="sua_url_do_postgresql"
PORT=3001
CORS_ORIGIN="http://localhost:5173"
NODE_ENV="development"
JWT_SECRET="segredo_aleatorio_com_pelo_menos_32_caracteres"
ADMIN_EMAIL="seu_email_de_admin"
ADMIN_PASSWORD="senha_forte_com_pelo_menos_8_caracteres"
```

`DATABASE_URL` e `JWT_SECRET` são obrigatórias: o backend não inicia sem elas. Para gerar um `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Depois execute:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:deploy
npm run build
npm run dev
```

Backend local: `http://localhost:3001`

### Frontend

Crie `.env` a partir de `.env.example`:

```env
VITE_API_URL=http://localhost:3001
```

Depois execute na raiz:

```bash
npm install
npm run build
npm run dev
```

Frontend local: `http://localhost:5173`

## Acesso administrativo

Ao iniciar, o backend cria (ou promove) um administrador com as credenciais definidas em `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Se a conta já existir, a senha é sincronizada com `ADMIN_PASSWORD`. Se essas variáveis não forem definidas, nenhum administrador é criado. Não há credenciais padrão.

O administrador pode listar usuários, excluir partidas e remover contas de outros usuários pelo painel administrativo.

## Autenticação

`POST /auth/login` devolve um token JWT (HS256, validade de 7 dias, para o usuário não ser desconectado no meio do uso). O frontend o envia no cabeçalho `Authorization: Bearer <token>`. A cada requisição, o middleware valida o token e confere no banco se o usuário ainda existe e qual é o papel dele, então uma conta excluída ou rebaixada perde o acesso na hora. O logout remove o token do navegador.

## Endpoints principais

Legenda: 🔓 público · 🔐 requer login · 🛡️ requer administrador

- 🔓 `GET /health`
- 🔓 `POST /auth/login`
- 🔐 `GET /auth/me`
- 🔓 `POST /users` (cadastro)
- 🛡️ `GET /users`
- 🛡️ `GET /users/:id`
- 🛡️ `DELETE /users/:id`
- 🔐 `GET /users/:id/profile`
- 🔐 `PUT /users/:id/rating` (avaliar outro usuário)
- 🔐 `DELETE /users/:id/rating`
- 🔐 `GET /ranking`
- 🔐 `POST /matches`
- 🔐 `GET /matches`
- 🔐 `GET /matches/mine`
- 🔐 `GET /matches/:id`
- 🔐 `PUT /matches/:id` (organizador)
- 🔐 `PATCH /matches/:id/cancel` (organizador)
- 🛡️ `DELETE /matches/:id`
- 🔐 `POST /matches/:id/join`
- 🔐 `POST /matches/:id/leave`
- 🔐 `GET /matches/:id/participants`
- 🔐 `GET /teams`
- 🔐 `GET /teams/explore`
- 🔐 `POST /teams`
- 🔐 `POST /teams/:id/requests` (pedir para entrar)
- 🔐 `PATCH /team-requests/:id` (responsável ou admin aprova/recusa)
- 🔐 `DELETE /team-requests/:id` (cancelar pedido, sair do time ou remover jogador)
- 🔐 `GET /team-matches`
- 🔐 `POST /team-matches`
- 🔐 `POST /team-matches/:id/accept`
- 🔐 `PATCH /team-matches/:id/cancel` (dono do time)

## Variáveis de produção

### Render

O arquivo `render.yaml` na raiz descreve o serviço (Blueprint). Se o serviço foi criado manualmente no painel, configure os mesmos valores abaixo.

Root directory: `backend`

Variáveis de ambiente:

```env
DATABASE_URL=sua_url_do_neon
CORS_ORIGIN=https://sua-url-da-vercel
NODE_ENV=production
JWT_SECRET=segredo_aleatorio_com_pelo_menos_32_caracteres
ADMIN_EMAIL=seu_email_de_admin
ADMIN_PASSWORD=senha_forte_com_pelo_menos_8_caracteres
```

O Render define `PORT` automaticamente.

Build command (aplica as migrations no banco antes de compilar; `--include=dev` é necessário porque `NODE_ENV=production` faria o npm pular `typescript` e `prisma`):

```bash
npm ci --include=dev && npm run prisma:generate && npm run prisma:deploy && npm run build
```

Start command:

```bash
npm start
```

Para aceitar desenvolvimento local e produção, `CORS_ORIGIN` pode receber origens separadas por vírgula:

```env
CORS_ORIGIN=http://localhost:5173,https://sua-url-da-vercel
```

### Vercel

Configure:

```env
VITE_API_URL=https://sua-url-do-backend-no-render
```

O build gera a pasta `dist` (configuração em `vercel.json`). Sem `VITE_API_URL`, o site publicado exibe um erro de configuração nas telas em vez de tentar chamar `localhost`.

## Integração contínua

O workflow `.github/workflows/ci.yml` roda lint e build do frontend e build do backend a cada push na `main` e em pull requests.

## Links da entrega

- GitHub: https://github.com/gustavomaciel-stack/Projeto_DesenvolvimentoApli
- Frontend Vercel: `[PENDENTE: adicionar URL após publicação]`
- Backend Render: https://matchpoint-backend-2zsu.onrender.com
- Banco Neon: `[PENDENTE: referência do projeto/banco]`

## Integrantes

- `[PENDENTE: informar nomes dos integrantes]`

## Segurança

Não versione `.env`, senhas, tokens ou URLs completas de conexão. Use os arquivos `.env.example` apenas como documentação das variáveis necessárias.
