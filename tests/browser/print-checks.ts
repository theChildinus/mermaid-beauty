import { BeautyRenderer } from '../../src/renderer';
import { loadSettings } from '../../src/settings';

type BrowserTest = (name: string, action: () => Promise<void>) => Promise<void>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function mount(parent: Element, source: string): SVGSVGElement {
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
  const svg = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
  parent.append(svg);
  return svg;
}

export async function checkPrinting(renderer: BeautyRenderer, output: Element, test: BrowserTest): Promise<void> {
  let serial = 0;
  const printRoot = document.createElement('section');
  printRoot.className = 'print preview-print-conflict';
  output.append(printRoot);
  try {
    await test('Print keeps a small fit-width diagram at its natural width', async () => {
      const container = document.createElement('div');
      container.className = 'mermaid preview-print-wide'; printRoot.append(container);
      const source = `flowchart TB
        A[Complex process design] --> C[Cross-paradigm evaluation]
        B[Inconsistent categories] --> C`;
      const result = await renderer.render(`print-small-${++serial}`, source, loadSettings({}), container);
      const svg = mount(container, result.svg);
      const naturalWidth = parseFloat(svg.style.maxWidth);
      const printedWidth = svg.getBoundingClientRect().width;
      assert(naturalWidth > 0 && naturalWidth < container.clientWidth - 20, 'Fixture is not smaller than the print area');
      assert(Math.abs(printedWidth - naturalWidth) < 1, `Small diagram expanded from ${naturalWidth}px to ${printedWidth}px`);
    });
    await test('Print still shrinks a wide fit-width diagram to the page', async () => {
      const container = document.createElement('div');
      container.className = 'mermaid preview-print-narrow'; printRoot.append(container);
      const source = 'flowchart LR\nA[Discover] --> B[Design] --> C[Build] --> D[Review] --> E[Release]';
      const result = await renderer.render(`print-wide-${++serial}`, source, loadSettings({}), container);
      const svg = mount(container, result.svg);
      const naturalWidth = parseFloat(svg.style.maxWidth);
      const printedWidth = svg.getBoundingClientRect().width;
      assert(naturalWidth > container.clientWidth, 'Fixture is not wider than the print area');
      assert(Math.abs(printedWidth - container.clientWidth) < 1, `Wide diagram did not fit the ${container.clientWidth}px print area`);
    });
  } finally {
    printRoot.remove();
  }
}
