import { describe, it, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';
vi.mock('@/integrations/supabase/client', () => ({ supabase: { channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })), removeChannel: vi.fn(), storage: { from: vi.fn(() => ({ createSignedUrl: vi.fn(() => Promise.resolve({ data: { signedUrl: 'x' } })), list: vi.fn(() => Promise.resolve({ data: [] })) })) }, functions: { invoke: vi.fn() }, from: vi.fn(() => ({ update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({})) })) })) } }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/lib/logger', () => ({ log: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/devRealtimeLogger', () => ({ logMessagesSubscribe: vi.fn(), wrapMessagesHandler: (_n: string, fn: any) => fn }));
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => React.forwardRef<HTMLElement, any>((p, ref) => { const { whileHover, whileTap, initial, animate, exit, transition, variants, ...rest } = p; return React.createElement('div', { ...rest, ref }); }) }),
  AnimatePresence: ({ children }: any) => children,
}));
import { AudioMessagePlayer } from '/dev-server/src/components/inbox/AudioMessagePlayer';
const mockPlay = vi.fn(() => Promise.resolve());
Object.defineProperty(HTMLAudioElement.prototype, 'play', { configurable: true, value: mockPlay });
Object.defineProperty(HTMLAudioElement.prototype, 'pause', { configurable: true, value: vi.fn() });
Object.defineProperty(HTMLAudioElement.prototype, 'load', { configurable: true, value: vi.fn() });
Object.defineProperty(HTMLAudioElement.prototype, 'duration', { configurable: true, get() { return 30; } });
Object.defineProperty(HTMLAudioElement.prototype, 'volume', { configurable: true, get() { return 1; }, set() {} });
Object.defineProperty(HTMLAudioElement.prototype, 'currentTime', { configurable: true, get() { return 0; }, set() {} });
describe('dbg', () => {
  it('inspect', async () => {
    const { container } = render(<AudioMessagePlayer audioUrl="u" messageId="m" isSent={false} />);
    const audio = container.querySelector('audio') as HTMLAudioElement;
    await act(async () => { audio.dispatchEvent(new Event('loadedmetadata')); });
    const btn = container.querySelectorAll('button')[0] as HTMLButtonElement;
    console.log('BEFORE:', btn.outerHTML.slice(0, 200), 'disabled?', btn.disabled);
    await act(async () => { fireEvent.click(btn); });
    await new Promise(r => setTimeout(r, 50));
    await act(async () => { await Promise.resolve(); });
    console.log('SVG CLASS:', btn.querySelector('svg')?.getAttribute('class'));
  });
});
