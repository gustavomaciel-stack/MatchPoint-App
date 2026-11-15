# MatchPoint — times, confrontos e previsão

## Atualização no Windows

Copie os arquivos deste pacote para a pasta existente do projeto, preservando os
arquivos `.env` da raiz e de `backend`. Pare os dois servidores antes de copiar.
Use seu banco de desenvolvimento para a primeira execução.

No terminal, a partir da raiz do projeto:

```powershell
cd backend
npm.cmd ci
npx.cmd prisma generate
npx.cmd prisma migrate status
npx.cmd prisma migrate deploy
npm.cmd run build
npm.cmd run dev
```

Em outro terminal, aberto na raiz:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run dev
```

Abra a URL impressa pelo Vite. Localmente, o front usa
`VITE_API_URL=http://localhost:3001` e o back precisa aceitar a origem utilizada
pelo Vite em `CORS_ORIGIN`.

## Conferência com duas contas

1. Entre com a conta A e cadastre Fut de Quinta, Futsal, com 8 integrantes.
2. Publique um confronto 5 × 5 para amanhã, com um local em Novo Hamburgo e
   a opção Ao ar livre marcada. Confira o status Buscando adversário.
3. Use uma janela anônima para entrar com a conta B. Cadastre outro time de
   Futsal com pelo menos 5 integrantes e aceite o confronto.
4. Atualize a primeira janela. Confira Confronto confirmado, os dois nomes e o
   jogo em Meus confrontos entre times nas duas contas.
5. Consulte a previsão. Confira temperatura e chance de chuva ou o aviso de
   indisponibilidade. Para uma data a mais de seis dias, confira o aviso de
   que a consulta está fora do período disponível.
6. Cancele com a conta A e confira o status na conta B após atualizar.
7. Confira que um time com menos de 5 integrantes ou de outro esporte não
   pode aceitar. Para testar concorrência, use dois adversários elegíveis em
   duas contas para aceitar o mesmo confronto. Apenas um deve ser confirmado.
8. Teste login, F5, logout e uma partida individual, incluindo criação,
   edição e participação.

## Publicação

- Envie os arquivos de código, a migração e o schema ao repositório GitHub.
- No Render, preserve DATABASE_URL, JWT_SECRET e CORS_ORIGIN.
  Gere o cliente Prisma e aplique `npx prisma migrate deploy` usando o banco
  de produção antes de iniciar a nova versão do back. Com backup disponível,
  confira o status das migrações e o endpoint de saúde após o deploy.
- Na Vercel, mantenha VITE_API_URL apontando para o back no Render. Faça o
  deploy do front depois de verificar o back. Inclua o domínio público do
  front em CORS_ORIGIN no Render.
- Repita os testes no site público. Preencha a URL da Vercel e os nomes
  completos dos integrantes no README antes de entregar os links.

## Implementação

Routes e controllers recebem as requisições autenticadas. O service valida
as regras de elegibilidade e o repository grava via Prisma no PostgreSQL.
O aceite usa uma atualização condicional para garantir um único adversário.
O cadastro inicial permite criar e listar os próprios times. O organizador
pode cancelar o confronto.

A previsão consulta a Open-Meteo no front, sob demanda, para confrontos ao
ar livre em Novo Hamburgo. A hora exibida e usada na consulta é a de Brasília.
