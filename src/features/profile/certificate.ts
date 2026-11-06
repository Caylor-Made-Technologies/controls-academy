import { PRACTICE_RECORD } from '../../lib/practice';

export type CertificateOpts =
  | { kind?: 'track'; name: string; track: string; trackN: number; date: string; lessons: number }
  | { kind: 'readiness'; name: string; date: string; pct: number };

/** What the certificate says, apart from the artwork. Pure so it can be unit-tested. */
export function certificateText(opts: CertificateOpts) {
  const who = opts.name.trim().slice(0, 40) || 'A Controls Academy learner';
  if (opts.kind === 'readiness') {
    return { title: 'Practice Record', who, line1: `scored ${opts.pct} % on the`, line2: 'Controls Technician Readiness practice assessment', label: PRACTICE_RECORD, file: 'controls-academy-readiness-practice-record.png' };
  }
  return { title: 'Certificate of Completion', who, line1: `completed all ${opts.lessons} lessons and checks in`, line2: `Track ${opts.trackN}: ${opts.track}`, label: PRACTICE_RECORD, file: `controls-academy-track-${opts.trackN}-certificate.png` };
}

/** Draws a branded certificate on a canvas and saves it as a PNG on the device. */
export async function saveCertificate(opts: CertificateOpts) {
  const text = certificateText(opts);
  const W = 1600;
  const H = 1100;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) return;
  await document.fonts?.ready;

  g.fillStyle = '#0b0f14';
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H * 0.35, 800);
  glow.addColorStop(0, 'rgba(30,111,255,0.22)');
  glow.addColorStop(1, 'rgba(30,111,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  const grad = g.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#3d8bff');
  grad.addColorStop(1, '#22d3ee');
  g.strokeStyle = grad;
  g.lineWidth = 6;
  g.strokeRect(40, 40, W - 80, H - 80);
  g.lineWidth = 2;
  g.strokeRect(60, 60, W - 120, H - 120);

  // circuit traces in the corners
  g.lineWidth = 4;
  g.lineCap = 'round';
  for (const [x, y, sx, sy] of [[60, 60, 1, 1], [W - 60, H - 60, -1, -1]] as const) {
    g.beginPath();
    g.moveTo(x + sx * 40, y + sy * 120);
    g.lineTo(x + sx * 40, y + sy * 70);
    g.lineTo(x + sx * 90, y + sy * 40);
    g.lineTo(x + sx * 260, y + sy * 40);
    g.stroke();
    g.fillStyle = '#22d3ee';
    g.beginPath();
    g.arc(x + sx * 260, y + sy * 40, 8, 0, Math.PI * 2);
    g.fill();
  }

  try {
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}icon-192.png`;
    await img.decode();
    g.drawImage(img, W / 2 - 70, 110, 140, 140);
  } catch {
    /* icon optional */
  }

  g.textAlign = 'center';
  g.fillStyle = '#9aa7b8';
  g.font = '700 26px Montserrat, Inter, sans-serif';
  g.fillText('CONTROLS ACADEMY  ·  CAYLOR MADE TECHNOLOGIES', W / 2, 300);
  g.fillStyle = '#ffffff';
  g.font = '800 72px Montserrat, Inter, sans-serif';
  g.fillText(text.title, W / 2, 400);
  g.fillStyle = '#c9d3e0';
  g.font = '400 32px Inter, sans-serif';
  g.fillText('This records that', W / 2, 480);
  g.fillStyle = grad;
  g.font = '800 84px Montserrat, Inter, sans-serif';
  g.fillText(text.who, W / 2, 580);
  g.fillStyle = '#c9d3e0';
  g.font = '400 32px Inter, sans-serif';
  g.fillText(text.line1, W / 2, 660);
  g.fillStyle = '#ffffff';
  g.font = '700 48px Montserrat, Inter, sans-serif';
  g.fillText(text.line2, W / 2, 740);
  g.fillStyle = '#3ddc97';
  g.font = '600 30px Inter, sans-serif';
  g.fillText(opts.date, W / 2, 810);

  // The practice-record label is part of the certificate, not small print.
  g.fillStyle = '#ffb547';
  g.font = '700 30px Inter, sans-serif';
  g.fillText(text.label.toUpperCase(), W / 2, 905);
  g.fillStyle = '#9aa7b8';
  g.font = '400 22px Inter, sans-serif';
  g.fillText('Self-paced training. Not a certification or site authorization. Follow your employer\'s procedures.', W / 2, 945);
  g.fillStyle = '#6ea6ff';
  g.font = '700 24px Montserrat, Inter, sans-serif';
  g.fillText('Advanced Engineering. Built Different.', W / 2, 980);

  await new Promise<void>((resolve) => {
    c.toBlob((blob) => {
      if (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = text.file;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
      resolve();
    }, 'image/png');
  });
}
