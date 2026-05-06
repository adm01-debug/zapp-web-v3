import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShoppingCart } from '../ShoppingCart';

const mockProduct = {
  id: '1',
  name: 'Test Product',
  description: 'Test Description',
  price: 100,
  currency: 'BRL',
  image_url: null,
  category: 'Test Category',
  sku: 'TEST-SKU',
  stock_quantity: 10,
  is_active: true,
};

const defaultProps = {
  items: [
    { product: mockProduct, quantity: 2 },
  ],
  onUpdateQuantity: vi.fn(),
  onRemoveItem: vi.fn(),
  onClearCart: vi.fn(),
  onSendOrder: vi.fn(),
};

describe('ShoppingCart Component', () => {
  it('renders cart items correctly', async () => {
    render(<ShoppingCart {...defaultProps} />);
    
    // Open the sheet
    const trigger = screen.getByTitle('Carrinho');
    fireEvent.click(trigger);
    
    await waitFor(() => expect(screen.getByText('Test Product')).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getAllByText(/R\$ 200,00/)[0]).toBeInTheDocument(); // Item total or Subtotal or Grand total
    expect(screen.getByText('2')).toBeInTheDocument(); // Quantity
  });

  it('calls onUpdateQuantity when incrementing', async () => {
    render(<ShoppingCart {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Carrinho'));
    await screen.findByText('Test Product');

    const plusButton = screen.getByLabelText('Aumentar quantidade');
    fireEvent.click(plusButton);

    expect(defaultProps.onUpdateQuantity).toHaveBeenCalledWith('1', 3);
  });

  it('calls onUpdateQuantity when decrementing', async () => {
    render(<ShoppingCart {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Carrinho'));
    await screen.findByText('Test Product');

    const minusButton = screen.getByLabelText('Diminuir quantidade');
    fireEvent.click(minusButton);

    expect(defaultProps.onUpdateQuantity).toHaveBeenCalledWith('1', 1);
  });

  it('calls onRemoveItem when delete is clicked', async () => {
    render(<ShoppingCart {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Carrinho'));
    await screen.findByText('Test Product');

    const removeButton = screen.getByLabelText('Remover item');
    fireEvent.click(removeButton);

    expect(defaultProps.onRemoveItem).toHaveBeenCalledWith('1');
  });

  it('calls onClearCart when clear button is clicked', () => {
    render(<ShoppingCart {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Carrinho'));
    
    const clearButton = screen.getByText('Limpar Carrinho');
    fireEvent.click(clearButton);
    
    expect(defaultProps.onClearCart).toHaveBeenCalled();
  });

  it('calls onSendOrder when send button is clicked', () => {
    render(<ShoppingCart {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Carrinho'));
    
    const sendButton = screen.getByText('Enviar Pedido');
    fireEvent.click(sendButton);
    
    expect(defaultProps.onSendOrder).toHaveBeenCalledWith(defaultProps.items, 200);
  });
});
