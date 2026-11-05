import { describe, expect, it } from 'vitest';
import { BRAND_GUIDES } from '../../src/content/brands';
import { DEFAULT_HW, HARDWARE, HARDWARE_BY_ID, UNIT_INFO } from '../../src/content/hardware';
import { SKINS } from '../../src/skins';

describe('hardware library', () => {
  it('ids are unique and every model belongs to a brand guide', () => {
    expect(new Set(HARDWARE.map((m) => m.id)).size).toBe(HARDWARE.length);
    const brands = new Set(BRAND_GUIDES.map((b) => b.id));
    for (const m of HARDWARE) expect(brands.has(m.brand), m.id).toBe(true);
  });

  it('every brand guide has US notes and at least one 3D model', () => {
    for (const b of BRAND_GUIDES) {
      expect(b.us, b.id).toBeTruthy();
      expect(HARDWARE.some((m) => m.brand === b.id), b.id).toBe(true);
    }
  });

  it('brand guide ids are unique', () => {
    expect(new Set(BRAND_GUIDES.map((b) => b.id)).size).toBe(BRAND_GUIDES.length);
  });

  it('shapes are sane: positive sizes, a controller or adapter, known unit kinds', () => {
    for (const m of HARDWARE) {
      const { shape } = m;
      expect(shape.h, m.id).toBeGreaterThan(40);
      expect(shape.d, m.id).toBeGreaterThan(40);
      expect(shape.units.length, m.id).toBeGreaterThan(0);
      for (const u of shape.units) {
        expect(u.w, m.id).toBeGreaterThan(0);
        expect(UNIT_INFO[u.kind], `${m.id} ${u.kind}`).toBeTruthy();
      }
      expect(shape.units.some((u) => ['cpu', 'safety', 'brick', 'logic', 'coupler', 'hmi', 'pc'].includes(u.kind)), m.id).toBe(true);
      expect(SKINS[m.skin], m.id).toBeTruthy();
      expect(m.spot.length, m.id).toBeGreaterThan(0);
    }
  });

  it('every simulator dialect maps to a real model (or the generic rack)', () => {
    for (const id of Object.keys(SKINS)) {
      const hw = DEFAULT_HW[id as keyof typeof DEFAULT_HW];
      expect(hw === 'generic' || Boolean(HARDWARE_BY_ID[hw]), id).toBe(true);
    }
  });

  it('VERIFY markers only appear at the end of a string', () => {
    const texts = HARDWARE.flatMap((m) => [m.where, m.software, ...m.spot]).concat(BRAND_GUIDES.flatMap((b) => [b.us ?? '', ...(b.hmi ?? []), ...(b.drives ?? []), ...(b.networks ?? [])]));
    for (const t of texts) {
      const i = t.indexOf('// VERIFY');
      if (i >= 0) expect(t.slice(i).includes('.'), t).toBe(false);
    }
  });
});
