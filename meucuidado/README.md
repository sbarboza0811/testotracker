# MeuCuidado · Saúde & Estética

Aplicativo web instalável (PWA) de organização pessoal para objetivos de saúde e estética, procedimentos, consultas, orçamentos, despesas e histórico.

## O que funciona
- Gestão de objetivos (área, prioridade, etapa, especialidade, data-alvo, estimativa, anotações).
- Ideias iniciais editáveis: dentista, visão, obstrução nasal, olheiras, orelhas e papada. São ideias, não recomendações médicas.
- Agenda de consultas, retornos, locais e profissionais.
- Financeiro com orçamento estimado, despesas previstas/pagas e total por área.
- Histórico de exames, avaliações, evolução e referências a documentos privados.
- Busca e filtros, exportação JSON e importação no modo local.
- Navegação responsiva, manifesto PWA e cache da interface.
- Modo local para demonstração; Supabase opcional com autenticação e RLS.

## Como abrir o protótipo
1. Hospede a pasta em um servidor estático com HTTPS (por exemplo, GitHub Pages em repositório novo). Para teste no computador, execute `python -m http.server 8000` na pasta e abra `http://localhost:8000`.
2. Em **Modo local**, o app salva apenas no armazenamento do navegador. Não use o modo local para prontuários ou dados clínicos reais/sensíveis: não há autenticação e os dados podem ser apagados.
3. No Android, abra o site HTTPS no Chrome e use **Adicionar à tela inicial** / **Instalar aplicativo**.

## Usar o mesmo Supabase que o TestoTracker
Projeto identificado: `testotrack` (`efcjhktuihnldrddrtat`), URL `https://efcjhktuihnldrddrtat.supabase.co`.

1. Acesse o **SQL Editor** deste projeto e execute `supabase.sql`. O arquivo cria apenas as quatro tabelas com prefixo `meucuidado_`; não altera tabelas existentes.
2. Confira se a Data API expõe o schema `public` e se as tabelas estão acessíveis ao papel `authenticated`.
3. No app, abra **Configurações**, informe a URL (já sugerida) e a **publishable key** do projeto. Não coloque chave `service_role` nem `secret` em frontend, arquivos públicos ou GitHub.
4. Entre com sua conta Supabase. A autenticação é compartilhada com o TestoTracker, mas os dados deste app ficam em suas próprias tabelas e com políticas RLS por usuário.
5. Os objetivos de exemplo do modo local **não são enviados automaticamente** para o banco. Isso evita misturar dados de demonstração com dados reais.

> Não foi possível executar o SQL automaticamente durante a criação desta versão: o conector Supabase retornou falha de autenticação do banco. O app e o SQL foram preparados, mas as tabelas ainda precisam ser criadas/confirmadas no projeto.

## Estrutura

- `index.html`: interface.
- `assets/app.css`: design responsivo.
- `assets/app.js`: funcionalidades e integração Supabase.
- `supabase.sql`: esquema PostgreSQL e RLS.
- `manifest.webmanifest`, `icon.svg`, `sw.js`: instalação PWA.

## Privacidade e segurança
- Saúde e estética podem conter dados pessoais sensíveis. O banco usa RLS baseada no usuário autenticado e acesso somente `authenticated` às tabelas `meucuidado_`.
- Cada registro relacionado a um objetivo tem chave estrangeira composta `(user_id, plan_id)`, impedindo vinculação a objetivos de outra conta.
- Links de documentos devem ser privados; o aplicativo não faz upload de anexos nesta versão.
- As configurações armazenam apenas URL e chave pública; sessões de login são gerenciadas pelo SDK Supabase.
- Não registre dados clínicos sensíveis no modo local em dispositivos compartilhados.
- A aplicação é um organizador pessoal, não substitui profissionais de saúde ou prontuários oficiais.

## Referências de implementação
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Data API: https://supabase.com/docs/guides/api/securing-your-api
- SDK JS 2.119.0: https://github.com/supabase/supabase-js/releases/tag/v2.119.0

## Publicação no GitHub Pages
O aplicativo é publicado na pasta `meucuidado/` do repositório `testotracker`, mantendo arquivos e dados do TestoTracker intactos. O manifesto com `id`, `start_url` e `scope` relativos garante instalação independente. O script `assets/cloud-config.js` contém somente chave **publishable** pública, nunca credenciais privilegiadas.