import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CompraProvider, Comprar, Pedidos } from './Commerce';
import { apiRequest, type Produto } from '@/lib/api';

vi.mock('@/lib/auth', () => ({ useAuth: () => ({token: 'teste', usuario: {id: 1, perfil: 'CLIENTE'}}) }));
vi.mock('@/lib/api', () => ({apiRequest: vi.fn(), API_BASE_URL: "https://example.test"}));
const request = vi.mocked(apiRequest);
const produto = {id: 3, nome: 'Chocolate', preco: '8.50', estoque: 2, ativo: true} as Produto;
function montar(element: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}>{element}</QueryClientProvider>);
}
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('Compra e acompanhamento', () => {
  it('limita o carrinho ao estoque e envia somente os dados aceitos pela API', async () => {
    let resolver!: (value: unknown) => void;
    request.mockImplementation(async (path, options) => {
      if (path === '/bairros') return [{id: 4, nome: 'Centro', cidade: 'João Pessoa', uf: 'PB', taxa_entrega: '5.00', prazo_minutos: 40}];
      if (path === '/pedidos' && options?.method === 'POST') return new Promise(resolve => { resolver = resolve; });
      return [];
    });
    montar(<CompraProvider><Comprar produto={produto} /></CompraProvider>);
    fireEvent.click(screen.getByText('Adicionar ao carrinho'));
    fireEvent.click(screen.getByLabelText('Aumentar Chocolate'));
    expect(screen.getByLabelText('Aumentar Chocolate')).toBeDisabled();
    await screen.findByText('Centro — João Pessoa/PB');
    fireEvent.change(screen.getByLabelText('Bairro'), {target: {value: '4'}});
    fireEvent.change(screen.getByLabelText('Logradouro'), {target: {value: 'Rua Um'}});
    fireEvent.change(screen.getByLabelText('Número'), {target: {value: '10'}});
    fireEvent.change(screen.getByLabelText('CEP'), {target: {value: '58000-000'}});
    const form = screen.getByText('Confirmar pedido').closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    const posts = request.mock.calls.filter(([p,o]) => p === '/pedidos' && o?.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(posts[0]?.[1]?.body).toEqual({bairro_id: 4, logradouro: 'Rua Um', numero: '10', complemento: null, cep: '58000000', itens: [{produto_id: 3, quantidade: 2}]});
    resolver({id: 1});
    await screen.findByText('Carrinho (0)');
  });

  it('mantém o carrinho quando a API rejeita o pedido', async () => {
    request.mockImplementation(async (path, options) => {
      if (path === '/bairros') return [{id: 4, nome: 'Centro', cidade: 'João Pessoa', uf: 'PB', taxa_entrega: '5.00', prazo_minutos: 40}];
      if (options?.method === 'POST') throw new Error('Estoque insuficiente.');
      return [];
    });
    montar(<CompraProvider><Comprar produto={produto}/></CompraProvider>);
    fireEvent.click(screen.getByText('Adicionar ao carrinho'));
    await screen.findByText('Centro — João Pessoa/PB');
    fireEvent.change(screen.getByLabelText('Bairro'), {target: {value: '4'}});
    fireEvent.submit(screen.getByText('Confirmar pedido').closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Estoque insuficiente.');
    expect(screen.getByText('Carrinho (1)')).toBeInTheDocument();
  });

  it('oferece ao entregador aceitar apenas entregas disponíveis', async () => {
    request.mockImplementation(async path => path === '/entregas/disponiveis' ? [{pedido_id: 9, bairro_nome: 'Centro', cidade: 'João Pessoa', uf: 'PB'}] : []);
    montar(<Pedidos perfil="ENTREGADOR"/>);
    fireEvent.click(screen.getByText('Escolher entrega disponível'));
    fireEvent.click(await screen.findByText('Aceitar entrega'));
    await waitFor(() => expect(request).toHaveBeenCalledWith('/entregas/9/aceitar', {method: 'POST', token: 'teste'}));
    expect(screen.queryByText('Iniciar rota')).not.toBeInTheDocument();
  });
});
