import type { BeautyRenderer } from '../../src/renderer';
import { flowchartSourceId } from '../../src/flowchart-colors';
import { loadSettings, type BeautySettings } from '../../src/settings';
import { readmeExamples } from './readme-sources';

type Check = (name: string, action: () => Promise<void>) => Promise<void>;
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function cards(svg: SVGSVGElement): Map<string, { x: number; y: number; width: number; height: number; rect: SVGRectElement }> {
  return new Map([...svg.querySelectorAll<SVGGElement>('.node')].flatMap(node => {
    const rect = node.querySelector<SVGRectElement>(':scope > rect.label-container');
    const matrix = node.transform.baseVal.consolidate()?.matrix;
    if (!rect || !matrix) return [];
    const box = rect.getBBox(), label = node.querySelector<SVGGElement>('.label');
    if (label) {
      const text = label.getBBox(), transform = label.transform.baseVal.consolidate()?.matrix;
      assert(transform && text.x + transform.e >= box.x - 1 && text.x + transform.e + text.width <= box.x + box.width + 1, `Clipped label: ${node.id}`);
    }
    return [[flowchartSourceId(node.id, svg.id), { x: matrix.e, y: matrix.f, width: box.width, height: box.height, rect }] as const];
  }));
}
function points(svg: SVGSVGElement, id: string): { x: number; y: number }[] {
  const path = [...svg.querySelectorAll('.flowchart-link')].find(edge => edge.getAttribute('data-id') === id);
  assert(path && path.getAttribute('marker-end'), `Missing arrow: ${id}`);
  return JSON.parse(atob(path.getAttribute('data-points')!)) as { x: number; y: number }[];
}
function same(values: number[], message: string): void {
  assert(Math.max(...values) - Math.min(...values) < 0.1, `${message}: ${values.join(', ')}`);
}

/** Use the production renderer: geometry helpers alone cannot verify ELK and SVG agree. */
export async function checkFlowchartLayout(renderer: BeautyRenderer, output: Element, test: Check): Promise<void> {
  let serial = 0;
  const containers: HTMLElement[] = [];
  const render = async (source: string, settings: BeautySettings = loadSettings({})): Promise<SVGSVGElement> => {
    const container = document.createElement('div'); container.className = 'mermaid'; output.append(container); containers.push(container);
    const result = await renderer.render(`geometry-${++serial}`, source, settings, container);
    const svg = document.importNode(new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement, true) as unknown as SVGSVGElement;
    container.append(svg);
    assert(svg.viewBox.baseVal.width > 0 && svg.viewBox.baseVal.height > 0, 'Invalid layout bounds');
    return svg;
  };
  try {
    for (const dark of [false, true]) {
      document.body.classList.toggle('theme-dark', dark);
      await test(`Flowchart layout release workflow / ${dark ? 'dark' : 'light'}`, async () => {
        const svg = await render(readmeExamples[0]!.source), nodes = cards(svg);
        assert(svg.querySelectorAll('.node').length === 11 && svg.querySelectorAll('.flowchart-link').length === 16, 'Release graph semantics changed');
        const checks = ['B', 'C', 'D', 'E'].map(id => nodes.get(id)!);
        same(checks.map(node => node.width), 'Checks widths');
        same(checks.map(node => node.x), 'Checks alignment');
        const route = points(svg, 'L_B_G_0');
        assert(route.length === 2, 'Tiny Build–Preview jog remains');
        same(route.map(point => point.y), 'Build–Preview is horizontal');
        const source = nodes.get('B')!, target = nodes.get('G')!;
        assert(Math.abs(route[0]!.x - source.x - source.width / 2) < 0.1 && Math.abs(route[1]!.x - target.x + target.width / 2) < 0.1, 'Detached straightened endpoints');
        assert(points(svg, 'L_J_A_0').length > 2, 'Feedback detour removed');
        assert(svg.querySelector('[id*="flowchart-H-"] path, [id*="flowchart-H-"] polygon'), 'Decision shape lost');
      });
    }
    document.body.classList.remove('theme-dark');
    for (const direction of ['LR', 'RL', 'TB', 'BT']) await test(`Flowchart layout independent nested branches ${direction}`, async () => {
      const svg = await render(`flowchart ${direction}
        subgraph Outer[Work]
          subgraph Parallel[Parallel checks]
            Short[One]
            Long[Extended quality review]
            Medium[Package]
          end
        end
        Start[Input] --> Short & Long & Medium
        Short & Long & Medium --> Finish[Complete]`);
      const nodes = cards(svg), branches = ['Short', 'Long', 'Medium'].map(id => nodes.get(id)!);
      assert(nodes.size === 5 && svg.querySelectorAll('.flowchart-link').length === 6, 'Branch topology changed');
      same(branches.map(node => node.width), 'Branch widths');
      same(branches.map(node => node[direction === 'LR' || direction === 'RL' ? 'x' : 'y']), 'Branch layer alignment');
    });
    await test('Flowchart layout preserves semantic shapes and explicit styles', async () => {
      const source = `flowchart LR
        subgraph Group
          A[Short]
          B[A longer review]
          C{A decision with much longer text}
          D[Fixed]
        end
        Start --> A & B & C & D
        A & B & C & D --> End
        style D width:240px,fill:#ffeeaa,stroke:#884400`;
      const svg = await render(source), nodes = cards(svg);
      same([nodes.get('A')!.width, nodes.get('B')!.width], 'Automatic widths');
      assert(!nodes.has('C'), 'Decision replaced by a plain rectangle');
      assert(nodes.get('D')!.width === 240 && getComputedStyle(nodes.get('D')!.rect).fill === 'rgb(255, 238, 170)', 'Authored size or fill lost');
    });
    await test('Flowchart layout respects explicit ELK and Dagre selections', async () => {
      for (const layout of ['elk', 'dagre']) {
        const svg = await render(`---\nconfig:\n  layout: ${layout}\n---\n${readmeExamples[0]!.source}`);
        const nodes = cards(svg);
        assert(Math.abs(nodes.get('B')!.width - nodes.get('D')!.width) > 20, `${layout}: automatic width normalization leaked into authored layout`);
      }
    });
    await test('Flowchart layout honors disabled edge straightening', async () => {
      const svg = await render(`---\nconfig:\n  elk:\n    straightenEdges: false\n---\n${readmeExamples[0]!.source}`);
      assert(points(svg, 'L_B_G_0').length > 2, 'Source opt-out for straightening ignored');
    });
  } finally {
    document.body.classList.remove('theme-dark');
    for (const container of containers) container.remove();
  }
}
