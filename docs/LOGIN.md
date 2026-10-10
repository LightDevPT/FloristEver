# Login e progresso partilhado

Foi adicionada uma integração para o `Light Group Login`.

## Desenvolvimento local

1. Arranca o backend:

```bash
cd light-group-login
npm install
copy .env.example .env
npm run dev
```

2. Arranca o jogo:

```bash
npm start
```

3. Abre `http://localhost:8080` e usa o botão `Conta`.

## Produção

- Configura `MONGODB_URI`, `JWT_ACCESS_SECRET`, SMTP e `ALLOWED_ORIGINS` no `.env` do backend.
- Publica a API em HTTPS.
- Antes de fazer `npm run build:web`, define `LOGIN_API_ORIGIN` com a origem do backend para a CSP.

O fluxo principal usa nome de utilizador e palavra-passe segura. Email/verificação ficam desligados por defeito, por isso o jogo mantém save local offline e sincroniza com a cloud quando existe sessão iniciada.

Quando um jogador estiver como convidado e criar conta pelo menu de definições, o jogo inicia sessão automaticamente e envia o progresso local existente para o MongoDB como primeiro save da conta.
