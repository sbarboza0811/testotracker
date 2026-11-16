# Mapa do Corpo — MeuCuidado 2.0

Novo aplicativo mobile-first de saúde e estética, sem cadastro, finanças ou assistente.

## O que faz
- Mapa anatômico **3D verdadeiro** feito com Three.js e WebGL, com rotação, zoom e vistas corpo / cabeça / costas.
- Seleção de regiões por marcadores no 3D e também por uma lista acessível.
- Objetivos e checklists ligados às regiões (olheiras, visão, nariz, orelhas, dentes, papada, abdômen etc.).
- Criar, editar, concluir, excluir objetivos e marcar etapas realizadas.
- Busca e filtros, lista de áreas disponíveis e marcadores com objetivos.
- Salvamento automático **somente neste navegador** (localStorage).
- Exportação/importação de backups JSON.
- PWA instalável no Android. Arquivos essenciais são armazenados em cache. Three.js é carregado pela CDN jsDelivr, na versão fixada 0.186.1, podendo exigir internet inicialmente.

## Como usar
Acesse https://sbarboza0811.github.io/testotracker/meucuidado/ e use o mapa 3D. Para instalar no Android, abra no Chrome e escolha "Instalar aplicativo" no menu.

## Privacidade e limites
- **Sem login, sem Supabase, sem rastreio, sem envio de dados pessoais a servidores por este aplicativo.**
- Registros estão limitados ao navegador/aparelho e podem desaparecer se o armazenamento for apagado. Para conservar uma cópia, use **Backup**.
- Dados de versões anteriores salvos no Supabase não são importados automaticamente; as tabelas antigas não são alteradas ou excluídas.
- Os 8 objetivos iniciais são itens editáveis para organização e **não são diagnóstico, indicação ou necessidade médica**.
- O modelo 3D é uma representação humana estilizada, não um exame clínico ou um escaneamento personalizado.
- A CDN do Three.js é usada apenas para fornecer a biblioteca de renderização, não para guardar os registros do aplicativo.

## Arquivos
- index.html: interface
- assets/map.css: design responsivo
- assets/map.js: objetivos, listas, checklists, backup local
- assets/body3d.js: corpo e cabeça tridimensionais, OrbitControls e hotspots
- sw.js e manifest.webmanifest: PWA

As antigas tabelas meucuidado_* no Supabase ficam intactas e não são utilizadas por esta versão.
