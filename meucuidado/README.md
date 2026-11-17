# MeuCuidado 4.3 — botão nativo de instalação do PWA

O site oferece exclusivamente um botão **Instalar app**, sem APK e sem instruções no lugar da instalação.

Quando o Chrome envia `beforeinstallprompt`, o botão dispara imediatamente `prompt()` ao ser tocado: a confirmação de instalação é do Android/Chrome e não pode ser evitada. Quando `navigator.install()` estiver disponível, a mesma ação usa essa API.

Se o site estiver aberto em navegador interno de um aplicativo Android, o botão tenta abrir o endereço diretamente no Chrome por Intent; depois, o Chrome precisa determinar se pode oferecer a instalação. Sem evento ou suporte do navegador, nenhuma página da web consegue iniciar a instalação forçada.

O PWA mantém HTTPS, manifest com URL de início estável, ícones de 192 e 512 pixels, `display: standalone` e service worker para a interface básica offline. A chave de armazenamento `mapadocorpo_goals_v2` não foi alterada.

Endereço: https://sbarboza0811.github.io/testotracker/meucuidado/

Fontes:
- https://web.dev/learn/pwa/installation-prompt?hl=pt-br
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
