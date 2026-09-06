import { describe, it, expect } from 'vitest';
import {
  newTraceContext,
  parseTraceparent,
  makeTraceHeaders,
} from '@/lib/tracing';

describe('newTraceContext', () => {
  it('gera traceId de 32 chars hex', () => {
    const { traceId } = newTraceContext();
    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('gera spanId de 16 chars hex', () => {
    const { spanId } = newTraceContext();
    expect(spanId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('monta traceparent no formato W3C correto', () => {
    const { traceparent, traceId, spanId } = newTraceContext();
    expect(traceparent).toBe(`00-${traceId}-${spanId}-01`);
  });

  it('cada chamada produz um traceId único', () => {
    const a = newTraceContext();
    const b = newTraceContext();
    expect(a.traceId).not.toBe(b.traceId);
    expect(a.spanId).not.toBe(b.spanId);
  });
});

describe('parseTraceparent', () => {
  it('parseia header W3C válido', () => {
    const header = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const ctx = parseTraceparent(header);
    expect(ctx).not.toBeNull();
    expect(ctx!.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(ctx!.spanId).toBe('00f067aa0ba902b7');
    expect(ctx!.traceparent).toBe(header);
  });

  it('retorna null para header inválido', () => {
    expect(parseTraceparent('invalid')).toBeNull();
    expect(parseTraceparent('00-tooshort-spanid-01')).toBeNull();
    expect(parseTraceparent('')).toBeNull();
  });

  it('retorna null para versão desconhecida', () => {
    const header = '01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    expect(parseTraceparent(header)).toBeNull();
  });
});

describe('makeTraceHeaders', () => {
  it('retorna headers com traceparent e x-trace-id', () => {
    const headers = makeTraceHeaders();
    expect(headers['traceparent']).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    expect(headers['x-trace-id']).toMatch(/^[0-9a-f]{32}$/);
  });

  it('usa contexto fornecido sem gerar novo', () => {
    const ctx = newTraceContext();
    const headers = makeTraceHeaders(ctx);
    expect(headers['traceparent']).toBe(ctx.traceparent);
    expect(headers['x-trace-id']).toBe(ctx.traceId);
  });

  it('traceparent e x-trace-id são consistentes entre si', () => {
    const headers = makeTraceHeaders();
    const parts = headers['traceparent'].split('-');
    expect(parts[1]).toBe(headers['x-trace-id']);
  });
});
