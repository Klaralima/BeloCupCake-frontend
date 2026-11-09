# BeloCupCake — Frontend

Interface web responsiva do projeto acadêmico BeloCupCake, com catálogo, compra de cupcakes e áreas de administração e entrega.

## Links

- Aplicação publicada: https://screenshot-soul-studio-36.lovable.app
- Backend e documentação geral: https://github.com/Klaralima/BeloCupCake
- Documentação interativa da API: https://belocupcake-api.duckdns.org/docs
- Roteiro de demonstração: https://github.com/Klaralima/BeloCupCake/blob/main/docs/DEMONSTRACAO.md
- Editor Lovable: https://lovable.dev/projects/07fe7566-94cb-441f-8c84-22ca3dcd3daa

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

Ambiente utilizado na validação local: Node.js 24 e npm.

```bash
git clone https://github.com/Klaralima/BeloCupCake-frontend.git
cd BeloCupCake-frontend
bun install --frozen-lockfile
```

Crie `.env.local` na raiz para apontar para o backend local:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Inicie o frontend:

```bash
bun run dev --port 5173
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
| `src/lib/auth.tsx` | Recuperação da sessão, sincronização entre abas, login e logout |
| `src/components/ui/` | Componentes visuais reutilizáveis |

O arquivo `src/routeTree.gen.ts` é gerado pela ferramenta de rotas e não deve ser editado manualmente.

## Testes e compilação

```bash
bunx tsc --noEmit
bun run test
bun run build
bun audit
```

A última validação local registrou 29 testes aprovados, TypeScript sem erros e build concluído. Os testes incluem limite de estoque no carrinho, prevenção de envio duplicado, manutenção do carrinho quando a compra é rejeitada e chamada de aceite da entrega. As chamadas HTTP são simuladas nos testes; valide também o fluxo com a API publicada.

Em 08/11/2026, a responsável pelo projeto confirmou manualmente o fluxo publicado de cadastro, compra, aceite e entrega.

## Publicação

O código de `main` sincroniza com o projeto Lovable conectado. Depois de conferir a prévia, publique/atualize o projeto para disponibilizar a nova versão no endereço público. Sincronizar GitHub e atualizar a publicação são etapas distintas.

O projeto utiliza TanStack Start e a configuração de build do Lovable, com componentes de servidor. Não trate a saída automaticamente como um site estático composto apenas de um diretório `dist` ao migrar de hospedagem.

## Sessão e limitações

A sessão permanece em cookie HttpOnly, Secure e SameSite=Lax, no endereço do front, até a expiração definida pela API ou a saída. Atualizar a página recupera a conta. Abas do mesmo perfil compartilham a sessão; trocar de conta exige sair. O carrinho permanece em memória e é limpo ao recarregar ou trocar de conta. Não há pagamento online, upload de fotos ou rastreamento GPS. Os perfis privilegiados são preparados pela responsável, e não selecionados no cadastro público.

Para avaliação acadêmica, entregue as senhas das contas demonstrativas em canal privado e conceda acesso aos repositórios se permanecerem privados.

## Revisão de segurança

Consulte o [relatório da revisão de 08/11/2026](docs/REVISAO_SEGURANCA.md) para os achados, correções e limites da análise. A URL da API e o exemplo de localhost são públicos por natureza. Nunca use variáveis `VITE_` para senhas ou chaves privadas.

## Sessão compartilhada

A camada de servidor do TanStack Start encaminha `/bff/*` para a API configurada. Não é necessário mudar a VPS. O JWT não é enviado ao JavaScript: um identificador público é usado para detectar abas desatualizadas, mas não autentica sem o cookie. Detalhes e roteiro de teste: [SESSAO.md](docs/SESSAO.md).
