# MeuCuidado 4.2 — Aplicativo instalável diretamente do site

É um PWA (Progressive Web App), como o TestoTrack: ícone próprio, tela própria, instalação a partir do Chrome e sem APK.
Site: https://sbarboza0811.github.io/testotracker/meucuidado/

## Android (Chrome)

- Abra o endereço acima no Chrome, fora de navegadores internos de apps.
- Quando o Chrome habilitar a instalação, o botão do site muda para **Instalar app** e chama o diálogo de instalação do navegador.
- Se a instalação ainda não for disponibilizada pelo navegador, aparece **Como instalar**, com instruções para o menu ⋮ do Chrome.
- O Chrome decide quando oferecer a instalação; o site não pode instalá-lo silenciosamente.
- Após instalar, o MeuCuidado aparece com ícone na lista de aplicativos e abre em modo standalone, sem barra de endereço.

## Arquitetura de instalação

- Manifest com id `./` e início estável `./index.html` (sem parâmetros de versão); `display: standalone`, orientação retrato, ícones 192 e 512.
- Service worker `meucuidado-shell-v15` guarda a interface básica em cache e controla acesso offline.
- Compatível com `navigator.install()` quando disponível e com `beforeinstallprompt` no Chrome tradicional.
- Cabeçalho e marca própria, navegação inferior responsiva e ícone distinto do TestoTrack.
- Não existe fluxo de download de APK nesta aplicação web.

## Dados e 3D

- Objetivos, etapas e estados guardados localmente sob a mesma chave `mapadocorpo_goals_v2`.
- Os dados da versão web permanecem nesta mesma origem e podem ser exportados como JSON.
- Avatar Rocketbox, preparado pelo projeto Avatar Studio sob licença MIT. Requer internet no primeiro carregamento; a interface básica funciona sem ele.
- O avatar é genérico, não é uma representação pessoal ou diagnóstico.

## Fontes
- https://developer.chrome.com/docs/modern-web-guidance/guides/pwa/install-web-app
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
