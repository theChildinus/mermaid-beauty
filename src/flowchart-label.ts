/** Reserve the label's actual background before routing connectors around it. */
export function measureFlowchartLabel(element: SVGGElement, fontSize: number, quiet = false): void {
  const text = element.querySelector('text');
  const background = element.querySelector('rect');
  if (!text || !background) return;
  const box = text.getBBox();
  if (!(box.width > 0 && box.height > 0)) return;
  const inset = quiet ? 4 : fontSize * 0.8;
  const height = quiet ? box.height + 4 : Math.max(fontSize * 1.8, box.height + 8);
  background.setAttribute('x', String(box.x - inset));
  background.setAttribute('y', String(box.y - (height - box.height) / 2));
  background.setAttribute('width', String(box.width + inset * 2));
  background.setAttribute('height', String(height));
  background.setAttribute('data-beauty-measured', 'true');
}
