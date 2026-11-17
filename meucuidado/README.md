# MeuCuidado 4.4 — instalação PWA igual ao MoneyTracker

O fluxo de instalação foi reconstruído com base no `install-v7.js` de `sbarboza0811/moneytracker`, que usa `beforeinstallprompt` como fonte de verdade.

- `assets/install.js` concentra o instalador e o service worker, separado do gerenciamento de objetivos, 3D e checklists.
- O HTML captura `beforeinstallprompt` antecipadamente para não perder a autorização do Chrome enquanto os scripts carregam.
- **Instalar app** aparece somente quando o Chrome emite `beforeinstallprompt`; ao clicar, chama `prompt()` imediatamente, na interação real.
- Em um navegador interno de aplicativo Android, mostra **Abrir no Chrome**. Após abrir no Chrome, a instalação dependerá da autorização do navegador.
- Sem o evento, não exibe um botão de instalação que não funciona.
- O registro/atualização do service worker é independente do código principal e o app shell fica em cache.
- O manifest mantém ícones 192/512, id e start_url estáveis, display standalone, orientação retrato.
- Os registros continuam na mesma chave local `mapadocorpo_goals_v2`. Nenhum APK.
- O site não pode forçar a instalação quando o navegador não disponibiliza o diálogo.

**Origem do padrão:** `https://github.com/sbarboza0811/moneytracker/blob/main/install-v7.js`

Documentação: https://web.dev/articles/customize-install
