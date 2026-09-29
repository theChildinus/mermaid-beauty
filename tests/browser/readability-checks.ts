import type { BeautyRenderer } from '../../src/renderer';
import { contrastRatio } from '../../src/colors';
import { loadSettings, PALETTES, type PaletteName } from '../../src/settings';
import { fixtures } from './fixtures';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
type RGB = [number, number, number];
function rgb(value: string): RGB | undefined {
  const match = /^rgba?\(([^)]+)\)$/.exec(value);
  if (!match) return undefined;
  return match[1]!.split(',').slice(0, 3).map(Number) as RGB;
}
const hex = (c: RGB): string => '#' + c.map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
const mix = (a: RGB, b: RGB, opacity: number): RGB => a.map((v, i) => v * opacity + b[i]! * (1 - opacity)) as RGB;
function opacity(element: Element, svg: SVGSVGElement): number {
  let result = 1;
  for (let e: Element | null = element; e && e !== svg; e = e.parentElement) result *= Number(getComputedStyle(e).opacity);
  return result;
}
/** Sample the painted background beneath each label, including translucent chart fills. */
function textContrast(svg: SVGSVGElement): void {
  const canvas = rgb(getComputedStyle(svg).backgroundColor)!;
  const shapes = [...svg.querySelectorAll<SVGGeometryElement>('rect,circle,ellipse,path,polygon')].filter(e => !e.closest('defs,clipPath,marker'));
  const issues: string[] = [];
  for (const label of svg.querySelectorAll<SVGElement | HTMLElement>('text:not(:has(tspan)), tspan:not(:has(tspan)), foreignObject *:not(:has(*))')) {
    if (!label.textContent?.trim() || label.closest('defs') || !label.getBoundingClientRect().width || !opacity(label, svg)) continue;
    const color = rgb(getComputedStyle(label)[label.closest('foreignObject') ? 'color' : 'fill']);
    if (!color) continue;
    const box = label.getBoundingClientRect(), center = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
    let background = canvas;
    for (const shape of shapes) {
      if (!(shape.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      const style = getComputedStyle(shape), fill = rgb(style.fill), matrix = shape.getScreenCTM();
      if (!fill || !matrix || style.display === 'none' || style.visibility === 'hidden') continue;
      const p = center.matrixTransform(matrix.inverse());
      if (shape.isPointInFill(p)) background = mix(fill, background, Number(style.fillOpacity) * opacity(shape, svg));
    }
    // A background-colored halo keeps Sankey labels legible over crossing bands.
    const style = getComputedStyle(label);
    if (style.paintOrder.startsWith('stroke') && Number.parseFloat(style.strokeWidth) >= 3) background = rgb(style.stroke) ?? background;
    const ratio = contrastRatio(hex(color), hex(background));
    if (ratio < 4.5) issues.push(`${label.textContent.trim()}: ${ratio.toFixed(2)} (${hex(color)} on ${hex(background)})`);
  }
  assert(!issues.length, issues.slice(0, 6).join('; '));
}
const outlines: Record<string, string> = {
  flowchart: '.flowchart-link', sequence: '.messageLine0', class: '.relation', state: '.transition', er: '.relationshipLine',
  mindmap: '.edge', timeline: '.node-bkg,.lineWrapper line', c4: '[marker-end]', sankey: '.nodes rect', packet: '.packetBlock',
  architecture: '.node-bkg,.edge', radar: '[class^="radarCurve-"]', treemap: '.treemapLeaf', venn: '.venn-circle > path',
  treeview: '.treeView-node-line', wardley: '.wardley-link,.wardley-stages line',
  gantt: 'rect.task', pie: '.pieCircle', journey: 'rect.task,.task-line', git: '.commit,.commit-arrows .arrow',
  quadrant: '.border line', requirement: '.relationshipLine', xy: '.plot rect,.plot path,.axis-line path',
  block: '.node .label-container', kanban: '.sections .cluster > rect,.items .node > rect',
  railroad: '.railroad-line', cynefin: '.cynefinBoundary,.cynefinConfusion', swimlane: '.flowchart-link',
  usecase: '.relationship,.usecase-ellipse > ellipse', agentflow: '.flowchart-link', eventmodeling: '.em-relation',
  ishikawa: '.ishikawa-spine,.ishikawa-branch', zenuml: '.message-line,.self-call svg path,.fragment > svg path',

};
function visibleOutlines(svg: SVGSVGElement, type: string): void {
  const selector = outlines[type];
  if (!selector) return;
  const canvas = rgb(getComputedStyle(svg).backgroundColor)!;
  const elements = [...svg.querySelectorAll<SVGElement>(selector)];
  assert(elements.length, `${type}: outline selector covers no elements`);
  for (const element of elements) {
    const style = getComputedStyle(element);
    // The small Git merge circle is a cutout inside the preceding commit disk.
    const background = element.classList.contains('commit-merge')
      ? rgb(getComputedStyle(element.previousElementSibling!).fill)! : canvas;
    const stroke = rgb(style.stroke), fill = element.tagName === 'line' ? undefined : rgb(style.fill);
    const ratio = Math.max(stroke ? contrastRatio(hex(stroke), hex(background)) : 0, fill ? contrastRatio(hex(fill), hex(background)) : 0);
    assert(ratio >= 3, `${type} ${element.getAttribute('class')}: outline/fill contrast ${ratio.toFixed(2)}`);
  }
}
export async function checkReadability(renderer: BeautyRenderer, output: Element,
  test: (name: string, action: () => Promise<void>) => Promise<void>): Promise<void> {
  const host = document.createElement('div'); host.className = 'mermaid preview-readability'; output.append(host);
  let serial = 0;
  try {
    for (const palette of Object.keys(PALETTES) as PaletteName[]) for (const dark of [false, true]) {
      document.body.classList.toggle('theme-dark', dark);
      for (const fixture of fixtures) {
        await test(`Readability ${palette} ${dark ? 'dark' : 'light'} ${fixture.name}`, async () => {
          const result = await renderer.render(`readability-${++serial}`, fixture.source, loadSettings({ defaults: { palette } }), host);
          const svg = document.importNode(new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement, true) as unknown as SVGSVGElement;
          host.replaceChildren(svg);
          textContrast(svg);
          if (!['Shapes and styles', 'Source config'].includes(fixture.name)) visibleOutlines(svg, fixture.type);
        });
      }
    }
    await test('Specialized diagrams retain authored colors and Sankey quantities', async () => {
      const cases = [
        ['architecture', { themeVariables: { archGroupBorderColor: '#ff00ff' } }, '.node-bkg', 'stroke'],
        ['packet', { themeVariables: { packet: { labelColor: '#ff00ff' } } }, '.packetLabel', 'fill'],
        ['treeview', { themeVariables: { treeView: { labelColor: '#ff00ff' } } }, '.treeView-node-label', 'fill'],
        ['radar', { themeVariables: { cScale0: '#ff00ff' } }, '.radarCurve-0', 'stroke'],
        ['venn', { themeVariables: { vennSetTextColor: '#ff00ff' } }, '.venn-circle text', 'fill'],
        ['wardley', { themeVariables: { wardley: { componentLabelColor: '#ff00ff' } } }, '.wardley-node-label', 'fill'],
        ['railroad', { railroad: { terminalFill: '#ff00ff' } }, '.railroad-terminal rect', 'fill'],
      ] as const;
      for (const [type, config, selector, property] of cases) {
        const source = `%%{init: ${JSON.stringify(config)}}%%\n${fixtures.find(f => f.type === type)!.source}`;
        const result = await renderer.render(`authored-${++serial}`, source, loadSettings({}), host);
        host.replaceChildren(document.importNode(new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement, true));
        assert(getComputedStyle(host.querySelector(selector)!)[property] === 'rgb(255, 0, 255)', `${type} authored color lost`);
      }
      const c4 = fixtures.find(f => f.type === 'c4')!.source + '\nUpdateRelStyle(reader, library, "#ff00ff", "#0000ff")';
      const result = await renderer.render(`authored-${++serial}`, c4, loadSettings({}), host);
      host.replaceChildren(document.importNode(new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement, true));
      const relationship = host.querySelector('line[marker-end]')!;
      assert(getComputedStyle(relationship).stroke === 'rgb(0, 0, 255)', 'Authored C4 relationship color lost');
      const sankey = await renderer.render(`authored-${++serial}`, fixtures.find(f => f.type === 'sankey')!.source, loadSettings({}), host);
      host.replaceChildren(document.importNode(new DOMParser().parseFromString(sankey.svg, 'image/svg+xml').documentElement, true));
      const widths = [...host.querySelectorAll('.link path')].map(e => Number(e.getAttribute('stroke-width')));
      assert(Math.abs(widths[0]! / widths[1]! - 40 / 60) < 0.001 && Math.abs(widths[2]! / widths[3]! - 75 / 25) < 0.001, 'Sankey flow quantities changed');
      for (const link of host.querySelectorAll('.link')) assert(getComputedStyle(link).mixBlendMode === 'normal', 'Darkening blend mode remains');
    });
    for (const type of ['mindmap' , 'usecase', 'flowchart'] as const) for (const fontSize of [10, 15, 28]) {
      await test(`Centered node labels ${type} font ${fontSize}`, async () => {
        const source = type === 'flowchart' ? 'flowchart LR\n A((中文圆形)) --> B([English capsule]) --> C{多行<br/>文字}' : fixtures.find(f => f.type === type)!.source;
        const result = await renderer.render(`alignment-${++serial}`, source, loadSettings({ defaults: { fontSize } }), host);
        const svg = document.importNode(new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement, true) as unknown as SVGSVGElement;
        host.replaceChildren(svg);
        for (const width of [1000, 360]) {
          host.style.width = `${width}px`;
          for (const node of svg.querySelectorAll('.node')) {
            const shape = node.querySelector<SVGGraphicsElement>(':scope > circle,:scope > ellipse,:scope > .label-container');
            const label = node.querySelector<SVGGraphicsElement>(':scope > .label');
            if (!shape || !label || !label.textContent?.trim()) continue;
            const a = shape.getBoundingClientRect(), b = label.getBoundingClientRect();
            assert(b.left >= a.left - 1 && b.right <= a.right + 1 && b.top >= a.top - 1 && b.bottom <= a.bottom + 1, `Text escapes ${label.textContent}`);
            assert(Math.abs((a.left + a.right) - (b.left + b.right)) < 2, `Text not centered: ${label.textContent}`);
          }
        }
        host.style.removeProperty('width');
      });
    }
  } finally { host.remove(); document.body.classList.remove('theme-dark'); }
}
