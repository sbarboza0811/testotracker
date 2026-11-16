# Mapa do Corpo — MeuCuidado 3.1

Aplicativo/PWA para organizar objetivos pessoais de saúde e estética por região do corpo, sem cadastro, finanças, IA ou Supabase.

## Modelo 3D

O antigo corpo anatômico masculino nu e a bermuda artificial foram inteiramente substituídos.
O novo personagem usa ativos MakeHuman CC0 do projeto CharacterCreator: corpo masculino 3D e roupas reais (camiseta, calça jeans, tênis), mais cabelo curto opcional.
É possível girar, ampliar e visualizar o corpo, a cabeça e as costas.
Os marcadores estão vinculados a olhos, nariz, orelhas, dentes, papada, cabelo, tronco, braços, abdômen, pernas e costas.

O renderizador oculta na própria malha do personagem as regiões cobertas pelas roupas usando o atributo _CCZONE.
Corpo e vestuário são carregados e montados antes de a cena mostrar o personagem. Se alguma peça indispensável falhar, aparece um fallback sem exibir o modelo nu.

## Funcionalidades
- Objetivos editáveis por região, checklist, status e anotações.
- Busca, filtros e exportação/importação de backup JSON.
- Armazenamento automático local no navegador, sem login e sem banco de dados.
- PWA instalável no Android. Primeiro download dos modelos requer internet.

## Licenças e créditos
Ativos 3D MakeHuman CC0 exportados pelo projeto CharacterCreator:
https://github.com/kblood/CharacterCreator
Créditos detalhados e declaração de licença dos arquivos output/*.glb (CC0):
https://github.com/kblood/CharacterCreator/blob/master/LICENSE-NOTES.md
Three.js: MIT.
O código deste visualizador é próprio; não incorpora arquivos de código GPL do CharacterCreator.

Arquivos do modelo usam este commit fixo pela CDN:
https://cdn.jsdelivr.net/gh/kblood/CharacterCreator@852e48f316b90a0937234886630e4fb4cdfd1f78/output/

## Privacidade e compatibilidade
Os oito objetivos iniciais são exemplos editáveis, não diagnósticos ou indicação de tratamento.
A chave de armazenamento mapadocorpo_goals_v2 foi mantida para preservar registros anteriores salvos no mesmo navegador.
O backup é importante: limpar dados do navegador ou reinstalar o app pode apagar objetivos locais.
As tabelas antigas de Supabase não foram alteradas nem importadas.
Os modelos vêm por CDN. Dados pessoais não são enviados ao servidor de modelos.
Se a conexão ou o WebGL falharem, a lista e os checklists permanecem disponíveis.

## Correções de download 3.1
- Os arquivos GLB são obtidos diretamente do GitHub Raw, com fallback automático para jsDelivr. O download mostra percentual, valida o cabeçalho GLB e controla timeout.
- Adicionado botão Instalar com instruções quando o navegador não permite instalação direta.
- Fallback com botão Tentar baixar novamente.
- Os objetivos preservam a chave localStorage mapadocorpo_goals_v2.
