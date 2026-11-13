<div align="center">

<img src="imagens/Log%C3%B3tipo%20sem%20fundo%20FloristEver.png" alt="FloristEver" width="210">

# FloristEver

### Um pequeno jardim. Uma grande história para fazer crescer.

Cultiva flores, acolhe clientes e cria a floricultura dos teus sonhos num jogo cozy feito para jogar ao teu ritmo.

<a href="https://floristever.netlify.app"><strong>🌷 JOGAR FLORISTEVER</strong></a>

<br>

<a href="https://floristever.netlify.app">Jogar agora</a> · <a href="#o-jogo">Descobrir o jogo</a> · <a href="#para-programadores">Executar localmente</a> · <a href="https://github.com/LightDevPT/FloristEver/issues">Reportar um problema</a>

</div>

<br>

<p align="center">
  <img src="imagens/banner%20FloristEver%20no%20Jardim%20Floral%20.png" alt="O jardim e a floricultura de FloristEver" width="100%">
</p>

<p align="center"><em>Respira fundo. O jardim está à tua espera.</em></p>

## O jogo

Em **FloristEver**, cada flor começa com uma semente e cada dia traz um novo motivo para cuidar da tua loja. Prepara a terra, planta, rega e colhe. Depois, abre as portas, conhece os clientes e transforma as flores em ramos especiais.

Melhora a floricultura, explora novos espaços e descobre surpresas escondidas. Não há pressa: este jardim cresce contigo.

### Faz florescer a tua floricultura

| 🌱 Cultiva | 💐 Cria | 🏡 Cresce | ✨ Descobre |
| --- | --- | --- | --- |
| Planta, cuida e colhe uma coleção de flores. | Combina flores, embrulhos e acessórios em ramos únicos. | Atende clientes, completa encomendas e melhora a loja. | Explora novas zonas, temas sazonais e o Subsolo opcional. |

<p align="center">
  <img src="imagens/Anima%C3%A7%C3%A3o%20do%20FloristEver%20no%20Jardim.gif" alt="Uma visita animada ao jardim FloristEver" width="560">
</p>

## Joga à tua maneira

- **No navegador:** [joga já](https://floristever.netlify.app), sem instalação.
- **Como aplicação web:** instala a PWA a partir de um navegador compatível.
- **Android e Windows:** o projeto inclui configurações de compilação para as versões nativas.
- **Sem conta:** o jogo guarda o progresso localmente. A conta e a sincronização entre dispositivos são opcionais.

## Para programadores

### Requisitos

- Node.js 20 ou superior e npm.
- JDK 17+, Android Studio e Android SDK para compilar a versão Android.
- Windows para criar os instaladores Windows.

### Começar

```bash
git clone https://github.com/LightDevPT/FloristEver.git
cd FloristEver
npm install
npm start
```

Abre [http://localhost:8080](http://localhost:8080) no navegador.

### Preparar uma versão para jogar

| Comando | Para que serve |
| --- | --- |
| `npm start` | Iniciar o jogo localmente. |
| `npm run build:web` | Criar a versão web em `dist/`. |
| `npm run validate` | Construir e validar a versão web. |
| `npm run standalone` | Gerar uma versão HTML autónoma. |
| `npm run win:installer` | Criar o instalador Windows. |
| `npm run android:apk:debug` | Criar um APK Android de depuração. |

Os ficheiros de build e distribuição estão limitados ao que é necessário para compilar e executar o jogo.

## O teu progresso

O jogo guarda o progresso neste dispositivo e funciona sem conta. A sincronização opcional pode ligar-se a um serviço de contas alojado separadamente; o código desse serviço e as suas credenciais não fazem parte deste repositório.

Para a build de produção, configura `LOGIN_API_ORIGIN` nas variáveis privadas do alojamento com a origem do serviço de contas. O projeto ignora localmente pastas de testes, documentação de desenvolvimento, ferramentas privadas e segredos. Mantém as tuas configurações locais em `.env`, nunca no repositório.

## Feito com carinho

**FloristEver** é um jogo independente da **Light Group**, construído com JavaScript, HTML, CSS e Canvas 2D. O projeto usa Node.js, Capacitor, Electron e Netlify nas respetivas versões e serviços.

Encontraste um problema ou tens uma ideia? [Abre uma issue](https://github.com/LightDevPT/FloristEver/issues).

---

<div align="center">

*Entra, escolhe as tuas sementes e deixa o jardim crescer.* 🌷

</div>
