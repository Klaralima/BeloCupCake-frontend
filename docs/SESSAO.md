# Sessão por perfil do navegador

O servidor do frontend (TanStack Start, hospedado no Lovable) atua como intermediário entre o navegador e a API FastAPI. O endereço publicado continua igual e não é necessária atualização da VPS.

- Login: o servidor recebe o JWT da API, valida a conta e grava cookie `__Host-belocupcake`, com `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` e duração limitada ao prazo informado pela API (máximo de 24 horas). A API continua verificando assinatura e expiração em toda operação autenticada.
- O navegador recebe somente usuário e SHA-256 do JWT. Esse identificador não é uma credencial: sem o cookie não permite autenticação. Ele impede que uma aba desatualizada faça uma compra usando outra conta selecionada no navegador.
- Recarregar consulta `/bff/session` antes de mostrar as páginas privadas. Falha de conexão oferece nova tentativa, sem apagar o cookie.
- Abas compartilham o cookie. BroadcastChannel, evento de armazenamento e verificação ao recuperar foco sincronizam a interface. O armazenamento local contém apenas aviso aleatório de mudança, nunca senha/JWT/dados da conta.
- Web Locks serializa entrada e saída entre abas. Navegadores sem suporte recebem erro ao tentar autenticar; use navegador atualizado em HTTPS.
- Uma conta já conectada precisa sair antes de trocar. A saída remove o cookie pelo servidor, limpa consultas privadas e informa as outras abas. Se a rede falhar, a interface informa que não foi possível sair.
- Dados privados e carrinho são descartados ao mudar a sessão. O carrinho não persiste ao recarregar.
- Requisições usam cabeçalho próprio e verificação de origem contra CSRF, destino fixo, lista de recursos permitidos, prazo de resposta e rejeição de redirecionamento. Respostas não usam cache.
- Cookie de desenvolvimento sem Secure é permitido apenas em HTTP localhost/127.0.0.1/IPv6 loopback, com outro nome. Produção exige HTTPS.

## Limites

A saída remove a credencial do navegador, mas não adiciona revogação de JWT ao FastAPI. Uma cópia roubada previamente continuaria válida até expirar, como no modelo anterior. Revogação centralizada exige trabalho adicional no backend. Não foi alterada a duração configurada na API, nem criada renovação automática; a expiração exige novo login. Perfis de navegador, janela anônima e dispositivos distintos mantêm sessões independentes. Abas suspensas sincronizam ao retomar; o servidor rejeita operações com identificador de uma sessão anterior.

## Validação manual

1. Entre como cliente, atualize com F5: a conta deve permanecer.
2. Abra o mesmo endereço em outra aba: deve mostrar a mesma conta.
3. Acesse `/login` enquanto conectado: deve informar a conta atual e orientar a sair.
4. Saia em uma aba: as demais devem deixar de mostrar dados da conta.
5. Entre com outra conta: todas as abas ativas devem refletir a nova conta, sem carrinho ou pedidos anteriores.
6. Repita com administrador e entregador. Verifique cadastro, catálogo e fluxo de pedido/entrega.
7. Uma janela anônima pode usar outra conta, pois tem armazenamento isolado.
8. Simule falha de rede no logout: deve aparecer erro, sem confirmação falsa de saída.

Testes automatizados cobrem cookie, recuperação, CSRF, identificação de aba antiga, expiração, falha de rede, sincronização e limpeza de dados. A integração publicada é verificada sem credenciais; o roteiro autenticado deve ser realizado pela responsável com suas contas de teste.
