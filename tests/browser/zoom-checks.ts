import { BeautyRenderer } from '../../src/renderer';
import { loadSettings } from '../../src/settings';
import { fixtures } from './fixtures';

type Check = (name: string, action: () => Promise<void>) => Promise<void>;
const graphics = 'path, line, rect, circle, ellipse, polygon, polyline, text, use';
const strokeProperties = ['stroke-width', 'stroke-dasharray', 'stroke', 'fill', 'marker-start', 'marker-mid', 'marker-end', 'vector-effect'];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function mount(parent: Element, source: string): SVGSVGElement {
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
  const svg = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
  parent.append(svg);
  return svg;
}

// Mirror Zoom 1.7's detached clone. It reads viewBox before attaching the modal,
// removes inline width/height, and scales a shrink-to-fit wrapper afterwards.
function zoomClone(svg: SVGSVGElement): { wrapper: HTMLDivElement; clone: SVGSVGElement } {
  const wrapper = document.createElement('div'); wrapper.className = 'mermaid-zoom-modal-wrapper';
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.style.removeProperty('width'); clone.style.removeProperty('height');
  clone.style.maxWidth = `${clone.viewBox.baseVal.width}px`;
  wrapper.append(clone);
  assert(clone.getBoundingClientRect().width === 0, 'Zoom must measure a detached clone');
  return { wrapper, clone };
}

export async function checkZoom(renderer: BeautyRenderer, output: Element, test: Check): Promise<void> {
  let serial = 0;
  const samples = [...fixtures, {
    name: 'Sequence loops and activations',
    source: 'sequenceDiagram\nparticipant A as Client\nparticipant B as Service\nloop Poll\nA->>B: Fetch the next available work item\nactivate B\nalt Ready\nB-->>A: Return work\nelse Waiting\nA->>A: Retry later\nend\nNote over A,B: Keep request and response order\ndeactivate B\nend',
  }];
  for (const fixture of samples) for (const dark of [false, true]) for (const fitWidth of [false, true]) {
    await test(`Zoom ${fixture.name} / ${dark ? 'dark' : 'light'} / fit=${fitWidth}: dimensions, strokes and markers`, async () => {
      document.body.classList.toggle('theme-dark', dark);
      const host = document.createElement('div'); output.append(host);
      try {
        host.className = 'preview-zoom-host';
        const inline = document.createElement('div'); inline.className = 'mermaid'; host.append(inline);
        const result = await renderer.render(`zoom-${++serial}`, fixture.source,
          loadSettings({ defaults: { fitWidth, lineWidth: 1.5 } }), inline);
        const svg = mount(inline, result.svg);
        const elements = [...svg.querySelectorAll<SVGGraphicsElement>(graphics)];
        assert(elements.length > 0, 'Missing graphic elements');
        const expected = elements.map(element => {
          const style = getComputedStyle(element);
          return strokeProperties.map(property => style.getPropertyValue(property));
        });
        const { width, height } = svg.viewBox.baseVal;
        for (const viewport of [320, 900]) {
          host.style.width = `${viewport}px`;
          const inlineBounds = svg.getBoundingClientRect();
          const inlineMarkup = svg.outerHTML;
          const { wrapper, clone } = zoomClone(svg);
          host.append(wrapper);
          try {
            const copies = [...clone.querySelectorAll<SVGGraphicsElement>(graphics)];
            assert(copies.length === elements.length, 'Zoom lost shapes or markers');
            for (const scale of [0.25, 1, 3]) {
              wrapper.style.transform = `scale(${scale})`;
              const box = clone.getBoundingClientRect();
              assert(Math.abs(box.width - width * scale) < 1, `Zoom width ${box.width} does not match ${width} × ${scale}`);
              assert(Math.abs(box.height - height * scale) < 1, `Zoom height ${box.height} does not match ${height} × ${scale}`);
              const matrix = clone.getScreenCTM()!;
              assert(Math.abs(matrix.a - scale) < 0.01 && Math.abs(matrix.d - scale) < 0.01,
                'Extra SVG scaling distorts strokes and markers');
              copies.forEach((copy, index) => {
                const style = getComputedStyle(copy);
                strokeProperties.forEach((property, propertyIndex) => {
                  assert(style.getPropertyValue(property) === expected[index]![propertyIndex],
                    `${copy.localName}.${copy.getAttribute('class') ?? ''} ${property}: ${style.getPropertyValue(property)} != ${expected[index]![propertyIndex]}`);
                });
              });
            }
            assert(svg.outerHTML === inlineMarkup, 'Opening Zoom mutated the inline SVG');
            const after = svg.getBoundingClientRect();
            assert(Math.abs(after.width - inlineBounds.width) < 1 && Math.abs(after.height - inlineBounds.height) < 1,
              'Opening Zoom resized the inline diagram');
            clone.classList.remove('mermaid-beauty-diagram');
            assert(copies.some(element => getComputedStyle(element).vectorEffect === 'non-scaling-stroke'),
              'Beauty compatibility reached a native SVG');
          } finally { wrapper.remove(); }
        }
      } finally { host.remove(); document.body.classList.remove('theme-dark'); }
    });
  }
  await test('Zoom retains explicit widths, dashed, thick and invisible edges and source vector effects', async () => {
    const host = document.createElement('div'); output.append(host);
    try {
      const source = 'flowchart LR\nA[Browse] --> B[Order]\nB -.-> C[Pay]\nC ==> D[Ship]\nA ~~~ D\nlinkStyle 0 stroke-width:5px\nclassDef fixed stroke-width:4px,vector-effect:non-scaling-stroke\nclass A fixed';
      const result = await renderer.render(`zoom-source-${++serial}`, source, loadSettings({ defaults: { lineWidth: 1.5 } }), host);
      const svg = mount(host, result.svg);
      const { wrapper, clone } = zoomClone(svg); host.append(wrapper);
      const edges = [...clone.querySelectorAll('.flowchart-link')];
      assert(edges.some(edge => getComputedStyle(edge).strokeWidth === '5px'), 'Explicit width lost');
      assert(getComputedStyle(clone.querySelector('.edge-pattern-dotted')!).strokeDasharray !== 'none', 'Dashed edge lost');
      assert(getComputedStyle(clone.querySelector('.edge-thickness-thick')!).strokeWidth === '3px', 'Thick edge lost');
      assert(getComputedStyle(clone.querySelector('.edge-thickness-invisible')!).strokeWidth === '0px', 'Invisible edge became visible');
      const fixed = clone.querySelector('.node.fixed rect')!;
      assert(getComputedStyle(fixed).strokeWidth === '4px' && getComputedStyle(fixed).vectorEffect === 'non-scaling-stroke',
        'Explicit node style was overridden');
      for (const edge of edges) assert(getComputedStyle(edge).vectorEffect === 'none', 'Connector does not scale with its arrow');
    } finally { host.remove(); }
  });
}
