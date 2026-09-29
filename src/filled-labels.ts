import type { MermaidConfig } from 'mermaid';
import { textOnFill } from './colors';
import { isRecord, type DiagramType } from './settings';

/** Browser-computed colors include named source colors and Mermaid's derived colors. */
function rgb(value: string): number[] | undefined {
  const match = /^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/.exec(value);
  if (!match || (match[4] !== undefined && Number(match[4]) !== 1)) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}
function hex(channels: number[]): string {
  return '#' + channels.map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('');
}

/** Adjust only labels on filled shapes; authored text colors keep precedence. */
export function styleFilledLabels(svg: Element, type: DiagramType, config: MermaidConfig,
  authored: Record<string, unknown>, host: HTMLElement): void {
  if (!['sequence', 'gantt', 'pie', 'git', 'flowchart', 'mindmap', 'usecase', 'eventmodeling'].includes(type)) return;
  const variables = isRecord(authored.themeVariables) ? authored.themeVariables : {};
  const explicit = (...keys: string[]): boolean => keys.some(key => key in variables);
  // The detached XML SVG has no computed styles. Mount it in the existing hidden
  // measurement host and always detach it, including when a style read fails.
  host.appendChild(svg);
  try {
    const canvas = rgb(getComputedStyle(svg).backgroundColor);
    if (!canvas) return;
    const adjust = (label: SVGElement | HTMLElement, shape: Element | null, property: 'fill' | 'color' = 'fill'): void => {
      if (label.style.getPropertyValue(property)) return;
      const foreground = rgb(getComputedStyle(label)[property]);
      const style = shape ? getComputedStyle(shape) : undefined;
      const fill = style ? rgb(style.fill) : canvas;
      if (!foreground || !fill) return;
      const opacity = style ? Number(style.opacity) * Number(style.fillOpacity) : 1;
      const background = hex(fill.map((channel, i) => channel * opacity + canvas[i]! * (1 - opacity)));
      const preferred = hex(foreground);
      const color = textOnFill(background, preferred);
      if (color !== preferred) label.style.setProperty(property, color, 'important');
    };
    if (['flowchart', 'mindmap', 'usecase'].includes(type) && !explicit('primaryTextColor', 'textColor', 'nodeTextColor', 'labelTextColor')) {
      for (const node of svg.querySelectorAll('.node')) {
        const label = node.querySelector<SVGElement>(':scope > .label');
        if (!label || label.style.fill || label.style.color) continue;
        // Class/style directives are compiled into inline label styles by Mermaid.
        if ([...label.querySelectorAll<SVGElement>('[style]')].some(e => e.style.fill || e.style.color)) continue;
        if (type === 'mindmap' && (Object.keys(variables).some(key => /^cScaleLabel\d+$/.test(key)) || explicit('gitBranchLabel0', 'branchLabelColor'))) continue;
        const container = node.querySelector(':scope > .label-container, :scope > .node-bkg');
        const shape = container?.matches('rect,circle,ellipse,path,polygon') ? container :
          [...container?.querySelectorAll('rect,circle,ellipse,path,polygon') ?? []].find(e => getComputedStyle(e).fill !== 'none');
        if (!shape) continue;
        for (const text of label.querySelectorAll<SVGElement>('text')) adjust(text, shape);
        for (const html of label.querySelectorAll<HTMLElement>('foreignObject > div')) adjust(html, shape, 'color');
      }
    }
    if (type === 'eventmodeling' && !explicit('textColor', 'primaryTextColor')) {
      for (const box of svg.querySelectorAll('.em-box')) {
        const label = box.querySelector<HTMLElement>('foreignObject > div');
        if (label) adjust(label, box.querySelector('rect'), 'color');
      }
    }
    if (type === 'sequence'  && !explicit('sequenceNumberColor')) {
      const circle = svg.querySelector('marker[id$="-sequencenumber"] circle');
      if (circle) for (const label of svg.querySelectorAll<SVGElement>('.sequenceNumber')) adjust(label, circle);
    }
    if (type === 'gantt') {
      for (const label of svg.querySelectorAll<SVGElement>('text.taskText')) {
        const shape = svg.querySelector(`#${CSS.escape(label.id.replace(/-text$/, ''))}`);
        if (!shape || label.classList.contains('clickable')) continue;
        // Source classes may intentionally style individual tasks.
        if ([...shape.classList].some(name => !/^(?:task|milestone|vert|(?:task|active|done|crit|activeCrit|doneCrit)\d+)$/.test(name))) continue;
        const highlighted = /(?:active|done)(?:Crit)?Text\d/.test(label.getAttribute('class') ?? '');
        if (explicit(highlighted ? 'taskTextDarkColor' : 'taskTextColor')) continue;
        adjust(label, shape);
      }
    }
    if (type === 'pie' && !explicit('pieSectionTextColor')) {
      const shapes = svg.querySelectorAll('.pieCircle');
      const position = config.pie?.textPosition ?? 0.75;
      const hole = config.pie?.donutHole ?? 0;
      // Mermaid emits the same filtered arc list for the slices and their labels.
      svg.querySelectorAll<SVGElement>('text.slice').forEach((label, index) => {
        adjust(label, position > hole && position <= 1 ? shapes.item(index) : null);
      });
    }
    if (type === 'git') {
      for (const shape of svg.querySelectorAll('.branchLabelBkg')) {
        const index = /\blabel(\d+)\b/.exec(shape.getAttribute('class') ?? '')?.[1];
        if (!index || explicit(`gitBranchLabel${index}`, 'branchLabelColor', 'labelTextColor')) continue;
        const label = shape.nextElementSibling?.querySelector<SVGElement>(`.branch-label${index} text`);
        if (label) adjust(label, shape);
      }
    }
  } finally { svg.remove(); }
}
