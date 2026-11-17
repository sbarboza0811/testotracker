# MeuCuidado 4.0 — Mapa do Corpo

## Novo conceito

Aplicativo Android instalável por APK, além da versão Web. O foco é acompanhar objetivos pessoais de saúde e estética ligados a partes do corpo.

- Navegação simples e mobile-first: Corpo 3D, Objetivos e Detalhes.
- Corpo e cabeça realmente 3D, zoom, rotação e seleção de regiões.
- Lista de melhorias por região: olheiras, visão, nariz/respiração, orelhas, dentes, papada, cintura, postura etc.
- Objetivos próprios, checklists e status, sem qualquer recomendação automática de procedimentos.
- Sem assistente, orçamento, conta ou Supabase.
- Registros locais, backup/importação JSON.

## Novo modelo profissional

Substituído o modelo anatômico nu e o avatar criado com peças improvisadas.
Novo avatar vem do projeto profissional [Avatar Studio](https://github.com/memoriesrohit/avatar-studio), com personagem da [Microsoft Rocketbox Avatar Library](https://github.com/microsoft/Microsoft-Rocketbox), sob licença MIT.
Personagem padrão: Ethan (casual), com roupas, cabelo, rosto e texturas integrados em um único arquivo glTF.
Arquivo de 13,1 MB carregado de CDN para a Web; **empacotado dentro do APK**, que não depende de download do avatar quando instalado.

## Aplicativo Android

Projeto nativo gerado com Capacitor 8, compilado automaticamente via GitHub Actions.
Fonte do APK: workflow `.github/workflows/meucuidado-android.yml`, diretório `mobile/`.
Quando a compilação for concluída, o APK é publicado em:
https://github.com/sbarboza0811/testotracker/releases/download/mapa-do-corpo-v4.0/Mapa-do-Corpo-v4.0.apk

A distribuição inicial é via **APK assinado com chave de depuração** para instalação direta. Não é um app publicado na Play Store. Atualizações futuras podem exigir reinstalação caso a chave de assinatura mude; a versão final deverá ser assinada com chave própria e estável, guardada como segredo do GitHub.
Usuários Android podem precisar habilitar permissão de instalação de fontes externas para instalar o arquivo.

## Licenças

Personagem e movimentos: Microsoft Rocketbox Avatar Library (MIT), © Microsoft. Consulte `THIRD_PARTY_NOTICES.md` do projeto Avatar Studio.
Conversão e uso: Avatar Studio (MIT), © Rohit Biradar.
Three.js (MIT), Capacitor (MIT).

## Privacidade / migração

O app não usa login, anúncios ou banco de dados. Salva objetivos apenas neste dispositivo.
Chave local na Web: `mapadocorpo_goals_v2`, preservada desde a versão anterior.
O APK tem armazenamento local próprio e **não lê automaticamente registros do navegador**. Use Exportar Backup no site e Restaurar no app se precisar migrar seus objetivos.
As antigas tabelas Supabase não foram excluídas nem utilizadas.

## Limites

O personagem é um avatar genérico, não representa medidas ou anatomia pessoais.
Os objetivos iniciais são exemplos de organização, não diagnósticos ou indicação médica.
Na Web é preciso internet para carregar o personagem pela primeira vez. No Android, o arquivo 3D faz parte do APK.
