# MeuCuidado 4.1 — site instalável (PWA)

O MeuCuidado é um site que pode ser instalado como aplicativo no Android **diretamente pelo navegador**, sem baixar arquivos APK.

Site: https://sbarboza0811.github.io/testotracker/meucuidado/?v=4.1

## Como instalar

1. Abra o site no Chrome do Android.
2. Toque em **Instalar app** na barra superior do site.
3. Confirme no diálogo do Chrome. Se o navegador ainda não oferecer a instalação, use **⋮ > Instalar aplicativo** ou **Adicionar à tela inicial**.
4. O app aparece com ícone no celular e abre em modo standalone (sem a barra do navegador).

O evento JavaScript \`beforeinstallprompt\` só é emitido quando o navegador determina que o site está pronto para instalação; o botão oferece instruções caso o evento não esteja disponível.

## Funcionalidades

- Avatar profissional 3D Microsoft Rocketbox / Avatar Studio em vistas Corpo, Rosto e Costas.
- Objetivos de saúde e estética vinculados às regiões do corpo.
- Checklists, registro de status, adição e edição de objetivos, busca e filtros.
- Sem cadastro, banco de dados, assistente e controle financeiro.
- Armazenamento local no navegador e exportação/importação de backup JSON.

A instalação PWA utiliza o armazenamento da origem do site; registros locais existentes são preservados quando o navegador usa a mesma origem. Faça backup antes de limpar dados do navegador.

## Técnica

- Manifest com ícones PNG 192/512, display standalone, start_url e scope dentro de /meucuidado.
- Service worker versionado para recursos locais e cache de bibliotecas e avatar 3D.
- Three.js 0.186.1.
- Avatar derivado da Microsoft Rocketbox Avatar Library (MIT), adaptado por Avatar Studio (MIT).

O personagem 3D é baixado na primeira abertura e pode ser armazenado em cache para uso posterior, dependendo do navegador. O site exige conexão para a instalação e algumas operações iniciais.

## Android nativo histórico

A compilação Android via Capacitor permanece arquivada no repositório, mas **não é mais oferecida no site nem executada automaticamente**. Esta versão prioriza exclusivamente a instalação via navegador (PWA). Os arquivos anteriores do usuário e as tabelas Supabase não foram alterados.
