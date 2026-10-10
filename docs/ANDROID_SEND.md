# FloristEver Android - Envio Simples

## Opcao mais facil

No Windows, abre/clica:

```text
Criar-Android-Para-Enviar.bat
```

Ou no terminal:

```bash
npm run android:share:debug
```

O resultado aparece em:

```text
release/android/
```

## O que enviar

Para envio direto, envia:

```text
release/android/FloristEver-Android-debug.apk
```

Para criar uma pagina de download, publica a pasta inteira:

```text
release/android/
```

E envia o link para:

```text
download.html
```

## No telemovel Android

1. Abrir o APK ou a pagina `download.html`.
2. Tocar em instalar.
3. Se aparecer bloqueio, permitir temporariamente instalar apps desconhecidas para o navegador/gestor de ficheiros.
4. Depois da instalacao, voltar a desativar essa permissao.

## Importante

O pacote debug e pratico para testes e envio direto. Para distribuicao publica, usa uma release assinada ou Google Play Internal Testing.
