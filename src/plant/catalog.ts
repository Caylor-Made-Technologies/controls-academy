/**
 * The list of machines: names and one-line summaries only. Pages that just need to show the list import this
 * file, not src/plant/index.ts, so they don't download every machine's physics and faults to draw a menu.
 */
export interface MachineInfo {
  id: string;
  title: string;
  summary: string;
  site: 'mill' | 'datacenter' | 'water' | 'general';
}

export const MACHINE_INFO: MachineInfo[] = [
  { id: 'motor', title: 'Motor start/stop station', summary: '3-wire control, seal-in, overload, hardwired E-stop.', site: 'general' },
  { id: 'fwdrev', title: 'Forward/reverse screw conveyor', summary: 'Reversing starter, three interlock layers, zero-speed switch.', site: 'mill' },
  { id: 'conveyor', title: 'Bag conveyor with photo-eyes', summary: 'Photo-eyes, bag counting, jam detection, pallet counter.', site: 'mill' },
  { id: 'tank', title: 'Tank level with PID', summary: '4–20 mA transmitter, PID fill valve, overshoot, fail-safe protection.', site: 'water' },
  { id: 'pumps', title: 'Lift station: pump lead/lag', summary: 'Lead/lag, alternation, fail-over, backup high-level float.', site: 'water' },
  { id: 'datacenter', title: 'Data center: ATS + CRAH', summary: 'Utility loss, generator start, transfer/retransfer, CRAH chilled-water PID.', site: 'datacenter' },
  { id: 'mixer', title: 'Flour batch mixer', summary: 'Recipe weights, state machine with fault codes, dust-collector and gate interlocks.', site: 'mill' },
  { id: 'vfd', title: 'Fan on a VFD', summary: 'Speed control, ramps, analog reference, STO and drive faults.', site: 'datacenter' },
];

export const MACHINE_INFO_BY_ID = new Map(MACHINE_INFO.map((m) => [m.id, m]));
