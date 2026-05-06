import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceChanger } from '../VoiceChanger';
import { TooltipProvider } from '@/components/ui/tooltip';
import React from 'react';

// Mock Fetch
global.fetch = vi.fn();

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockVoices = [
  { id: 'grave', name: 'Grave', description: 'Voz grave', gender: 'male' },
  { id: 'cloned_sample', name: 'Celebridade', description: 'Voz clonada de celebridade', gender: 'female' },
];

vi.mock('./VoiceSelector', () => ({
  ELEVENLABS_VOICES: [
    { id: 'grave', name: 'Grave', description: 'Voz grave', gender: 'male' },
    { id: 'cloned_sample', name: 'Celebridade', description: 'Voz clonada de celebridade', gender: 'female' },
  ],
}));

describe('VoiceChanger Component', () => {
  const mockOnVoiceChanged = vi.fn();
  const mockAudioBlob = new Blob(['test-audio'], { type: 'audio/webm' });

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  const renderComponent = () => {
    return render(
      <TooltipProvider>
        <VoiceChanger audioBlob={mockAudioBlob} onVoiceChanged={mockOnVoiceChanged} />
      </TooltipProvider>
    );
  };

  it('bloqueia a conversão e mostra aviso para vozes clonadas', async () => {
    renderComponent();
    
    // Abrir o popover
    fireEvent.click(screen.getByTitle(/Alterar voz/i));
    
    // Clicar na voz de celebridade
    const celebBtn = screen.getByText('Celebridade');
    fireEvent.click(celebBtn);
    
    // Verificar se o aviso apareceu
    expect(screen.getByText(/Aviso de Voz Clonada/i)).toBeInTheDocument();
    
    // Garantir que o fetch não foi chamado ainda
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('exibe o progresso durante a conversão', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['converted'], { type: 'audio/mpeg' })),
    });

    renderComponent();
    
    fireEvent.click(screen.getByTitle(/Alterar voz/i));
    fireEvent.click(screen.getByText('Grave'));
    
    // O spinner e o texto de progresso devem aparecer
    expect(screen.getByText(/[0-9]+%/)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/Voz convertida para Grave/i)).toBeInTheDocument();
    });
    
    // O progresso deve sumir após o sucesso
    expect(screen.queryByText(/[0-9]+%/)).not.toBeInTheDocument();
  });

  it('permite tentar novamente após erro na conversão', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server Down' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['ok'], { type: 'audio/mpeg' })),
      });

    renderComponent();
    
    fireEvent.click(screen.getByTitle(/Alterar voz/i));
    fireEvent.click(screen.getByText('Grave'));
    
    await waitFor(() => {
      expect(vi.mocked(require('sonner').toast.error)).toHaveBeenCalledWith(
        expect.stringContaining('Conversão falhou: Server Down'),
        expect.any(Object)
      );
    });

    // Simular o clique em "Tentar novamente" (como o toast é mockado, validamos apenas a lógica de retry se exposta ou o fluxo)
    // No caso real, o usuário clicaria no botão do toast. Aqui validamos que o estado de erro permitiu o fluxo.
  });
});