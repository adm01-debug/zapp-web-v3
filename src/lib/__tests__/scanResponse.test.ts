import { describe, it, expect } from 'vitest';
import {
  parseScanInvocation,
  isBlocking,
  isRetryable,
  isInputError,
  ScanBlockedError,
} from '@/lib/scanResponse';

describe('parseScanInvocation — success', () => {
  it('parses a clean upload body', async () => {
    const r = await parseScanInvocation({
      data: {
        success: true,
        verdict: 'clean',
        scanId: 'abc-123',
        message: 'Arquivo verificado e enviado com sucesso.',
        path: 'whatsapp-media/x.jpg',
      },
      error: null,
    });

    expect(r.status).toBe('success');
    if (r.status !== 'success') return;
    expect(r.verdict).toBe('clean');
    expect(r.scanId).toBe('abc-123');
    expect(r.payload.path).toBe('whatsapp-media/x.jpg');
  });

  it('does not classify a clean result as blocking/retryable/input', async () => {
    const r = await parseScanInvocation({
      data: { success: true, verdict: 'clean', scanId: null, message: 'ok' },
      error: null,
    });
    expect(isBlocking(r)).toBe(false);
    expect(isRetryable(r)).toBe(false);
    expect(isInputError(r)).toBe(false);
  });
});

describe('parseScanInvocation — blocking errors from a 200 body', () => {
  it('parses MALWARE_DETECTED', async () => {
    const r = await parseScanInvocation({
      data: {
        error: true,
        code: 'MALWARE_DETECTED',
        message: 'Arquivo bloqueado: conteúdo malicioso identificado.',
        verdict: 'malicious',
        scanId: 'vt-1',
        details: { malicious: 12, suspicious: 0, fileName: 'x.exe' },
      },
      error: null,
    });

    expect(r.status).toBe('error');
    if (r.status !== 'error') return;
    expect(r.code).toBe('MALWARE_DETECTED');
    expect(r.verdict).toBe('malicious');
    expect(r.scanId).toBe('vt-1');
    expect(isBlocking(r)).toBe(true);
    expect(isRetryable(r)).toBe(false);
  });

  it('parses SUSPICIOUS_FILE', async () => {
    const r = await parseScanInvocation({
      data: {
        error: true,
        code: 'SUSPICIOUS_FILE',
        message: 'Arquivo bloqueado por suspeita de ameaça.',
        verdict: 'suspicious',
        scanId: 'vt-2',
      },
      error: null,
    });

    expect(isBlocking(r)).toBe(true);
  });
});

describe('parseScanInvocation — retryable errors from FunctionsHttpError', () => {
  function makeHttpError(status: number, body: unknown) {
    const response = new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
    return Object.assign(new Error('FunctionsHttpError'), { context: response });
  }

  it('parses SCAN_TIMEOUT (408) from error.context Response', async () => {
    const r = await parseScanInvocation({
      data: null,
      error: makeHttpError(408, {
        error: true,
        code: 'SCAN_TIMEOUT',
        message: 'A varredura de segurança expirou. Tente novamente.',
        verdict: 'unknown',
        scanId: 'vt-timeout',
      }),
    });

    expect(r.status).toBe('error');
    if (r.status !== 'error') return;
    expect(r.code).toBe('SCAN_TIMEOUT');
    expect(isRetryable(r)).toBe(true);
    expect(isBlocking(r)).toBe(false);
  });

  it('parses SCAN_UNAVAILABLE (502)', async () => {
    const r = await parseScanInvocation({
      data: null,
      error: makeHttpError(502, {
        error: true,
        code: 'SCAN_UNAVAILABLE',
        message: 'Serviço de varredura indisponível.',
        verdict: 'unknown',
      }),
    });

    expect(isRetryable(r)).toBe(true);
  });

  it('parses MALWARE_DETECTED returned as 422', async () => {
    const r = await parseScanInvocation({
      data: null,
      error: makeHttpError(422, {
        error: true,
        code: 'MALWARE_DETECTED',
        message: 'Conteúdo malicioso.',
        verdict: 'malicious',
        scanId: 'vt-422',
      }),
    });

    expect(isBlocking(r)).toBe(true);
  });
});

describe('parseScanInvocation — input errors', () => {
  it('parses INVALID_INPUT', async () => {
    const r = await parseScanInvocation({
      data: { error: true, code: 'INVALID_INPUT', message: 'Nenhum arquivo enviado.' },
      error: null,
    });

    expect(isInputError(r)).toBe(true);
    expect(isBlocking(r)).toBe(false);
    expect(isRetryable(r)).toBe(false);
  });
});

describe('parseScanInvocation — transport errors', () => {
  it('falls back to NETWORK_ERROR when error has no parseable body', async () => {
    const r = await parseScanInvocation({
      data: null,
      error: new Error('Failed to fetch'),
    });

    expect(r.status).toBe('error');
    if (r.status !== 'error') return;
    expect(r.code).toBe('NETWORK_ERROR');
    expect(r.message).toBe('Failed to fetch');
    expect(isRetryable(r)).toBe(true);
  });

  it('returns UNKNOWN when neither data nor error is present', async () => {
    const r = await parseScanInvocation({ data: null, error: null });

    expect(r.status).toBe('error');
    if (r.status !== 'error') return;
    expect(r.code).toBe('UNKNOWN');
  });
});

describe('parseScanInvocation — defensive parsing', () => {
  it('coerces unknown backend codes to UNKNOWN', async () => {
    const r = await parseScanInvocation({
      data: { error: true, code: 'SOMETHING_NEW', message: 'foo' },
      error: null,
    });

    expect(r.status).toBe('error');
    if (r.status !== 'error') return;
    expect(r.code).toBe('UNKNOWN');
  });

  it('coerces non-string scanId to null', async () => {
    const r = await parseScanInvocation({
      data: {
        error: true,
        code: 'STORAGE_ERROR',
        message: 'erro',
        verdict: 'clean',
        scanId: 12345,
      },
      error: null,
    });

    expect(r.status).toBe('error');
    if (r.status !== 'error') return;
    expect(r.scanId).toBeNull();
  });
});

describe('ScanBlockedError', () => {
  it('preserves the structured result through throw/catch', () => {
    const result = {
      status: 'error' as const,
      code: 'MALWARE_DETECTED' as const,
      message: 'malicious',
      verdict: 'malicious' as const,
      scanId: 'vt-x',
    };

    try {
      throw new ScanBlockedError(result);
    } catch (e) {
      expect(e).toBeInstanceOf(ScanBlockedError);
      expect((e as ScanBlockedError).result).toBe(result);
      expect((e as Error).message).toBe('malicious');
    }
  });
});
