# Revisão de segurança do frontend — 08/11/2026

## Escopo e método

Repositório `Klaralima/BeloCupCake-frontend`, partindo do commit `95bd6f533860d4a4911a7d6396e7ad66ac6d66bd`.

- Inventário da árvore atual do GitHub e conferência dos arquivos locais pelos hashes Git.
- Busca de padrões de segredos nos 96 arquivos de texto versionados e revisão das ocorrências.
- Busca nos diffs disponíveis dos 17 commits acessíveis pela história de `main`. Imagens e o conteúdo do lockfile inicial omitido pelo endpoint de commits não foram analisados nessa busca histórica. Não foi feita análise de branches não alcançáveis por `main`, logs do GitHub Actions ou conteúdo visual de imagens.
- Revisão manual do cliente HTTP, autenticação, renderização dos dados, imagens, rotas, consultas privadas e configuração do servidor frontend.
- Auditoria das dependências usando `bun audit` sobre `bun.lock`, incluindo dependências de desenvolvimento.
- Testes automatizados de regressão, TypeScript, lint dos arquivos alterados e build de produção.

Esta é uma revisão limitada do código e das dependências, não um pentest completo nem uma certificação de segurança. Não inclui auditoria independente do backend, MySQL, VPS ou das configurações internas de hospedagem do Lovable.

## Resultado sobre exposição de credenciais

Não foram identificadas credenciais reais nos padrões e trechos revisados. As ocorrências de senha na busca histórica eram mensagens de validação e uma senha fictícia de teste. Não foi encontrado token JWT completo, token GitHub, identificador de chave AWS ou bloco de chave privada pelos padrões utilizados. A busca por padrões não garante a detecção de todo segredo possível.

`VITE_API_BASE_URL=http://127.0.0.1:8000` é uma configuração de desenvolvimento. `127.0.0.1` é o endereço de loopback da máquina que faz a chamada. A URL pública da API também não é segredo. Variáveis `VITE_` são incorporadas ao frontend e não devem conter senhas, chave de assinatura JWT ou credenciais do banco.

## Achados e correções

### 1. Dependências com avisos de segurança

A auditoria inicial apontou avisos em 11 pacotes, incluindo dependências transitivas. Foram atualizadas as versões afetadas no manifesto e/ou lockfile, entre elas Vite, Vitest/mocker, Seroval, Zod, shell-quote, launch-editor, brace-expansion, js-yaml, nanoid, source-map-js e minimatch.

Existiam avisos classificados como críticos e altos pelo catálogo de dependências. Essa classificação é do pacote e não demonstra exploração no aplicativo. Parte das dependências é usada somente na compilação, testes ou análise de código. Não foi identificado um ataque realizado contra o site.

Para minimatch, foi utilizado um override limitado às faixas modernas de versão 7 a 10, mantendo as dependências legadas que exigem a API antiga. O lockfile passou a utilizar formato 3 e exige Bun compatível; a versão registrada em `packageManager` é `bun@1.4.4`. Instalações reproduzíveis devem usar `bun install --frozen-lockfile`.

Resultado após a atualização: `bun audit --json` retornou `{}`, sem avisos conhecidos na consulta realizada. Esse resultado depende do catálogo e da data da análise e pode mudar com novos avisos.

Referências de exemplos dos avisos tratados:

- https://github.com/advisories/GHSA-pqg4-j6r4-53mv
- https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
- https://github.com/advisories/GHSA-g3hv-75wg-m249

### 2. Resposta de login após encerramento da sessão

Foi reproduzido em teste que uma resposta atrasada de login podia restaurar o usuário e o token após executar logout. A sessão passou a utilizar um contador de versão para rejeitar resultados de tentativas anteriores após logout ou nova tentativa de login.

Além disso, um erro 401 de uma requisição antiga só encerra a sessão quando o token da requisição corresponde ao token ativo. Consultas privadas são canceladas e removidas na saída e na troca de sessão. A autorização real de cada operação continua sendo responsabilidade da API.

### 3. Proteções preventivas no cliente HTTP

Requisições com token ou corpo usam `cache: no-store`. O cliente não envia cookies automaticamente e rejeita redirecionamentos HTTP, evitando seguir um destino inesperado durante chamadas autenticadas. Não foi demonstrado vazamento prévio pelo cache ou por redirecionamento.

### 4. Imagens externas

O componente aceita URLs HTTPS sem usuário/senha embutidos e usa `referrerPolicy="no-referrer"`. URLs inválidas ou inseguras utilizam a imagem padrão. O formulário administrativo também informa o erro ao cadastrar uma URL fora desse formato.

Essas medidas reduzem conteúdo misto e divulgação do endereço da página ao servidor da imagem. Uma imagem externa ainda faz o navegador se conectar ao provedor, que pode receber o IP do visitante. Para eliminar esse contato com terceiros, as imagens precisam ser hospedadas em infraestrutura controlada pelo projeto.

### 5. Arquivos de ambiente

O `.gitignore` agora ignora `.env` e variantes, mantendo como exceções apenas `.env.example` e `.env.production`, que contêm configuração pública. Arquivos `.pem` e `.key` também foram incluídos. Essa proteção reduz inclusões acidentais futuras; não remove segredos de commits antigos, caso eles venham a ser encontrados.

## Validação

- 15 testes do frontend aprovados, incluindo o caso de login atrasado que falhava antes da correção, isolamento de 401, limpeza do cache privado, opções de transporte e imagens.
- Verificação TypeScript aprovada.
- Compilação de produção aprovada.
- Lint dos arquivos alterados sem erros; permanecem avisos de organização de exports para Fast Refresh, sem relação com autorização.
- Auditoria do lockfile sem avisos conhecidos após as atualizações.

Os testes de HTTP usam respostas simuladas e não substituem repetir cadastro, compra e entrega no site publicado. A publicação é uma etapa separada do commit.

## Pontos de atenção remanescentes

- Manter apenas JWT em memória evita sua persistência em localStorage, mas não protege contra todo ataque XSS. Não foi identificado fluxo atual que injete dados da API como HTML bruto. O componente genérico de gráficos contém uma inserção de CSS/HTML, mas não está conectado a dados de usuário nas telas atuais; mudanças futuras devem preservar essa separação.
- O backend deve verificar perfil, titularidade dos pedidos, estoque e transições independentemente dos botões disponíveis no frontend. Seu funcionamento anterior não prova ausência de vulnerabilidades.
- Não foram testadas limitação de tentativas de login, revogação de tokens no servidor ou resistência a carga.
- Não há garantia sobre segredos eventualmente presentes em branches fora do escopo, artefatos ou logs não examinados.
- Reexecutar a auditoria ao atualizar dependências e não expor o servidor de desenvolvimento à internet.
