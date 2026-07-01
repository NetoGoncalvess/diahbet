# DiahBet 🏆

Bolão da fase mata-mata da Copa do Mundo 2026. Você (admin) cadastra os jogos, qualquer um acessa o link, digita o nome e chuta o placar — sem senha, sem cadastro.

## O que tem

- `/` — página pública: lista os jogos, cada um com um formulário de palpite (nome + placar)
- `/admin.html` — página de admin: cadastrar jogos, lançar o resultado real, excluir jogos
- `/ranking.html` — ranking de quem mais acertou (placar exato e quem acertou o vencedor)

Se a mesma pessoa mandar o palpite de novo pro mesmo jogo (mesmo nome), o palpite antigo é substituído — assim ela pode corrigir se digitar errado.

## Rodando local

```bash
npm install
cp .env.example .env
# edite o .env com a DATABASE_URL de um Postgres (local ou Neon)
npm start
```

Acessa em `http://localhost:3000`

## Colocando na nuvem (Render + Neon — mesmo esquema do AgendePlus)

### 1. Banco de dados (Neon)
1. Crie um banco gratuito em https://neon.tech
2. Copie a "Connection string" (algo como `postgresql://usuario:senha@ep-xxxx.neon.tech/neondb?sslmode=require`)

### 2. Backend (Render)
1. Suba essa pasta num repositório no GitHub
2. No Render, crie um **Web Service** apontando pra esse repositório
3. Build command: `npm install`
4. Start command: `npm start`
5. Em **Environment**, adicione a variável `DATABASE_URL` com a connection string do Neon
6. Deploy. O Render te dá uma URL do tipo `https://diahbet.onrender.com`

Pronto — essa mesma URL já serve o site inteiro (página pública, admin e ranking), não precisa de Vercel separado, porque o Express já serve os arquivos estáticos da pasta `public/`.

### 3. Compartilhar com a galera
- Manda o link principal (`https://diahbet.onrender.com`) pro grupo — é ali que todo mundo chuta o placar
- Só você acessa `https://diahbet.onrender.com/admin.html` pra cadastrar os jogos e lançar os resultados reais
- Depois que lançar os resultados, o ranking em `/ranking.html` atualiza automaticamente

## Observações

- Não tem login/senha de propósito — qualquer um com o link do admin consegue cadastrar jogos ou editar resultados. Se quiser, mais pra frente dá pra proteger o `/admin.html` com uma senha simples fixa (posso adicionar se você quiser).
- Os nomes dos jogos e o placar real você mesmo digita à mão na página de admin, com base no jogo real da Copa.
