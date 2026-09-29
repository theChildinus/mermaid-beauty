import type { MermaidConfig } from 'mermaid';

type Box = Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>;
interface KanbanNode { id: string; domId: string; parentId?: string; isGroup: boolean; }

/** Reserve a separate metadata row, or two rows when ticket and assignee cannot fit. */
export function kanbanCardLayout(width: number, title: Box, ticket: Box, assigned: Box): {
  height: number; title: { x: number; y: number }; ticket: { x: number; y: number }; assigned: { x: number; y: number };
} {
  const padding = 10, gap = 6;
  const left = -width / 2 + padding, right = width / 2 - padding;
  const metadataTop = padding + title.height + gap;
  const stacked = ticket.width > 0 && assigned.width > 0 && ticket.width + assigned.width + gap > width - padding * 2;
  const metadataHeight = stacked ? ticket.height + gap + assigned.height : Math.max(ticket.height, assigned.height);
  return {
    height: padding * 2 + title.height + (metadataHeight > 0 ? gap + metadataHeight : 0),
    title: { x: left - title.x, y: padding - title.y },
    ticket: { x: left - ticket.x, y: metadataTop - ticket.y },
    assigned: { x: (stacked ? left : right - assigned.width) - assigned.x,
      y: metadataTop + (stacked ? ticket.height + gap : 0) - assigned.y },
  };
}

/** Run inside Mermaid's measurement host, before it computes the SVG viewBox. */
export function arrangeKanban(svg: SVGSVGElement, nodes: KanbanNode[], config: MermaidConfig): void {
  if (config.look !== 'classic') return;
  const sections = nodes.filter(node => node.isGroup).map(node => {
    const group = svg.querySelector<SVGGElement>(`#${CSS.escape(node.domId)}`)!;
    return { node, group, rect: group.querySelector<SVGRectElement>(':scope > rect')!,
      label: group.querySelector<SVGGElement>('.cluster-label')! };
  });
  if (!sections.length) return;
  const headerHeight = Math.max(...sections.map(section => section.label.getBBox().height));
  const padding = 12, cardGap = 10;
  let columnHeight = padding * 2 + headerHeight;
  for (const section of sections) {
    const { rect, label } = section;
    const columnX = Number(rect.getAttribute('x')), columnWidth = Number(rect.getAttribute('width'));
    const header = label.getBBox();
    // Columns are 15px wider than their cards in the pinned Mermaid renderer.
    label.setAttribute('transform', `translate(${columnX + 17.5 - header.x}, ${padding - header.y})`);
    rect.setAttribute('y', '0');
    let top = padding + headerHeight + padding;
    for (const node of nodes.filter(node => !node.isGroup && node.parentId === section.node.id)) {
      const group = svg.querySelector<SVGGElement>(`#${CSS.escape(node.domId)}`)!;
      const card = group.querySelector<SVGRectElement>(':scope > rect.label-container')!;
      const labels = [...group.querySelectorAll<SVGGElement>(':scope > g.label')];
      const title = labels[0]!;
      const ticket = group.querySelector<SVGGElement>(':scope > a > g.label') ?? labels[1]!;
      const assigned = labels[labels.length - 1]!;
      const layout = kanbanCardLayout(Number(card.getAttribute('width')), title.getBBox(), ticket.getBBox(), assigned.getBBox());
      for (const [element, position] of [[title, layout.title], [ticket, layout.ticket], [assigned, layout.assigned]] as const) {
        element.setAttribute('transform', `translate(${position.x}, ${position.y})`);
      }
      card.setAttribute('y', '0'); card.setAttribute('height', String(layout.height));
      for (const priority of group.querySelectorAll(':scope > line')) {
        priority.setAttribute('y1', '5'); priority.setAttribute('y2', String(layout.height - 5));
      }
      group.setAttribute('transform', `translate(${columnX + columnWidth / 2}, ${top})`);
      top += layout.height + cardGap;
    }
    columnHeight = Math.max(columnHeight, top - cardGap + padding);
  }
  for (const { rect } of sections) rect.setAttribute('height', String(columnHeight));
}
