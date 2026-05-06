import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceChanger } from '../../VoiceChanger';
import { TooltipProvider } from '@/components/ui/tooltip';
import React from 'react';
import { toast } from 'sonner';

// Mock Fetch and Supabase
global.fetch = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'task-123' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } })),
    },
  },
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: (props: any) => <div {...props} />,
    button: (props: any) => <button {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('./VoiceSelector', () => ({
  ELEVENLABS_VOICES: [
    { id: 'grave', name: 'Grave', description: 'Voz grave', gender: 'male' },
    { id: 'cloned_sample', name: 'Celebridade', description: 'Voz clonada', gender: 'female' },
  ],
}));

describe('VoiceChanger Component - End-to-End Integration', () => {
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

  it('completes the full flow: queue creation -> conversion -> success toast', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['converted-audio'], { type: 'audio/mpeg' })),
    });

    renderComponent();
    
    // 1. Open Popover
    fireEvent.click(screen.getByTitle(/Alterar voz/i));
    
    // 2. Select Voice using data-testid
    const graveBtn = screen.getByTestId('voice-btn-grave');
    fireEvent.click(graveBtn);
    
    // 3. Verify Progress Display
    expect(screen.getByText(/[0-9]+%/)).toBeInTheDocument();
    
    // 4. Wait for completion
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Voz convertida para Grave'),
        expect.any(Object)
      );
    }, { timeout: 5000 });
  });

  it('handles backend error with actionable retry toast', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({ error: 'ElevenLabs rate limit' }),
    });

    renderComponent();
    
    fireEvent.click(screen.getByTitle(/Alterar voz/i));
    const graveBtn = screen.getByTestId('voice-btn-grave');
    fireEvent.click(graveBtn);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Falha técnica: ElevenLabs rate limit'),
        expect.any(Object)
      );
    });
  });
});