# MatchPoint — endereço, horários e navegação

Extraia este ZIP na raiz do projeto atualizado. Pare os dois servidores antes
de substituir os arquivos. O ZIP preserva os arquivos .env e as dependências.

No terminal do backend, usando a conexão do ambiente que deseja atualizar:

```powershell
npx.cmd prisma migrate status
npx.cmd prisma migrate deploy
npx.cmd prisma generate
npm.cmd run dev
```

No terminal da raiz:

```powershell
npm.cmd run dev
```

A nova migração acrescenta uma coluna opcional. Confrontos anteriores
continuam usando o nome do local no Google Maps quando não há endereço.

## Testar

1. Em Entre times, publique um confronto futuro com endereço e abra o Maps.
2. Em Minhas partidas, clique na aba Entre times ao lado de Vou participar.
3. Tente publicar uma partida individual e um confronto para ontem. Repita
   com a data de hoje e um horário já passado. O formulário deve impedir ambos.
4. Confira que as partidas e os confrontos vencidos não aparecem nas listas
   ao carregar a página. Os registros continuam no banco.
