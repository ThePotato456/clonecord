export async function getCanvasFingerprint(): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return 'no-canvas-context';
  }

  ctx.textBaseline = 'top';
  ctx.font = '16px Arial';
  ctx.fillStyle = '#8b5cf6';
  ctx.fillRect(8, 8, 120, 24);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Hermes Discord Clone', 12, 12);
  ctx.strokeStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(180, 34, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#3b82f6';
  ctx.fillText(`${window.devicePixelRatio}:${navigator.userAgent.slice(0, 32)}`, 10, 50);

  const data = canvas.toDataURL();
  let hash = 0;
  for (let index = 0; index < data.length; index += 1) {
    hash = (hash << 5) - hash + data.charCodeAt(index);
    hash |= 0;
  }

  return `cv-${Math.abs(hash).toString(16)}`;
}
