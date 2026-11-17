import type { WDevice, Wire } from '../../lib/wiring';

/** Row heights and lane spacing in SVG units (the drawing scales to the card width). */
const ROW = 26;
const HEAD = 28;
const GAP = 10;
const BLOCK_W = 176;
const DOT_X = BLOCK_W + 6;
const LANE_X0 = DOT_X + 22;
const WIDTH = 320;

export interface DiagramLayout {
  height: number;
  /** Where each terminal's dot is. */
  dots: Map<string, { x: number; y: number }>;
  blocks: { device: WDevice; y: number; h: number }[];
  /** One vertical lane per wire, so wires never overlap or cross each other's lane. */
  lanes: number[];
}

/** Pure layout, unit-tested: devices stacked top to bottom, each wire in its own lane to the right. */
export function layoutDiagram(devices: WDevice[], wireCount: number): DiagramLayout {
  const dots = new Map<string, { x: number; y: number }>();
  const blocks: DiagramLayout['blocks'] = [];
  let y = 4;
  for (const d of devices) {
    const h = HEAD + d.terminals.length * ROW + 4;
    blocks.push({ device: d, y, h });
    d.terminals.forEach((t, i) => dots.set(t.id, { x: DOT_X, y: y + HEAD + i * ROW + ROW / 2 }));
    y += h + GAP;
  }
  const step = Math.min(12, (WIDTH - LANE_X0 - 6) / Math.max(1, wireCount));
  const lanes = Array.from({ length: wireCount }, (_, i) => LANE_X0 + i * step);
  return { height: y - GAP + 4, dots, blocks, lanes };
}

/**
 * Live connection diagram of what the learner has wired: each device as a block with its terminals, each wire
 * drawn in its color from terminal to terminal through its own lane. The terminal buttons stay the way to wire;
 * this shows the result the way a wiring diagram on a print would.
 */
export function WiringDiagram({ devices, wires, colors, armed }: { devices: WDevice[]; wires: Wire[]; colors: string[]; armed: string | null }) {
  const L = layoutDiagram(devices, wires.length);
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${L.height}`}
      className="wiring-diagram"
      role="img"
      aria-label={`Wiring diagram: ${wires.length === 0 ? 'no wires yet' : `${wires.length} wire${wires.length > 1 ? 's' : ''}, listed below`}.`}
    >
      {L.blocks.map(({ device, y, h }) => (
        <g key={device.id}>
          <rect x={2} y={y} width={BLOCK_W} height={h} rx={8} className="wd-block" />
          <text x={12} y={y + 18} fontSize={14} className="wd-name">{device.name}</text>
          {device.terminals.map((t) => {
            const p = L.dots.get(t.id)!;
            const on = armed === t.id;
            return (
              <g key={t.id}>
                <text x={BLOCK_W - 10} y={p.y + 4} textAnchor="end" fontSize={13} className="wd-term">{t.label}</text>
                <line x1={BLOCK_W} y1={p.y} x2={p.x} y2={p.y} className="wd-stub" />
                <circle cx={p.x} cy={p.y} r={on ? 7 : 5.5} className={on ? 'wd-dot wd-armed' : 'wd-dot'} />
              </g>
            );
          })}
        </g>
      ))}
      {wires.map(([a, b], i) => {
        const pa = L.dots.get(a);
        const pb = L.dots.get(b);
        if (!pa || !pb) return null;
        const x = L.lanes[i];
        return (
          <g key={`${a}-${b}`}>
            <path d={`M${pa.x} ${pa.y} H${x} V${pb.y} H${pb.x}`} fill="none" stroke={colors[i]} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={pa.x} cy={pa.y} r={3} fill={colors[i]} />
            <circle cx={pb.x} cy={pb.y} r={3} fill={colors[i]} />
          </g>
        );
      })}
    </svg>
  );
}
