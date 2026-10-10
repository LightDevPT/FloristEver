# FloristEver - Medidas de Seguranca Aplicadas

## Aplicacao Web

- CSP restritiva em `index.html` e nos headers gerados para deploy
- Remocao de dependencias externas de fontes
- Service worker limitado a mesma origem
- `localStorage` tratado como dado nao confiavel para receitas e encomendas
- Headers anti-clickjacking e anti-MIME-sniffing no `server.js`
- Bloqueio de path traversal e dotfiles no servidor local

## Electron/Windows

- Renderer sem acesso a Node.js
- `contextIsolation` ativo
- `sandbox` ativo
- Novas janelas bloqueadas
- Pedidos de permissoes negados por omissao
- CSP aplicada por headers da sessao Electron

## Android/Capacitor

- `webDir` aponta para `dist/`
- Scheme Android configurado como `https`
- Sem plugins/permissoes extra configurados
- `allowBackup=false`
- `usesCleartextTraffic=false`
- Network security config bloqueia cleartext HTTP
- Permissao `INTERNET` removida enquanto o jogo nao precisa de rede

## Antes de Publicar

Executa:

```bash
npm run validate
npm run security:audit
```

Depois revê os artefactos em `dist/`, `release/` ou `android/app/build/outputs/` antes de os distribuir.
