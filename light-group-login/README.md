# Light Group Login

Serviço de autenticação e sincronização de progresso para jogos Light Group, incluindo o FloristEver.

## Arquitetura

- Supabase Auth gere credenciais, email e palavras-passe.
- Supabase Postgres guarda perfis, sessões da aplicação, tokens de email, auditoria, saves e backups.
- As tabelas têm Row Level Security ativo e não têm políticas públicas; apenas o servidor, com a chave `service_role`, acede aos dados.
- O registo requer email. O login continua a aceitar email ou nome de utilizador.
- Os tokens de acesso e refresh da API mantêm o formato usado pelo cliente do jogo.

## Configuração

1. Cria um projeto Supabase e ativa o fornecedor Email nas definições de Auth.
2. No SQL Editor do Supabase, executa [20261008000000_initial_schema.sql](./supabase/migrations/20261008000000_initial_schema.sql).
3. Cria o `.env` a partir do exemplo:

   ```bash
   copy .env.example .env
   ```

4. Preenche `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` com os valores do projeto. A chave `secret` é exclusivamente para o servidor: nunca a publiques no frontend nem em mensagens.
5. Gera um segredo aleatório com pelo menos 32 caracteres e coloca-o em `JWT_ACCESS_SECRET`.
6. Configura um servidor SMTP para emails de verificação, recuperação e segurança. A aplicação recusa arrancar em produção sem `SMTP_HOST`; sem SMTP, os endpoints de email falham explicitamente e nunca escrevem ligações com tokens nos logs.
7. Instala as dependências e inicia o serviço:

   ```bash
   npm install
   npm run dev
   ```

O endpoint `GET /api/v1/health` confirma a ligação ao Postgres do Supabase. A ligação falha explicitamente se as credenciais ou o schema não estiverem configurados.

## Migrar do MongoDB existente

Faz primeiro uma cópia de segurança do MongoDB. Executa o schema acima no Supabase, configura as três variáveis Supabase e mantém temporariamente `MONGODB_URI` disponível apenas para o processo de migração. Depois:

```bash
npm run migrate:mongodb
```

O comando migra perfis com email, saves, backups e auditoria, registando os identificadores de origem para permitir retomar uma migração interrompida. Perfis sem email são ignorados e contabilizados; adiciona-lhes um email no sistema antigo ou cria-os novamente no novo sistema antes de os migrar. Sessões e tokens temporários não são transferidos. As palavras-passe antigas (hashes Argon2) não são copiadas para Supabase Auth: cada conta importada recebe uma palavra-passe aleatória não divulgada e o utilizador terá de usar o fluxo de recuperação de palavra-passe para definir uma nova.

Não apagues o MongoDB antes de confirmar os totais e testar o login, a recuperação da palavra-passe, os saves e o restauro de backups no Supabase.

## FloristEver

O jogo usa `js/light-login-client.js`.

- Em desenvolvimento, aponta para `http://localhost:4000/api/v1`.
- Em produção web, publica a API no mesmo domínio ou define `LOGIN_API_ORIGIN` para o endereço HTTPS da API e executa `npm run build:web` no projeto FloristEver.
- Adiciona as origens do frontend a `ALLOWED_ORIGINS`.

## Permissões de desenvolvimento

Cria primeiro a conta pelo fluxo normal e confirma o email. Num terminal controlado, com as variáveis do Supabase configuradas, atribui ou remove o papel:

```bash
npm run developer:grant -- --username <utilizador>
npm run developer:revoke -- --username <utilizador>
```

Em produção, acrescenta `--confirm-production`. A operação regista a alteração na auditoria e apenas altera uma conta existente.

## Testes e endpoints

```bash
npm test
npm run audit
```

Endpoints mantidos para o cliente:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/verify-email?token=...`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/users/me`
- `GET /api/v1/saves/floristever`
- `PUT /api/v1/saves/floristever`
