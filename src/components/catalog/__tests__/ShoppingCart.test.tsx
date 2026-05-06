import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  it('renders cart items correctly', () => {
    render(<ShoppingCart {...defaultProps} />);
    
    // Open the sheet
    const trigger = screen.getByTitle('Carrinho');
    fireEvent.click(trigger);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument(); // 100 * 2
    expect(screen.getByText('2')).toBeInTheDocument(); // Quantity
  });

  it('calls onUpdateQuantity when incrementing', () => {
    render(<ShoppingCart {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Carrinho'));
    
    const plusButton = screen.getByRole('button', { name: /plus/i });
    fireEvent.click(plusButton);
    
    expect(defaultProps.onUpdateQuantity).toHaveBeenCalledWith('1', 3);
  });

  it('calls onUpdateQuantity when decrementing', () => {
    render(<ShoppingCart {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Carrinho'));
    
    const minusButton = screen.getByRole('button', { name: /minus/i });
    fireEvent.click(minusButton);
    
    expect(defaultProps.onUpdateQuantity).toHaveBeenCalledWith('1', 1);
  });

  it('calls onRemoveItem when delete is clicked', () => {
    render(<ShoppingCart {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Carrinho'));
    
    const removeButton = screen.getByRole('button', { name: /trash/i });
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
