import { describe, expect, it } from 'vitest';
import { openingsUnderLoad, risingEdges } from '../../src/three/edges';

describe('arc triggers', () => {
  it('counts contacts opening under load, not opening with no current', () => {
    let closed = true, amps = 0;
    const n = openingsUnderLoad(() => closed, () => amps);
    expect(n()).toBe(0);
    amps = 20; n();
    closed = false; amps = 0; // current is already gone when we look
    expect(n()).toBe(1);
    closed = true; n(); // closed with no current yet
    closed = false;
    expect(n()).toBe(1); // opened at 0 A: no arc
  });
  it('counts rising edges only', () => {
    let c = false;
    const n = risingEdges(() => c);
    c = true; expect(n()).toBe(1);
    expect(n()).toBe(1);
    c = false; n(); c = true;
    expect(n()).toBe(2);
  });
});
