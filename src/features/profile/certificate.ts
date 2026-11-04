/** Draws a branded certificate of completion on a canvas and saves it as a PNG on the device. */
export async function saveCertificate(opts: { name: string; track: string; trackN: number; date: string; lessons: number }) {
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
  g.fillText('Certificate of Completion', W / 2, 400);
  g.fillStyle = '#c9d3e0';
  g.font = '400 32px Inter, sans-serif';
  g.fillText('This records that', W / 2, 480);
  g.fillStyle = grad;
  g.font = '800 84px Montserrat, Inter, sans-serif';
  g.fillText(opts.name || 'A Controls Academy learner', W / 2, 580);
  g.fillStyle = '#c9d3e0';
  g.font = '400 32px Inter, sans-serif';
  g.fillText(`completed all ${opts.lessons} lessons and checks in`, W / 2, 660);
  g.fillStyle = '#ffffff';
  g.font = '700 48px Montserrat, Inter, sans-serif';
  g.fillText(`Track ${opts.trackN}: ${opts.track}`, W / 2, 740);
  g.fillStyle = '#3ddc97';
  g.font = '600 30px Inter, sans-serif';
  g.fillText(opts.date, W / 2, 810);

  g.fillStyle = '#9aa7b8';
  g.font = '400 22px Inter, sans-serif';
  g.fillText('A self-paced practice record. Not a qualification, certification, license or site authorization.', W / 2, 930);
  g.fillStyle = '#6ea6ff';
  g.font = '700 24px Montserrat, Inter, sans-serif';
  g.fillText('Advanced Engineering. Built Different.', W / 2, 980);

  await new Promise<void>((resolve) => {
    c.toBlob((blob) => {
      if (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `controls-academy-track-${opts.trackN}-certificate.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
      resolve();
    }, 'image/png');
  });
}
