import type { DiagramType } from './settings';

// Target connections only. Broad path/line selectors also catch node outlines,
// chart axes, icons, and Sankey bands whose width represents a quantity.
export const CONNECTORS: Partial<Record<DiagramType, string>> = {
  flowchart: '.flowchart-link', sequence: '.messageLine0, .messageLine1, .actor-line',
  class: '.relation', state: '.transition', er: '.relationshipLine', requirement: '.relationshipLine',
  mindmap: '.edgePaths .edge', journey: '.task-line',
  git: 'line.branch, .commit-arrows path.arrow', c4: 'line[marker-end]',
  block: '.flowchart-link', architecture: 'path.edge', railroad: '.railroad-line',
  treeview: '.treeView-node-line', swimlane: '.flowchart-link', usecase: 'path.relationship',
  agentflow: '.flowchart-link', eventmodeling: '.em-relation',
  ishikawa: '.ishikawa-spine, .ishikawa-branch, .ishikawa-sub-branch', wardley: '.wardley-link',
  zenuml: '.lifeline, .message-line, .return-line, .return-arrow',
};

export function connectorWidthCss(type: DiagramType, width: number, scope = ''): string {
  const selector = CONNECTORS[type];
  if (!selector || !(width > 0)) return '';
  // Inline source styles retain precedence. Keep Mermaid's thick and invisible
  // edge semantics instead of making every connection the same weight.
  const select = (suffix: string): string => selector.split(',').map(part => `${scope}${part.trim()}${suffix}`).join(', ');
  return `${select(':not(.edge-thickness-invisible)')} { stroke-width: ${width}px; }
    ${select('.edge-thickness-thick')} { stroke-width: ${width * 2}px; }
    ${select('.edge-thickness-invisible')} { stroke-width: 0; }`;
}

export function styleConnectorWidth(svg: Element, type: DiagramType, width: number): void {
  const id = svg.getAttribute('id');
  if (!id) return;
  const css = connectorWidthCss(type, width, `#${CSS.escape(id)} `);
  if (!css) return;
  // Some renderers (including Wardley) do not consume Mermaid's themeCSS.
  const style = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = css;
  svg.appendChild(style);
}
