# Mapa do Corpo — MeuCuidado 2.2

Novo aplicativo mobile-first de saúde e estética, sem cadastro, finanças ou assistente.

## O que faz
- Modelo anatômico humano **3D realista**, usando malha de pele Open Anatomy 3D (adaptada de BodyParts3D, HRA e MakeHuman; CC BY 4.0). Malha 3D comprida, renderizada por Three.js/WebGL com rotação, zoom e vistas corpo / cabeça / costas.
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

## Modelo e licença 3D v2.1
O corpo anterior (formas geométricas construídas manualmente) foi substituído por uma malha anatômica externa:
- Open Anatomy 3D, por MervinR07 — https://github.com/MervinR07/open-anatomy-3d
- Modelo em https://cdn.jsdelivr.net/npm/open-anatomy-3d@0.1.0/models/anatomy-male.glb
- Licença do modelo: CC BY 4.0, derivado de BodyParts3D (DBCLS), Human Reference Atlas / HuBMAP e MakeHuman. Consulte https://github.com/MervinR07/open-anatomy-3d/blob/main/ATTRIBUTION.md
- Modificações de visualização: apenas superfície da pele visível; material em tom de argila; órgãos e estruturas internas ocultos. O modelo não é um exame nem deve ser usado para diagnóstico.
- O arquivo de geometria (7,6 MB) é baixado por CDN, necessita de conexão no primeiro carregamento e fica em cache do PWA quando disponível.
- Em falha de WebGL ou rede, a lista e os checklists continuam funcionais.
- A chave de armazenamento de objetivos local permanece idêntica à v2.0, preservando os dados no mesmo navegador/origem.

## Ajuste de privacidade 2.2
- O modelo anatômico masculino original incluía genitália externa. A versão 2.2 coloca um short opaco sobre a região íntima e oculta a malha de pele nesta região para evitar que partes apareçam ao girar o corpo.
- A região íntima não é um objetivo do app. Os demais objetivos e checklists mantêm a mesma chave local de armazenamento.
