/** Include capsule padding in Mermaid's measurements, before the layout pass. */
export function measureFlowchartLabel(element: SVGGElement, fontSize: number): void {
  const text = element.querySelector('text');
  const background = element.querySelector('rect');
  if (!text || !background) return;
  const box = text.getBBox();
  if (!(box.width > 0 && box.height > 0)) return;
  const inset = fontSize * 0.8;
  const height = Math.max(fontSize * 1.8, box.height + 8);
  background.setAttribute('x', String(box.x - inset));
  background.setAttribute('y', String(box.y - (height - box.height) / 2));
  background.setAttribute('width', String(box.width + inset * 2));
  background.setAttribute('height', String(height));
  background.setAttribute('data-beauty-measured', 'true');
}
