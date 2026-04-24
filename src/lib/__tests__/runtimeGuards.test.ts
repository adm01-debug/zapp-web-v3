import { describe, it, expect } from 'vitest';
import {
  isRecord,
  hasField,
  hasSuccessFlag,
  isSuccessful,
  readNumber,
  readString,
  hasArrayField,
  readArray,
  readVariants,
} from '@/lib/runtimeGuards';

describe('runtimeGuards', () => {
  it('isRecord narrows objects', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('x')).toBe(false);
  });

  it('hasField detects keys', () => {
    expect(hasField({ a: 1 }, 'a')).toBe(true);
    expect(hasField({ a: 1 }, 'b')).toBe(false);
    expect(hasField(null, 'a')).toBe(false);
  });

  it('hasSuccessFlag and isSuccessful', () => {
    expect(hasSuccessFlag({ success: true })).toBe(true);
    expect(hasSuccessFlag({ success: 'yes' })).toBe(false);
    expect(isSuccessful({ success: true })).toBe(true);
    expect(isSuccessful({ success: false })).toBe(false);
    expect(isSuccessful(null)).toBe(false);
    expect(isSuccessful(undefined)).toBe(false);
  });

  it('readNumber and readString fall back safely', () => {
    expect(readNumber({ n: 5 }, 'n')).toBe(5);
    expect(readNumber({ n: 'x' }, 'n', 7)).toBe(7);
    expect(readNumber(null, 'n', 3)).toBe(3);
    expect(readString({ s: 'hi' }, 's')).toBe('hi');
    expect(readString({}, 's', 'fb')).toBe('fb');
  });

  it('array helpers handle missing fields', () => {
    expect(hasArrayField({ variants: [] }, 'variants')).toBe(true);
    expect(hasArrayField({ variants: 'x' }, 'variants')).toBe(false);
    expect(readArray({ items: [1, 2] }, 'items')).toEqual([1, 2]);
    expect(readArray({}, 'items')).toEqual([]);
    expect(readVariants({ variants: [{ id: '1' }] })).toEqual([{ id: '1' }]);
    expect(readVariants(null)).toEqual([]);
  });
});
