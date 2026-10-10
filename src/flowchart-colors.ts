import type { MermaidConfig } from 'mermaid';
import type { LayoutData } from 'mermaid/dist/rendering-util/types.js';
import { isRecord } from './settings';
import { flowchartGroups } from './flowchart-groups';

/** Read the parsed graph before layout can introduce dummy nodes or reroute edges. */
export function flowchartGroupsForLayout(data: LayoutData): Map<string, number> | undefined {
  const theme = data.config.flowchart?.theme ?? data.config.theme;
  if (theme !== 'redux-color' && theme !== 'redux-dark-color') return;
  return flowchartGroups(data.nodes, data.edges.map(edge => {
    if (typeof edge.start !== 'string' || typeof edge.end !== 'string') throw new Error('Mermaid returned a flowchart edge without endpoints.');
    return { start: edge.start, end: edge.end, pattern: edge.pattern, arrowTypeStart: edge.arrowTypeStart };
  }));
}

/** Pinned Mermaid IDs contain the render ID, source node ID, and a changing counter. */
export function flowchartSourceId(nodeId: string, diagramId: string): string {
  const localId = nodeId.startsWith(`${diagramId}-`) ? nodeId.slice(diagramId.length + 1) : nodeId;
  return /^flowchart-(.+)-\d+$/.exec(localId)?.[1] ?? localId;
}

/** Mermaid colors flowchart containers, but leaves ordinary nodes in one color. */
export function styleFlowchartColors(svg: Element, config: MermaidConfig, groups: ReadonlyMap<string, number> | undefined): void {
  if (!groups) return;
  const variables: unknown = config.themeVariables;
  if (!isRecord(variables) || !Array.isArray(variables.bkgColorArray) || !Array.isArray(variables.borderColorArray)) return;
  const fills = variables.bkgColorArray as unknown[], borders = variables.borderColorArray as unknown[];
  if (!fills.length || !borders.length) return;
  const diagramId = svg.getAttribute('id') ?? '';
  for (const cluster of svg.querySelectorAll('.cluster[data-color-id]')) {
    const slot = groups.get(flowchartSourceId(cluster.id, diagramId));
    if (slot !== undefined) cluster.setAttribute('data-color-id', `color-${slot % Math.min(fills.length, borders.length)}`);
  }
  svg.querySelectorAll('.node').forEach(node => {
    // Icons and images keep their own fills; only the native node background is colored.
    const container = node.querySelector<SVGElement>(':scope > .label-container');
    if (!container) return;
    const slot = groups.get(flowchartSourceId(node.id, diagramId));
    if (slot === undefined) return;
    const fill = fills[slot % fills.length];
    const border = borders[slot % borders.length];
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
