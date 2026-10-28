# TestoTrack 3.0

PWA pessoal para acompanhar alimentação, treino, cronograma, sono, hidratação, suplementos e evolução.

Aplicativo: https://sbarboza0811.github.io/testotracker/

## Funcionalidades
- **Hoje:** cronograma diário com quantidades por tarefa (alimentos em gramas, água em ml, séries, suplementos e meta de sono), marcação visível de concluído/ignorado e registro direto da atividade.
- **Diário:** refeição planejada ou livre por gramas, macros e fibras, água, suplementos e sono. A busca externa identifica produtos industrializados pelo Open Food Facts (login no Supabase obrigatório), permite ditar o nome em navegadores compatíveis e confirma o rótulo antes de adicionar automaticamente ao catálogo pessoal. O registro completo de múltiplos alimentos por uma única fala ainda não está disponível.
- **Treinar:** fichas AB, ABC e ABCD editáveis, séries com carga/repetições, histórico, descanso e cardio.
- **Evolução:** medidas corporais, tendência de peso, indicadores semanais e registro de exames.
- **Modelos:** todas as dietas no mesmo painel **Minhas dietas**, incluindo opções por objetivo e **três cardápios adicionais de 2.000, 2.250 e 2.500 kcal com patinho, ovos, sementes de abóbora e castanhas**; prévia por refeição, gramas e macros antes de aplicar; modelos personalizados e suplementos opcionais.
- **Ajustes:** metas, horários, dias de treino, backup JSON, autenticação e nuvem.
- **Água:** impede a duplicação acidental da mesma quantidade em 45 segundos, sem impedir o registro de novas doses ao longo do dia; oferece histórico, exclusão de itens e desfazer o último registro.
- **Conclusões:** refeições e água são marcadas por registros efetivos, suplementos por confirmação; a preparação para dormir pode ser marcada como realizada independentemente do registro das horas de sono.

Os dados nutricionais iniciais são **estimativas por 100 g**, para fins de planejamento. Verifique rótulos e tabelas confiáveis; modelos não substituem orientação nutricional, médica ou física.

## Dados e migração
- V3 grava localmente no navegador com a chave `testotrack-v3-local-v1`.
- A versão anterior está preservada em [legacy.html](legacy.html), com a chave original `testotrack-data-v1` intacta.
- A migração v2 → v3 é **opcional** e não remove nem edita os dados v2, locais ou da tabela Supabase `user_snapshots`.
- Para importar do aparelho: Ajustes → Importar versão 2.1.
- Para importar da nuvem antiga: conecte sua conta e escolha Importar dados da versão 2.1 na área de migração.
- Exporte backup JSON antes de trocar de aparelho, importar dados ou resolver conflitos.

## Sincronização com Supabase
- Supabase Auth por e-mail e senha.
- Dados privados ficam na tabela `testotrack_v3`, com Row Level Security e política de posse por usuário.
- A sincronização **não é ativada automaticamente**: entre na conta e escolha **Ativar/enviar** uma vez.
- Após ativar, modificações são salvas imediatamente no aparelho e enviadas quando houver internet.
- A sincronização usa revisão condicional para impedir que dois aparelhos sobrescrevam silenciosamente a mesma versão.
- Caso haja conflito, faça backup e escolha qual conjunto de dados manter, explicitamente. Não existe mesclagem automática de registros conflitantes.
- Os arquivos do aplicativo são públicos no GitHub, mas **nenhum dado pessoal, senha ou chave secreta** é gravado no repositório.
- A chave Supabase no navegador é publishable, protegida pelas políticas RLS do banco.

## Offline e lembretes
- O shell do aplicativo e os registros locais funcionam offline após uma primeira abertura online. Login e sincronização precisam de internet.
- Os lembretes opcionais só são disparados **enquanto o aplicativo estiver aberto**. Notificações push em segundo plano ainda não foram implementadas.
- Recursos como leitura de código de barras, reconhecimento inteligente de refeições inteiras em áudio, Health Connect e modelo corporal 3D ficam para versões futuras.

## Segurança e saúde
O aplicativo é um diário e uma ferramenta de planejamento. Não diagnostica deficiência hormonal, não recomenda doses individuais de suplementos nem substitui avaliação profissional.

## Restauração
A branch `backup-testotrack-v2-before-v3` preserva o código anterior à migração. A interface antiga também está em `legacy.html`.
