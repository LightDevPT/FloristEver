# PROMPT: CRIAR O SISTEMA "LIGHT GROUP LOGIN" (NODE.JS + MONGODB)

## 1. PAPEL E OBJETIVO
Atua como programador backend sénior com especialização em segurança de aplicações. Constrói um sistema completo de autenticação chamado "Light Group Login": um serviço independente e reutilizável (várias aplicações/jogos do Light Group poderão usá-lo), com registo, login, gestão de sessões e recuperação de conta, usando MongoDB.

Prioridades, por ordem: (1) segurança, (2) fiabilidade, (3) clareza do código, (4) boa experiência para o utilizador.
Não inventes mecanismos criptográficos próprios: usa bibliotecas reconhecidas e as práticas atuais (OWASP). Se algo for ambíguo, toma uma decisão segura, continua e lista todos os pressupostos no fim.

## 2. TECNOLOGIA
- Node.js (LTS atual) com Express, em JavaScript moderno (ES modules) ou TypeScript (preferência: TypeScript).
- MongoDB com Mongoose (compatível com MongoDB Atlas; ligação por variável de ambiente MONGODB_URI).
- Hash de palavras-passe: argon2 (variante argon2id). Parâmetros iniciais: memoryCost 65536 KiB (64 MB), timeCost 3, parallelism 1, configuráveis por env. Suporta pepper opcional (PASSWORD_PEPPER) e rehash automático se os parâmetros mudarem.
- Validação de entrada: zod (ou equivalente) em todas as rotas.
- Segurança HTTP: helmet, cors com lista branca de origens (ALLOWED_ORIGINS), express-rate-limit (com store em memória por defeito e preparado para Redis), cookie-parser, proteção contra NoSQL injection (rejeitar objetos/operadores como $ne, $gt nos campos de entrada; aceitar apenas strings).
- Tokens: jsonwebtoken (ou jose) para access tokens; refresh tokens opacos aleatórios.
- Emails: nodemailer com SMTP configurável por env; em desenvolvimento, em vez de enviar, escreve o link na consola.
- Testes: vitest/jest + supertest + mongodb-memory-server.
- Logs: pino, sem nunca registar palavras-passe, tokens ou cookies.
- Nunca colocar segredos no código nem no repositório. Fornecer .env.example completo e comentado.

## 3. ESTRUTURA DO PROJETO
light-group-login/
  src/
    server.ts (arranque)  |  app.ts (Express, middlewares)
    config/ (env.ts com validação das variáveis, db.ts)
    models/ (User.ts, RefreshToken.ts, EmailToken.ts, AuditLog.ts, Save.ts)
    routes/ (auth.routes.ts, user.routes.ts, save.routes.ts)
    controllers/  |  services/ (auth, password, token, email, save)
    middlewares/ (auth, rateLimit, validate, errorHandler, csrf)
    utils/ (passwordPolicy.ts, commonPasswords.ts, crypto.ts, errors.ts)
    emails/ (templates em HTML simples)
  tests/
  .env.example  |  README.md  |  Dockerfile (opcional)  |  package.json

## 4. REGISTO DE CONTA
Campos: email, username (nome de utilizador), password, confirmPassword. Aceitar também o consentimento dos termos/política de privacidade (campo obrigatório acceptTerms: true).
- Email: formato válido, normalizado (minúsculas, trim), máximo 254 caracteres. Guardar em emailLower com índice único.
- Username: 3 a 20 caracteres, apenas letras, números, ponto, hífen e underscore; deve começar por letra ou número; único sem distinguir maiúsculas (usernameLower com índice único); lista de nomes reservados proibidos (admin, root, support, lightgroup, etc.). Guardar também a versão com a capitalização original para mostrar.
- Palavra-passe: tem de cumprir TODA a política da secção 5, validada sempre no servidor (a validação do frontend é só ajuda).
- Após registo: a conta fica com emailVerified = false e é enviado um email de verificação. O login só é permitido com email verificado (configurável por env REQUIRE_EMAIL_VERIFICATION, por defeito true).
- Resposta de registo genérica: não revelar se um email já existe (anti-enumeração). Se o email já existir, enviar ao dono um email a avisar da tentativa em vez de criar conta duplicada.
- Garantir unicidade a nível de base de dados (índices únicos), tratando corretamente a condição de corrida (erro E11000).

## 5. POLÍTICA DE PALAVRA-PASSE (OBRIGATÓRIA)
Implementar em utils/passwordPolicy.ts uma função única, partilhada por registo, alteração e reposição de palavra-passe. A palavra-passe só é aceite se cumprir TODAS estas regras:
- Mínimo de 12 caracteres e máximo de 128.
- Pelo menos 1 letra minúscula, 1 letra maiúscula, 1 número e 1 símbolo (ex.: !@#$%^&*()-_=+[]{};:,.?/).
- Sem espaços no início ou no fim.
- Não pode conter o username nem a parte local do email (antes do @), em qualquer capitalização.
- Não pode estar numa lista de palavras-passe comuns (incluir no projeto uma lista com pelo menos as 10.000 mais comuns, ou, se não for possível, as 1.000 mais comuns, e também verificar variantes simples como "Password123!").
- Não pode ter sequências óbvias (123456, abcdef, qwerty) nem mais de 3 caracteres iguais seguidos (ex.: aaaa).
- Opcional e configurável (HIBP_CHECK=true): verificar se a palavra-passe aparece em fugas de dados usando a API Have I Been Pwned com k-anonymity (enviar só os primeiros 5 caracteres do hash SHA-1). Se o serviço falhar, não bloquear o registo (falha aberta) mas registar um aviso.
A resposta de erro deve devolver a lista das regras falhadas (sem eco da palavra-passe), para o frontend as mostrar.
Fornecer também uma função de pontuação de força (fraca/média/forte/muito forte) para um indicador visual no frontend.

## 6. LOGIN
- Um único campo "identifier" que aceita email OU nome de utilizador (detetar pelo formato, procurar por emailLower ou usernameLower), mais password.
- Comparação de hash com argon2.verify. Para evitar revelar se a conta existe, executar sempre uma verificação de hash (mesmo contra um hash falso) quando o utilizador não existe, para igualar tempos de resposta.
- Mensagem de erro sempre genérica: "Credenciais inválidas." (nunca dizer se foi o utilizador ou a palavra-passe).
- Bloqueio progressivo: após 5 falhas consecutivas, bloquear a conta durante 15 minutos; falhas seguintes duplicam o tempo (máx. 24 h). Reiniciar o contador após login bem-sucedido. Enviar email de aviso ao dono quando a conta for bloqueada.
- Rate limit adicional por IP (ex.: 20 pedidos de login por 15 minutos) e por identifier.
- Em caso de sucesso: criar sessão (secção 7), registar no AuditLog (IP, user-agent, data) e atualizar lastLoginAt.
- Se o hash antigo precisar de rehash por parâmetros desatualizados, fazer rehash e gravar no login.

## 7. SESSÕES E TOKENS
- Access token JWT de curta duração (15 minutos), com sub (id do utilizador), iat, exp, jti. Assinado com segredo forte (JWT_ACCESS_SECRET, mínimo 32 bytes aleatórios; recusar arrancar se for fraco).
- Refresh token opaco de 256 bits aleatórios, validade 14 dias (30 com "lembrar-me"), guardado na base de dados apenas como HASH (SHA-256), nunca em claro, com userId, deviceInfo, ip, createdAt, expiresAt, revokedAt, replacedBy.
- Entrega por cookies httpOnly, Secure, SameSite=Strict (ou Lax se necessário para o fluxo), com path restrito para o refresh. Também suportar Authorization: Bearer para clientes que não usem cookies (ex.: app móvel), configurável.
- Rotação de refresh tokens: cada refresh emite um novo token e revoga o anterior. Se um token já revogado for reutilizado (sinal de roubo), revogar TODA a cadeia de sessões do utilizador e avisar por email.
- Proteção CSRF para rotas com cookies (verificação de Origin/Referer + token CSRF double-submit nas rotas que alteram estado).
- Logout (revoga o refresh token atual) e logout de todos os dispositivos.
- Listagem de sessões ativas (dispositivo, IP aproximado, última utilização) com opção de revogar cada uma.

## 8. VERIFICAÇÃO DE EMAIL E RECUPERAÇÃO
- Tokens de uso único gerados com crypto.randomBytes(32), guardados como hash, com expiração (verificação: 24 h; reposição de palavra-passe: 1 h), invalidados após uso.
- POST /auth/forgot-password: resposta sempre igual ("Se o email existir, enviámos instruções"), com rate limit.
- POST /auth/reset-password: valida o token, aplica a política da secção 5, grava novo hash, revoga TODAS as sessões ativas e envia email de confirmação.
- POST /auth/resend-verification com rate limit.
- Alteração de palavra-passe autenticada: exige a palavra-passe atual, aplica a política, revoga as outras sessões.
- Alteração de email: exige palavra-passe e confirmação por email no novo endereço antes de ser efetiva.

## 9. ENDPOINTS (prefixo /api/v1)
Auth: POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout, POST /auth/logout-all, GET /auth/verify-email?token=, POST /auth/resend-verification, POST /auth/forgot-password, POST /auth/reset-password.
Utilizador (autenticado): GET /users/me, PATCH /users/me (username), POST /users/me/change-password, POST /users/me/change-email, GET /users/me/sessions, DELETE /users/me/sessions/:id, GET /users/me/export (descarregar todos os dados em JSON), DELETE /users/me (apagar conta; exige palavra-passe).
Progresso de jogo (autenticado, para o FloristEver e outras apps; ver secção 10): GET /saves/:appId, PUT /saves/:appId, GET /saves/:appId/backups, POST /saves/:appId/restore/:backupId.
Utilidade: GET /health (sem dados sensíveis).
Todas as respostas em JSON com formato consistente { ok, data?, error?: { code, message, details? } } e códigos HTTP corretos. Mensagens de erro em Português de Portugal; códigos de erro estáveis em inglês (ex.: PASSWORD_TOO_WEAK).

## 10. GUARDAR PROGRESSO (INTEGRAÇÃO COM FLORISTEVER)
Modelo Save: userId, appId (ex.: "floristever"), saveVersion, revision (inteiro que sobe a cada gravação), deviceId, data (objeto JSON, limite de tamanho, ex.: 256 KB), checksum (SHA-256 do data), updatedAt.
- PUT /saves/:appId recebe { data, baseRevision, deviceId, checksum }. Se baseRevision for menor que a revisão atual no servidor, responder 409 Conflict com os metadados do save do servidor (revision, updatedAt, deviceId e um resumo), sem sobrescrever. O cliente decide: manter o seu, o do servidor, ou o de maior progresso.
- Antes de cada substituição, guardar a versão anterior numa coleção SaveBackup (manter as últimas 10 por utilizador/app).
- Validar checksum e tamanho; rejeitar dados que não sejam JSON válido. Limitar a frequência de gravação (rate limit).
- Cada utilizador só pode aceder aos seus saves (filtrar sempre por userId do token, nunca confiar em IDs enviados pelo cliente).

## 11. MODELOS DE DADOS (MONGODB)
User: _id, email, emailLower (único), username, usernameLower (único), passwordHash, emailVerified, failedLoginAttempts, lockUntil, lastLoginAt, createdAt, updatedAt, termsAcceptedAt, status (active/disabled), roles (por defeito ["user"]).
RefreshToken: userId (índice), tokenHash (índice único), family, deviceInfo, ip, expiresAt (índice TTL para limpeza automática), revokedAt, replacedBy.
EmailToken: userId, type (verify/reset/change-email), tokenHash, expiresAt (TTL), usedAt, newEmail (opcional).
AuditLog: userId, event (register, login_success, login_fail, lockout, password_change, password_reset, token_reuse_detected, account_delete…), ip, userAgent, createdAt (TTL de 180 dias). Nunca guardar dados sensíveis.
Save e SaveBackup conforme a secção 10.
Usar índices adequados, sanitizar sempre os inputs e nunca devolver passwordHash nem campos internos nas respostas (usar toJSON com whitelist).

## 12. SEGURANÇA GERAL (CHECKLIST OBRIGATÓRIA)
- HTTPS obrigatório em produção (HSTS), cookies Secure.
- Limite de tamanho do corpo dos pedidos (ex.: 100 KB; 300 KB na rota de saves).
- Cabeçalhos de segurança com helmet; CORS restrito.
- Erros nunca expõem stack traces em produção.
- Comparações de tokens em tempo constante (crypto.timingSafeEqual).
- Variáveis de ambiente validadas no arranque; falhar se faltar um segredo.
- Dependências fixas e comando de auditoria (npm audit) documentado.
- Proteção contra enumeração de utilizadores em registo, login e recuperação.
- Princípio do menor privilégio: utilizador da base de dados só com os acessos necessários (documentar no README).
- Proteção de dados pessoais: minimização (recolher só email, username e dados de jogo).

## 13. RGPD / PRIVACIDADE
- Consentimento aos termos e política de privacidade guardado com data.
- Exportação de dados (GET /users/me/export) e apagamento total (DELETE /users/me), que remove utilizador, sessões, tokens, saves, backups e anonimiza logs.
- Retenção limitada de logs e tokens (índices TTL).
- Emails de marketing só com consentimento separado (campo marketingOptIn, por defeito false).

## 14. FRONTEND DE EXEMPLO (OPCIONAL, MAS PREFERÍVEL)
Páginas simples em HTML/CSS/JS puro (sem frameworks), servidas em /demo ou numa pasta separada:
- Ecrã de Entrar (campo "Email ou nome de utilizador" + palavra-passe, botão mostrar/ocultar palavra-passe), Criar conta (com indicador de força e lista das regras da palavra-passe a ficar verde em tempo real), Esqueci-me da palavra-passe, Repor palavra-passe, Verificar email, Sessões ativas.
- Estilo "Light Group": minimalista, luminoso e acolhedor, cantos arredondados, mensagens claras em Português de Portugal, acessível (labels, foco visível, navegação por teclado, contraste adequado, atributos autocomplete corretos para gestores de palavras-passe: username, current-password, new-password).
- Um pequeno módulo JavaScript reutilizável (lightLoginClient.js) com funções register, login, refresh automático, logout e saves, para o FloristEver o importar facilmente.

## 15. TESTES E CRITÉRIOS DE ACEITAÇÃO
Testes automáticos obrigatórios para: política de palavra-passe (aceita e rejeita cada regra); registo com email/username duplicados (incluindo concorrência); login por email e por username; mensagens genéricas; bloqueio após falhas e desbloqueio; expiração e rotação de refresh tokens; deteção de reutilização de refresh token; fluxo completo de verificação e recuperação; tentativas de NoSQL injection ({"$ne": ""}); rate limiting; conflito de revisão em saves (409); isolamento entre utilizadores (A não acede aos dados de B); apagamento de conta.
O projeto só está concluído quando: todos os testes passam, o .env.example está completo, o README explica instalação, configuração do MongoDB Atlas, execução, testes e deploy, e a checklist da secção 12 está cumprida.

## 16. ENTREGA
1. Resumo curto da arquitetura e pressupostos.
2. Todos os ficheiros completos, um a um, prontos a copiar.
3. README com instruções passo a passo (incluindo como gerar segredos seguros: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))").
4. Lista de melhorias futuras sugeridas (2FA por app autenticadora, login com Google/Apple, deteção de dispositivos novos, Redis para rate limit).

Se a resposta for demasiado grande, entrega por fases, com cada fase funcional: (1) base: servidor, MongoDB, registo, login e política de palavra-passe; (2) sessões, refresh tokens e bloqueios; (3) emails, verificação e recuperação; (4) saves, RGPD, frontend de exemplo e testes finais.

usa .env para guardar informações privadad do jogo como o link que liga o jogo ao mongoDB