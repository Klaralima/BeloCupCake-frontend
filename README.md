# BeloCupCake — Frontend

Desenvolvi o BeloCupCake como projeto acadêmico do curso de Engenharia de Software. A proposta é representar o processo de compra e entrega de cupcakes, desde a escolha dos produtos até a conclusão da entrega.

Este repositório reúne a interface web, adaptada para uso no computador e no celular. O backend foi desenvolvido em Python com FastAPI e utiliza MySQL para armazenar os dados.

## Objetivo do projeto

Meu foco de aprendizagem foi o desenvolvimento do backend, a modelagem do banco de dados, as regras de negócio e a integração entre as partes da aplicação. Para construir a interface, utilizei o apoio do Lovable e de ferramentas de IA. Defini o escopo, configurei a hospedagem e validei o funcionamento do sistema nos três perfis de acesso.

## Links

- Aplicação publicada: https://screenshot-soul-studio-36.lovable.app
- Backend e documentação geral: https://github.com/Klaralima/BeloCupCake
- Documentação interativa da API: https://belocupcake-api.duckdns.org/docs
- Roteiro de demonstração: https://github.com/Klaralima/BeloCupCake/blob/main/docs/DEMONSTRACAO.md

O endereço DuckDNS atende a API; o link do Lovable abre a interface para os usuários.

## Funcionalidades

| Área | Funções |
| --- | --- |
| Pública | Catálogo paginado, detalhe de produto, cadastro e login |
| Cliente | Carrinho, escolha de bairro, endereço, taxa e prazo estimados, confirmação e histórico de pedidos |
| Administrador | Cadastro/edição de produtos e estoque, ativação/desativação, regiões, bairros e preparo/cancelamento de pedidos |
| Entregador | Escolha de entrega disponível, detalhes das próprias entregas, início de rota e conclusão |

O pagamento é presencial. A API valida preços, estoque, permissões e mudanças de estado. Imagens são URLs públicas opcionais, com imagem padrão em caso de ausência ou falha.

## Tecnologias

React, TypeScript, TanStack Start/Router, TanStack Query, Vite, Tailwind CSS e componentes shadcn/ui. O frontend foi iniciado com Lovable e complementado diretamente pelo código versionado no GitHub. A autenticação e os dados de negócio são fornecidos pelo backend FastAPI com MySQL, não por um banco próprio do frontend.

## Execução local

Pré-requisitos: Node.js 24 e npm.

```bash
git clone https://github.com/Klaralima/BeloCupCake-frontend.git
cd BeloCupCake-frontend
npm install
```

Crie `.env.local` na raiz para apontar para o backend local:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Inicie o frontend:

```bash
npm run dev -- --port 5173
```

Use o endereço exibido pelo terminal. A API deve permitir sua origem no CORS; para esse exemplo, `http://localhost:5173`. Se o servidor iniciar em outra porta, ajuste a origem permitida. O backend precisa estar iniciado para carregar dados.

Na produção, a configuração utiliza:

```dotenv
VITE_API_BASE_URL=https://belocupcake-api.duckdns.org
```

Variáveis com prefixo `VITE_` são incorporadas ao código do navegador. Não coloque nelas senhas, chaves JWT ou credenciais de banco. Alterações da URL requerem nova compilação/publicação.

## Organização

| Caminho | Finalidade |
| --- | --- |
| `src/routes/` | Páginas e composição de rotas |
| `src/components/Commerce.tsx` | Carrinho, checkout, pedidos e entregas |
| `src/components/Administration.tsx` | Gestão de produtos e cadastro de regiões/bairros |
| `src/components/RoleHome.tsx` | Área conforme perfil autenticado |
| `src/lib/api.ts` | Cliente HTTP central e tratamento de respostas da API |
| `src/lib/auth.tsx` | Sessão em memória, login, logout e perfil |
| `src/components/ui/` | Componentes visuais reutilizáveis |

O arquivo `src/routeTree.gen.ts` é gerado pela ferramenta de rotas e não deve ser editado manualmente.

## Testes e compilação

```bash
npx tsc --noEmit
npm test
npm run build
```

A aplicação conta com 8 testes automatizados no frontend. Na validação desta versão, os testes, a verificação TypeScript e a compilação foram concluídos sem erros. Os testes incluem limite de estoque no carrinho, prevenção de envio duplicado, manutenção do carrinho quando a compra é rejeitada e chamada de aceite da entrega. As chamadas HTTP são simuladas nos testes; valide também o fluxo com a API publicada.

Em 08/11/2026, testei o fluxo completo na aplicação publicada: cadastro, login, compra, preparo, aceite pelo entregador e conclusão da entrega.

## Publicação

O código de `main` sincroniza com o projeto Lovable conectado. Depois de conferir a prévia, publique/atualize o projeto para disponibilizar a nova versão no endereço público. Sincronizar GitHub e atualizar a publicação são etapas distintas.

O projeto utiliza TanStack Start e a configuração de build do Lovable, com componentes de servidor. Não trate a saída automaticamente como um site estático composto apenas de um diretório `dist` ao migrar de hospedagem.

## Sessão e limitações

Token e carrinho permanecem apenas na memória. Recarregar a página exige novo login e limpa o carrinho. Não há pagamento online, upload de fotos ou rastreamento GPS. Não há persistência da sessão entre recargas. Os perfis privilegiados são preparados pela responsável, e não selecionados no cadastro público.

O projeto tem finalidade acadêmica e não é utilizado para vendas reais. As credenciais das contas de demonstração são disponibilizadas separadamente aos avaliadores.
