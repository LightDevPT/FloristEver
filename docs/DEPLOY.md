# FloristEver - Build, Export e Deploy Seguro

Este projeto esta preparado para publicar como:

- Web/PWA responsiva em `dist/`
- Android via Capacitor, gerando APK/AAB pelo Gradle
- Windows via Electron, gerando executavel portatil ou instalador

## Requisitos

- Node.js 20 ou superior
- npm
- Para Android: Android Studio, Android SDK, JDK 17 ou superior configurado em `JAVA_HOME`, e `ANDROID_HOME`
- Para Windows: ambiente Windows com permissao para executar Electron Builder

## Preparar dependencias

```bash
npm install
```

## Web/PWA

```bash
npm run validate
npm start
```

O build final fica em `dist/`.

Para publicar em hosting estatico, envia o conteudo de `dist/`. O ficheiro `dist/_headers` cobre Netlify/Cloudflare Pages e `dist/.htaccess` cobre Apache com `mod_headers`.

Headers obrigatorios no hosting:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy` com camera, microfone, geolocalizacao e pagamentos bloqueados
- HTTPS sempre ativo

## Android APK

Na primeira vez:

```bash
npm run android:add
```

Depois de cada alteracao web:

```bash
npm run android:sync
```

APK de debug:

```bash
npm run android:apk:debug
```

APK de release:

```bash
npm run android:apk:release
```

O APK sera criado dentro de `android/app/build/outputs/apk/`.

Se o Gradle indicar que esta a usar Java 16 ou anterior, instala/aponta para JDK 17+ e volta a correr o comando. No Windows, podes configurar `JAVA_HOME` para o JDK 17 nas variaveis de ambiente do sistema ou definir `org.gradle.java.home=C:\\caminho\\para\\jdk-17` em `android/gradle.properties`.

## Android - Enviar e Download Simples

Para criar automaticamente uma pasta pronta para enviar:

```bash
npm run android:share:debug
```

Tambem podes clicar em:

```text
Criar-Android-Para-Enviar.bat
```

Quando terminar, a pasta pronta fica em:

```text
release/android/
```

Ela inclui:

- `FloristEver-Android-debug.apk`
- `download.html` com botao de download
- `README.txt` com instrucoes simples
- `CHECKSUMS.txt` com SHA-256 para confirmar integridade

Formas simples de enviar:

- Enviar diretamente o ficheiro APK por cabo, Drive, WhatsApp, Telegram ou email.
- Publicar a pasta `release/android/` num hosting HTTPS e enviar o link para `download.html`.
- Para testes internos mais profissionais, usar Google Play Console Internal Testing.

Para publicacao real, assina a versao release com uma keystore privada e guarda a keystore fora do repositorio. Nunca coloques passwords, ficheiros `.jks`, `.keystore`, `.env` ou credenciais no projeto.

## Windows

Executavel portatil:

```bash
npm run win:pack
```

Instalador:

```bash
npm run win:installer
```

Os artefactos ficam em `release/`.

## Checklist de Seguranca

- Executar `npm run validate`
- Executar `npm run security:audit`
- Confirmar que `dist/index.html` nao tem scripts inline
- Confirmar que nao existem URLs `http://` ou `https://` no build final
- Publicar apenas `dist/`, nunca a raiz com `node_modules/`
- Servir por HTTPS
- Manter `android/`, `dist/`, `release/`, `.env` e chaves fora do Git
- No Electron, manter `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`
- No Android, pedir apenas permissoes indispensaveis
- No Android, manter `allowBackup=false`, `usesCleartextTraffic=false` e sem permissao `INTERNET` enquanto a app for 100% local/offline

## Notas

O `standalone.html` e uma versao de conveniencia para abrir localmente. Para deploy seguro e PWA, usa sempre `dist/`.
