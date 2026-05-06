import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceChanger } from '../../VoiceChanger';
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

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref) => <div {...props} ref={ref as any}>{children}</div>),
    button: React.forwardRef(({ children, ...props }: any, ref) => <button {...props} ref={ref as any}>{children}</button>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

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
    
    fireEvent.click(screen.getByTitle(/Alterar voz/i));
    
    // Usar getAllByText e pegar o primeiro se houver duplicatas de chave no render (ajustado na refatoração)
    const celebBtn = screen.getByText('Celebridade');
    fireEvent.click(celebBtn);
    
    expect(screen.getByText(/Aviso de Voz Clonada/i)).toBeInTheDocument();
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
    
    expect(screen.getByText(/[0-9]+%/)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(vi.mocked(require('sonner').toast.success)).toHaveBeenCalledWith(
        expect.stringContaining('Voz convertida para Grave'),
        expect.any(Object)
      );
    });
  });
});