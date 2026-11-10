# Listagem de bairros no painel administrativo

## Problema

A tela “Regiões e bairros” mostrava as regiões e o formulário de novo bairro, mas não exibia os bairros existentes. Isso dificultava a consulta antes do cadastro e provocava tentativas de duplicação.

## Correção

Foi adicionada, antes do formulário, a seção “Bairros já cadastrados e disponíveis”, com nome, cidade/UF, taxa e prazo de entrega. A busca ignora diferenças de maiúsculas e acentos. Todas as páginas do endpoint são consultadas, evitando esconder bairros além dos primeiros 200 registros. Há estados de carregamento, lista vazia, busca sem resultados e erro com nova tentativa, além do botão “Atualizar bairros”.

Após cadastrar um bairro, a lista é consultada novamente automaticamente. Nenhuma alteração no backend ou na VPS é necessária.

## Escopo e proteção contra duplicidade

O endpoint existente `GET /bairros` retorna somente bairros ativos vinculados a regiões ativas. Essa limitação é informada na tela; a seção não representa uma listagem administrativa de registros inativos. A API continua rejeitando nomes duplicados na mesma cidade e UF com erro 409, inclusive quando o registro conflitante não aparece na lista pública. A lista auxilia a consulta; a garantia contra duplicidade continua no backend/banco de dados.

## Evidências automatizadas

`src/components/Administration.test.tsx` verifica:

- Consulta de uma segunda página, totalizando 201 bairros, e busca de “Água Fria” pelo texto “agua fria”.
- Atualização da lista após cadastro e envio dos campos previstos pela API.
- Mensagem de erro de consulta e recuperação por nova tentativa, sem confundir falha com lista vazia.

Os testes usam respostas simuladas. Para validação manual, entrar como administrador, abrir “Regiões e bairros”, pesquisar um cadastro existente e cadastrar um bairro de teste ainda não existente para conferir a atualização automática. Não foram criados registros no banco de produção durante esta correção.
