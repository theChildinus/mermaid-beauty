import type { MermaidConfig } from 'mermaid';
import { isRecord } from './settings';

/** Pinned Mermaid IDs contain the render ID, source node ID, and a changing counter. */
export function flowchartColorIndex(nodeId: string, diagramId: string, count: number): number {
  const localId = nodeId.startsWith(`${diagramId}-`) ? nodeId.slice(diagramId.length + 1) : nodeId;
  const sourceId = /^flowchart-(.+)-\d+$/.exec(localId)?.[1] ?? localId;
  let hash = 0;
  for (let i = 0; i < sourceId.length; i++) hash = (Math.imul(hash, 31) + sourceId.charCodeAt(i)) | 0;
  return (hash >>> 0) % count;
}

/** Mermaid colors flowchart containers, but leaves ordinary nodes in one color. */
export function styleFlowchartColors(svg: Element, config: MermaidConfig): void {
  const variables: unknown = config.themeVariables;
  if (!isRecord(variables) || !Array.isArray(variables.bkgColorArray) || !Array.isArray(variables.borderColorArray)) return;
  const fills = variables.bkgColorArray as unknown[], borders = variables.borderColorArray as unknown[];
  if (!fills.length || !borders.length) return;
  const diagramId = svg.getAttribute('id') ?? '';
  svg.querySelectorAll('.node').forEach(node => {
    // Icons and images keep their own fills; only the native node background is colored.
    const container = node.querySelector<SVGElement>(':scope > .label-container');
    if (!container) return;
    const fill = fills[flowchartColorIndex(node.id, diagramId, fills.length)];
    const border = borders[flowchartColorIndex(node.id, diagramId, borders.length)];
    const shapes = container.matches('rect,circle,ellipse,path,polygon') ? [container]
      : [...container.querySelectorAll<SVGElement>('rect,circle,ellipse,path,polygon')];
    for (const shape of shapes) {
      // Authored class/style declarations are compiled to inline CSS by Mermaid.
      // Preserve open shapes and existing stroke-only details inside compound nodes.
      if (!shape.style.fill && shape.getAttribute('fill') !== 'none' && typeof fill === 'string') {
        shape.style.fill = fill;
      }
      if (!shape.style.stroke && typeof border === 'string') {
        shape.style.stroke = border;
      }
    }
  });
}
