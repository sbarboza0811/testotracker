# TestoTrack 3.0

PWA pessoal para acompanhar alimentação, treino, cronograma, sono, hidratação, suplementos e evolução.

Aplicativo: https://sbarboza0811.github.io/testotracker/

## Acesso à conta

- **Entrar / Criar conta** fica sempre visível no canto superior direito, em todas as telas.
- Um toque abre uma página dedicada a e-mail e senha, com botões claros para **Entrar** e **Criar conta**.
- Depois de entrar, o mesmo botão passa a mostrar **Minha conta**.
- A sincronização opcional e a saída da conta ficam nessa página; as preferências de metas continuam em **Mais → Ajustes e dados**.
- Criar conta não exige configurar a sincronização; os registros seguem salvos localmente primeiro.

## Layout simplificado (3.1)
- **Hoje:** resumo das calorias, proteínas, água, treino e próximo compromisso, sem atalhos duplicados; o cronograma completo fica recolhido.
- **Diário:** refeições e água, sem botões repetidos para gravar; planos, macros completos e suplementos aparecem sob demanda.
- **Treino:** escolha a ficha e inicie; somente depois aparecem todas as séries. Cardio e edição permanecem disponíveis.
- **Evolução:** peso, cintura, treinos e tendência de peso em destaque; demais medidas e protocolo de 12 semanas em seções recolhidas.
- **Mais:** modelos e dietas, metas e horários, conta, sincronização e backup. Nenhum recurso antigo foi intencionalmente removido.
- Navegação inferior fixa de cinco áreas e seleção de data nas telas de registros. **Um único botão flutuante “🎙 Registrar”**, apenas em Hoje e Diário, concentra o registro por voz; o próprio formulário oferece digitação como alternativa. Os demais controles aparecem somente na área correspondente.
- Os registros e catálogos existentes continuam na mesma estrutura de armazenamento local e Supabase.

## Funcionalidades
- **Hoje:** cronograma diário com quantidades por tarefa (alimentos em gramas, água em ml, séries, suplementos e meta de sono), marcação visível de concluído/ignorado e registro direto da atividade.
- **Diário:** refeição planejada ou livre por gramas, macros e fibras, água, suplementos e sono. A busca externa identifica produtos industrializados pelo Open Food Facts (login no Supabase obrigatório), permite ditar o nome em navegadores compatíveis e confirma o rótulo antes de adicionar automaticamente ao catálogo pessoal. Agora também permite **registrar uma refeição inteira por fala ou texto**, identificando cada alimento e quantidade; mostra uma prévia com os produtos selecionados automaticamente e confirma tudo em um único salvamento. Primeiro consulta o catálogo interno; para alimentos ausentes, pesquisa na base Open Food Facts e os cadastra automaticamente. Se a busca não achar correspondência confiável, tenta uma estimativa nutricional identificada como tal. O recurso de voz depende do navegador.
- **Treinar:** fichas AB, ABC e ABCD editáveis, séries com carga/repetições, histórico, descanso e cardio.
- **Evolução:** medidas corporais, tendência de peso, indicadores semanais e registro de exames.
- **Modelos:** todas as dietas no mesmo painel **Minhas dietas**, incluindo opções por objetivo e **três cardápios adicionais de 2.000, 2.250 e 2.500 kcal com patinho, ovos, sementes de abóbora e castanhas**; prévia por refeição, gramas e macros antes de aplicar; modelos personalizados e suplementos opcionais.
- **Ajustes:** metas, horários, dias de treino, backup JSON, autenticação e nuvem.
- **Água:** impede a duplicação acidental da mesma quantidade em 45 segundos, sem impedir o registro de novas doses ao longo do dia; oferece histórico, exclusão de itens e desfazer o último registro.
- **Conclusões:** refeições e água são marcadas por registros efetivos, suplementos por confirmação; a preparação para dormir pode ser marcada como realizada independentemente do registro das horas de sono.

Os dados nutricionais iniciais são **estimativas por 100 g**, para fins de planejamento. Verifique rótulos e tabelas confiáveis; modelos não substituem orientação nutricional, médica ou física.

## Registro alimentar simplificado

- **Diário → Falar agora:** grava o áudio diretamente no aplicativo via MediaRecorder. Toque em **Parar e transcrever** para enviar a gravação ao Supabase; a transcrição usa Groq Whisper no plano Free e retorna os alimentos para revisão antes de salvar. Não usa o microfone do teclado.
- **Diário → Digitar:** descreva a refeição inteira em linguagem natural.
- **Confira sua refeição:** o app escolhe automaticamente a versão mais provável do alimento, sem pedir que você selecione um resultado. Quantidades faladas são mantidas; quando faltar uma medida, uma porção usual é sugerida como estimativa.
- **Alimento novo:** se não estiver no catálogo, o aplicativo pesquisa primeiro na base Open Food Facts e o cadastra automaticamente ao salvar. Se a busca não encontrar correspondência adequada, tenta estimar a composição típica com o Groq Free e também cadastra ao salvar. Valores calculados por IA aparecem como **estimativas**, não como valores exatos de rótulos.
- **Sem identificação segura:** palavras que não são alimentos não são cadastradas. Itens desconhecidos sem dados minimamente plausíveis são ignorados e informados na prévia, sem interromper os outros.
- **Salvar refeição:** uma única confirmação registra todos os alimentos e cadastra os novos juntos.
- A gravação depende de permissão de microfone, conexão à internet e login no Supabase. O áudio é enviado à API de transcrição e não é salvo no catálogo ou no histórico. Há limite de aproximadamente um minuto/4 MB por gravação.
- **Configuração obrigatória:** crie uma conta gratuita em https://console.groq.com/keys, sem mudar para o plano pago, gere uma chave de API e cadastre-a em Supabase Dashboard → Edge Functions → Secrets, com nome exato `GROQ_API_KEY`. A chave é lida somente no servidor; **nunca** a adicione ao GitHub nem a compartilhe no chat. O serviço não usa mais a API paga da OpenAI; no Groq Free, ao ultrapassar a cota, o pedido é recusado em vez de gerar cobrança. O áudio é enviado ao Groq para transcrição, sob os termos e políticas do serviço.
- As tabelas nutricionais externas devem ser conferidas contra o rótulo do produto.

### Interpretação confiável da fala

A transcrição (Whisper) passa por uma **análise estruturada gratuita no Groq (GPT-OSS 20B)** antes da consulta nutricional. Essa etapa descarta hesitações e palavras não alimentícias, interpreta as quantidades e tenta reconhecer correções. Exemplos:

- **"100 g de arroz, 50 g de feijão, arroz, feijão"** → uma ocorrência de arroz (100 g) e uma de feijão (50 g)
- **"100 g de arroz e mais 50 g de arroz"** → arroz (150 g)
- **"100 g de arroz, não, 50 g de arroz"** → arroz (50 g)
- **"100 g de telefone"** → não deve gerar alimento
- Se a análise online falhar, o programa usa um extrator **conservador** que aceita apenas alimentos conhecidos com quantidades explícitas. Quando não há alimento confiável, pede para refazer a fala. O usuário sempre confirma antes de salvar.
- Produtos externos só são aceitos se seus nomes corresponderem à fala; o aplicativo escolhe a versão mais provável automaticamente. Quando a pesquisa online não retornar resultados adequados, utiliza uma estimativa nutricional típica identificada como tal.

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
- Recursos como leitura de código de barras, Health Connect e modelo corporal 3D ficam para versões futuras.

## Segurança e saúde
O aplicativo é um diário e uma ferramenta de planejamento. Não diagnostica deficiência hormonal, não recomenda doses individuais de suplementos nem substitui avaliação profissional.

## Restauração
A branch `backup-testotrack-v2-before-v3` preserva o código anterior à migração. A interface antiga também está em `legacy.html`.
