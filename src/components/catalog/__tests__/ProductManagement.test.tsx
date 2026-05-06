import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductManagement } from '../ProductManagement';
import { useProductManagement } from '../useProductManagement';

// Mock the hook
vi.mock('../useProductManagement', () => ({
  useProductManagement: vi.fn(),
}));

const mockProducts = [
  {
    id: '1',
    name: 'Table',
    category: 'Furniture',
    sku: 'FUR-01',
    price: 150,
    currency: 'BRL',
    stock_quantity: 10,
    is_active: true,
    description: 'A wooden table',
    image_url: null,
  },
  {
    id: '2',
    name: 'Chair',
    category: 'Furniture',
    sku: 'FUR-02',
    price: 50,
    currency: 'BRL',
    stock_quantity: 20,
    is_active: true,
    description: 'A wooden chair',
    image_url: null,
  },
];

describe('ProductManagement Component', () => {
  it('renders product list correctly', () => {
    (useProductManagement as any).mockReturnValue({
      products: mockProducts,
      filteredProducts: mockProducts,
      loading: false,
      search: '',
      setSearch: vi.fn(),
      openCreate: vi.fn(),
      openEdit: vi.fn(),
      setDeleteProduct: vi.fn(),
      showForm: false,
      closeForm: vi.fn(),
    });

    render(<ProductManagement />);

    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Chair')).toBeInTheDocument();
    expect(screen.getByText('FUR-01')).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
  });

  it('triggers search when input changes', () => {
    const setSearch = vi.fn();
    (useProductManagement as any).mockReturnValue({
      products: mockProducts,
      filteredProducts: mockProducts,
      loading: false,
      search: '',
      setSearch,
      openCreate: vi.fn(),
      openEdit: vi.fn(),
      setDeleteProduct: vi.fn(),
      showForm: false,
      closeForm: vi.fn(),
    });

    render(<ProductManagement />);

    const searchInput = screen.getByPlaceholderText(/Buscar por nome/i);
    fireEvent.change(searchInput, { target: { value: 'Table' } });

    expect(setSearch).toHaveBeenCalledWith('Table');
  });

  it('opens create dialog when "Novo Produto" is clicked', () => {
    const openCreate = vi.fn();
    (useProductManagement as any).mockReturnValue({
      products: mockProducts,
      filteredProducts: mockProducts,
      loading: false,
      search: '',
      setSearch: vi.fn(),
      openCreate,
      openEdit: vi.fn(),
      setDeleteProduct: vi.fn(),
      showForm: false,
      closeForm: vi.fn(),
    });

    render(<ProductManagement />);

    const createButton = screen.getByText('Novo Produto');
    fireEvent.click(createButton);

    expect(openCreate).toHaveBeenCalled();
  });
});
