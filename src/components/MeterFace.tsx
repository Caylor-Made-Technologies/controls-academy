/**
 * A digital multimeter display, drawn as SVG: seven-segment digits with the unlit segments faintly visible
 * (like a real LCD), the measuring mode on the glass, and an autorange indicator with a bar graph.
 * Decorative: the page announces the reading separately for screen readers.
 */

/** Segment letters, standard order: a top, b top-right, c bottom-right, d bottom, e bottom-left, f top-left, g middle. */
const GLYPHS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
  '-': 'g', ' ': '', A: 'abcefg', E: 'adefg', F: 'aefg', L: 'def', O: 'abcdef', S: 'acdfg', U: 'bcdef', r: 'eg', P: 'abefg', '?': 'abeg',
};

export interface DisplayCell { ch: string; dot: boolean }

/** Turn "24.00" into four digit cells with the decimal point attached to the digit before it. Unknown characters show blank. */
export function cells(text: string, width = 4): DisplayCell[] {
  const out: DisplayCell[] = [];
  for (const c of text) {
    if (c === '.' && out.length) { out[out.length - 1].dot = true; continue; }
    out.push({ ch: GLYPHS[c] !== undefined ? c : GLYPHS[c.toUpperCase()] !== undefined ? c.toUpperCase() : ' ', dot: false });
  }
  const trimmed = out.slice(-width);
  while (trimmed.length < width) trimmed.unshift({ ch: ' ', dot: false });
  return trimmed;
}

/** "24.0 VDC" → value "24.0", unit "VDC"; "FUSE" → value "FUSE", unit "". */
export function splitReading(display: string): { value: string; unit: string } {
  const m = /^(\S+)\s*(.*)$/.exec(display.trim());
  return m ? { value: m[1], unit: m[2] } : { value: display, unit: '' };
}

/** Autoranging: the smallest of the meter's ranges that holds the value, and how full it is (0…1). */
export function autorange(value: string): { range: number; fill: number } | null {
  const v = Math.abs(Number(value));
  if (!Number.isFinite(v)) return null;
  const range = [6, 60, 600, 6000].find((r) => v <= r) ?? 6000;
  return { range, fill: Math.min(1, v / range) };
}

const SEG: Record<string, string> = {
  a: '2,0 18,0 15,3 5,3', b: '18,0.6 20,2.6 20,15 17,16.5 17,3.6', c: '17,18.5 20,20 20,32.4 18,34.4 17,31.4',
  d: '5,32 15,32 18,35 2,35', e: '0,20 3,18.5 3,31.4 0,34.4', f: '0,2.6 2,0.6 3,3.6 3,16.5 0,15', g: '3,16 17,16 19,17.5 17,19 3,19 1,17.5',
};

function Digit({ cell, x }: { cell: DisplayCell; x: number }) {
  const on = GLYPHS[cell.ch] ?? '';
  return (
    <g transform={`translate(${x} 4) skewX(-6)`}>
      {Object.entries(SEG).map(([k, pts]) => <polygon key={k} points={pts} className={on.includes(k) ? 'seg-on' : 'seg-off'} />)}
      <circle cx="23" cy="34" r="1.8" className={cell.dot ? 'seg-on' : 'seg-off'} />
    </g>
  );
}

const MODE_TEXT: Record<string, string> = { VDC: 'DC  V', VAC: 'AC  V', mA: 'DC  mA', A: 'AC  A  CLAMP', OHM: 'Ω' };

export function MeterFace({ display, mode }: { display: string; mode: string }) {
  const { value, unit } = splitReading(display);
  const ds = cells(value);
  const r = autorange(value);
  return (
    <svg className="meter-face" viewBox="0 0 132 62" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="130" height="60" rx="6" className="meter-glass" />
      <text x="7" y="11" className="meter-anno" fontSize={6}>{MODE_TEXT[mode] ?? mode}</text>
      <text x="125" y="11" textAnchor="end" className="meter-anno" fontSize={6}>{r ? `AUTO ${r.range}` : 'AUTO'}</text>
      <g transform="translate(8 6)">{ds.map((c, i) => <Digit key={i} cell={c} x={i * 26} />)}</g>
      <text x="125" y="44" textAnchor="end" className="meter-unit" fontSize={9}>{unit}</text>
      {/* bar graph: 20 ticks, lit up to the share of the range in use */}
      <g transform="translate(7 52)">
        {Array.from({ length: 20 }, (_, i) => <rect key={i} x={i * 6} y="0" width="4" height="4" className={r && i < Math.round(r.fill * 20) ? 'seg-on' : 'seg-off'} />)}
      </g>
    </svg>
  );
}
