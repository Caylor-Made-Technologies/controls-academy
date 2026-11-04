import { describe, expect, it } from 'vitest';
import { program } from '../../src/engine';
import { SKINS, SKIN_LIST, addressMap, displayRef, iecTime, mnemonic } from '../../src/skins';

const p = program(
  'Motor',
  [
    { name: 'Start_PB', type: 'BOOL', io: { kind: 'DI', point: 0 } },
    { name: 'Eye', type: 'BOOL', io: { kind: 'DI', point: 8 } },
    { name: 'Motor', type: 'BOOL', io: { kind: 'DO', point: 0 } },
    { name: 'Seal', type: 'BOOL' },
    { name: 'Count', type: 'INT' },
    { name: 'T1', type: 'TIMER', initial: 5000 },
    { name: 'C1', type: 'COUNTER', initial: 10 },
  ],
  ['XIC(Start_PB)XIC(Eye)OTE(Motor)', 'XIC(Motor)TON(T1)', 'XIC(T1.DN)CTU(C1)', 'XIC(Seal)MOV(1,Count)'],
);

describe('brand skins', () => {
  it('has 10 skins, every one with notes', () => {
    expect(SKIN_LIST.length).toBe(10);
    for (const s of SKIN_LIST) expect(s.notes.length).toBeGreaterThan(1);
  });

  it('Mitsubishi FX inputs are octal: point 8 → X10', () => {
    const m = addressMap(p, SKINS.mitsubishi);
    expect(m.get('Start_PB')!.primary).toBe('X0');
    expect(m.get('Eye')!.primary).toBe('X10');
    expect(m.get('Motor')!.primary).toBe('Y0');
  });

  it('SLC uses file-based addresses', () => {
    const m = addressMap(p, SKINS['ab-slc']);
    expect(m.get('Start_PB')!.primary).toBe('I:1/0');
    expect(m.get('Seal')!.primary).toBe('B3:0/0');
    expect(m.get('Count')!.primary).toBe('N7:0');
    expect(m.get('T1')!.primary).toBe('T4:0');
    expect(displayRef('T1.DN', p, SKINS['ab-slc'])).toBe('T4:0/DN');
    expect(displayRef('C1.ACC', p, SKINS['ab-slc'])).toBe('C5:0.ACC');
    expect(SKINS['ab-slc'].timerPreset(5000)).toBe('Time Base 0.01, Preset 500');
  });

  it('Logix is tag-based with ms presets', () => {
    const m = addressMap(p, SKINS['ab-logix']);
    expect(m.get('Start_PB')).toEqual({ primary: 'Start_PB', secondary: 'Local:1:I.Data.0', address: 'Local:1:I.Data.0' });
    expect(displayRef('T1.DN', p, SKINS['ab-logix'])).toBe('T1.DN');
    expect(SKINS['ab-logix'].timerPreset(5000)).toContain('5000');
  });

  it('Siemens TIA shows symbol + %I address and IEC timer members', () => {
    const m = addressMap(p, SKINS['siemens-tia']);
    expect(m.get('Start_PB')!.secondary).toBe('%I0.0');
    expect(m.get('Eye')!.secondary).toBe('%I1.0');
    expect(displayRef('T1.DN', p, SKINS['siemens-tia'])).toBe('"T1_DB".Q');
    expect(displayRef('C1.DN', p, SKINS['siemens-tia'])).toBe('"C1_DB".QU');
    expect(SKINS['siemens-tia'].timerPreset(5000)).toBe('PT := T#5S');
    expect(mnemonic('XIC', SKINS['siemens-tia'])).toBe('-| |-');
  });

  it('IEC time literals', () => {
    expect(iecTime(90500)).toBe('T#1M30S500MS');
    expect(iecTime(0)).toBe('T#0MS');
    expect(iecTime(3600000, false)).toBe('t#1h');
  });

  it('every skin addresses every tag and every ref without throwing', () => {
    for (const s of SKIN_LIST) {
      const m = addressMap(p, s);
      expect(m.size).toBe(p.tags.length);
      for (const ref of ['Start_PB', 'T1.DN', 'T1.ACC', 'C1.DN', 'Count.3', 'Nope', '5']) {
        expect(typeof displayRef(ref, p, s, m)).toBe('string');
      }
      expect(s.timerPreset(1500).length).toBeGreaterThan(0);
    }
  });

  it('addresses are unique within a program for every skin', () => {
    for (const s of SKIN_LIST) {
      const addrs = [...addressMap(p, s).values()].map((a) => a.address);
      expect(new Set(addrs).size).toBe(addrs.length);
    }
  });
});
