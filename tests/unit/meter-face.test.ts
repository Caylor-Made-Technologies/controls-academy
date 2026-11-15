import { describe, expect, it } from 'vitest';
import { autorange, cells, splitReading } from '../../src/components/MeterFace';

describe('digital meter face', () => {
  it('attaches the decimal point to the digit before it and right-aligns', () => {
    expect(cells('24.0').map((c) => c.ch + (c.dot ? '.' : '')).join('|')).toBe(' |2|4.|0');
    expect(cells('4.00').map((c) => c.ch + (c.dot ? '.' : '')).join('|')).toBe(' |4.|0|0');
  });
  it('shows words the meter itself would show', () => {
    expect(cells('FUSE').map((c) => c.ch).join('')).toBe('FUSE');
    expect(cells('----').map((c) => c.ch).join('')).toBe('----');
    expect(cells('-.--').map((c) => c.ch).join('')).toBe(' ---');
  });
  it('splits value from unit for every reading the hunt produces', () => {
    expect(splitReading('24 VDC')).toEqual({ value: '24', unit: 'VDC' });
    expect(splitReading('-.-- Ω')).toEqual({ value: '-.--', unit: 'Ω' });
    expect(splitReading('FUSE')).toEqual({ value: 'FUSE', unit: '' });
  });
  it('autoranges to the smallest range that holds the value', () => {
    expect(autorange('24')).toEqual({ range: 60, fill: 0.4 });
    expect(autorange('4.00')?.range).toBe(6);
    expect(autorange('480')?.range).toBe(600);
    expect(autorange('FUSE')).toBeNull();
  });
});
