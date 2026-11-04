import type { SVGProps } from 'react';

const P: Record<string, string> = {
  learn: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H10l2 2h6.5A1.5 1.5 0 0 1 20 7.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5Z M8 11h8 M8 15h5',
  sim: 'M5 4v16 M19 4v16 M5 12h4 M9 9v6 M12 9v6 M12 12h2 M15 9.5q-1.5 2.5 0 5 M17 9.5q1.5 2.5 0 5 M17 12h2',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4Z',
  book: 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5Zm0 15A1.5 1.5 0 0 0 6.5 21H19 M9 7h6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4.5 20a7.5 7.5 0 0 1 15 0',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z M20 20l-3.5-3.5',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  play: 'M7 5v14l11-7Z',
  pause: 'M7 5h3.5v14H7Z M13.5 5H17v14h-3.5Z',
  step: 'M6 5v14l8-7Z M17 5v14',
  slow: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2',
  plus: 'M12 5v14 M5 12h14',
  trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  undo: 'M9 14L4 9l5-5 M4 9h11a5 5 0 0 1 0 10h-3',
  redo: 'M15 14l5-5-5-5 M20 9H9a5 5 0 0 0 0 10h3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12 M18 6L6 18',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  branch: 'M6 4v16 M18 4v16 M6 8h12 M6 16h12',
  bolt: 'M13 2L5 14h6l-1 8 8-12h-6Z',
  shield: 'M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6Z',
  flame: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 3 2 0-2-1-4 0-6Z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0Z M8 6H5a3 3 0 0 0 3 4 M16 6h3a3 3 0 0 1-3 4 M12 13v4 M8 20h8 M9 17h6',
  download: 'M12 4v11 M7 10l5 5 5-5 M5 20h14',
  upload: 'M12 16V5 M7 10l5-5 5 5 M5 20h14',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 11v5 M12 8h.01',
  warn: 'M12 3l10 18H2Z M12 10v5 M12 18h.01',
  meter: 'M6 3h12v18H6Z M9 6h6v4H9Z M12 14a2 2 0 1 0 0 .01 M9 18h.01 M15 18h.01',
  flag: 'M5 21V4 M5 4h11l-2 4 2 4H5',
  layers: 'M12 3l9 5-9 5-9-5Z M3 13l9 5 9-5',
  share: 'M16 6l-4-4-4 4 M12 2v13 M5 12v7h14v-7',
  power: 'M12 3v9 M6.3 7.3a8 8 0 1 0 11.4 0',
  reset: 'M4 12a8 8 0 1 0 2.3-5.7 M4 4v4h4',
  verify: 'M9 12l2 2 4-4 M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6Z',
  copy: 'M9 9h10v11H9Z M5 15V4h10',
  edit: 'M4 20h4L19 9l-4-4L4 16Z M13.5 6.5l4 4',
  left: 'M14 7l-5 5 5 5',
  right: 'M10 7l5 5-5 5',
  volume: 'M4 9h4l5-4v14l-5-4H4Z M16 9a4 4 0 0 1 0 6 M18.5 6.5a7.5 7.5 0 0 1 0 11',
  mute: 'M4 9h4l5-4v14l-5-4H4Z M17 9l5 6 M22 9l-5 6',
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      <path d={P[name]} />
    </svg>
  );
}
