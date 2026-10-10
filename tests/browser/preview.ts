import { CONNECTORS } from '../../src/line-width';
import type { DiagramType } from '../../src/settings';
import { exportReadmeExamples } from './readme-examples';
import { fixtures } from './fixtures';
import { BeautyRenderer } from '../../src/renderer';
import { DIAGRAM_TYPES, diagramType, loadSettings } from '../../src/settings';
import { attachRenderer, type MermaidHost } from '../../src/bridge';
import { checkPaletteContrast } from './contrast-checks';
import { checkKanban } from './kanban-checks';
import { checkReadability } from './readability-checks';
import { checkZoom } from './zoom-checks';
import { checkColorStyles } from './color-style-checks';

declare const BUILD_HASH: string;
const output = document.querySelector('#results')!;
const status = document.querySelector('#status')!;
const run = document.querySelector<HTMLButtonElement>('#run')!;
const exportButton = document.querySelector<HTMLButtonElement>('#export-readme')!;
exportButton.addEventListener('click', () => { void exportExamples(); });
async function exportExamples(): Promise<void> {
  exportButton.disabled = true; run.disabled = true;
  try {
    await exportReadmeExamples(document.querySelector('#readme-comparisons')!);
    status.textContent = 'Saved README comparison images for wide and narrow screens.';
  } catch (error) { status.textContent = String(error); }
  finally { exportButton.disabled = false; run.disabled = false; }
}
const compact = document.querySelector<HTMLInputElement>('#compact')!;
const dark = document.querySelector<HTMLInputElement>('#dark')!;
const filter = document.querySelector<HTMLSelectElement>('#filter')!;
for (const name of ['Coordinated colors', ...fixtures.map(fixture => fixture.name)]) {
  const option = document.createElement('option'); option.value = name; option.textContent = name; filter.append(option);
}
filter.addEventListener('change', () => {
  for (const card of output.querySelectorAll<HTMLElement>('.card')) card.hidden = Boolean(filter.value) && !card.querySelector('h2')?.textContent?.startsWith(`${filter.value} /`);
});
status.textContent = 'Renderer loaded. Ready to test.';
compact.addEventListener('change', () => document.body.classList.toggle('compact', compact.checked));
dark.addEventListener('change', () => document.body.classList.toggle('theme-dark', dark.checked));

const sample = document.querySelector<HTMLTextAreaElement>('#sample')!;
sample.value = fixtures[0]!.source;
let comparisonId = 0;
document.querySelector('#compare')!.addEventListener('click', () => { void compareLayouts().catch(showFailure); });
async function compareLayouts(): Promise<void> {
  const container = document.querySelector('#comparisons')!;
  container.replaceChildren();
  const renderer = new BeautyRenderer(() => document.createElement('div'),
    () => document.createElementNS('http://www.w3.org/2000/svg', 'style'));
  for (const alignment of ['LEFTUP', 'NONE', 'BALANCED', 'RIGHTDOWN']) {
    const card = document.createElement('article'); card.className = 'card light-card';
    const title = document.createElement('h2'); title.textContent = alignment; card.append(title);
    const diagram = document.createElement('div'); diagram.className = 'mermaid'; card.append(diagram); container.append(card);
    try {
      const settings = loadSettings({ defaults: { colorStyle: 'multi' }, types: { flowchart: { mode: 'beauty', config: JSON.stringify({ elk: { nodePlacementAlignment: alignment } }) } } });
      const result = await renderer.render(`compare-${++comparisonId}`, sample.value, settings, diagram);
      mount(diagram, result.svg);
    } catch (error) { card.append(String(error)); }
  }
  renderer.dispose();
}

function mount(parent: Element, source: string): SVGSVGElement {
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
  const svg = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
  parent.appendChild(svg);
  return svg;
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function showFailure(error: unknown): void {
  status.textContent = String(error); run.disabled = false; exportButton.disabled = false;
}
run.addEventListener('click', () => { void runChecks().catch(showFailure); });
async function runChecks(): Promise<void> {
  run.disabled = true; exportButton.disabled = true;
  output.replaceChildren();
  const renderer = new BeautyRenderer(() => document.createElement('div'),
    () => document.createElementNS('http://www.w3.org/2000/svg', 'style'));
  const results: { name: string; passed: boolean; error?: string }[] = [];
  const checks: { name: string; passed: boolean; error?: string }[] = [];
  let serial = 0;
  const test = async (name: string, action: () => Promise<void>): Promise<void> => {
    status.textContent = `Checking ${name}`;
    try { await action(); checks.push({ name, passed: true }); }
    catch (error) { checks.push({ name, passed: false, error: String(error) }); }
  };
  for (const isDark of [false, true]) {
    document.body.classList.toggle('theme-dark', isDark);
    for (const fixture of fixtures) {
      const name = `${fixture.name} / ${isDark ? 'dark' : 'light'}`;
      status.textContent = `Rendering ${name}`;
      const card = document.createElement('article');
      card.className = `card ${isDark ? 'dark-card' : 'light-card'}`;
      const title = document.createElement('h2');
      title.textContent = name;
      card.append(title);
      const diagram = document.createElement('div');
      diagram.className = 'mermaid';
      card.append(diagram);
      output.append(card);
      try {
        assert(diagramType(fixture.source) === fixture.type, `Incorrect type: ${diagramType(fixture.source)}`);
        const result = await renderer.render(`beauty-${++serial}`, fixture.source, loadSettings({}), diagram);
        const svg = mount(diagram, result.svg);
        result.bindFunctions?.(diagram);
        const box = svg.viewBox.baseVal;
        assert(box.width > 0 && box.height > 0 && Number.isFinite(box.width + box.height), 'Invalid SVG dimensions');
        assert(!result.svg.includes('Syntax error in text'), 'Rendered error diagram');
        assert(svg.getAttribute('data-mermaid-beauty-type') === fixture.type, 'Missing renderer marker');
        assert(svg.querySelectorAll('text, foreignObject').length > 0, 'No labels');
        const colorRect = svg.querySelector<SVGRectElement>('.node rect, rect.actor');
        if (fixture.name === 'Flowchart' || fixture.name === 'Sequence') {
          assert(colorRect && getComputedStyle(colorRect).fill === (isDark ? 'rgb(32, 62, 50)' : 'rgb(221, 243, 231)'), 'Default theme not applied');
        }
        if (fixture.name === 'Source config') {
          assert(colorRect && getComputedStyle(colorRect).fill === 'rgb(255, 238, 170)', 'Source theme override lost');
        }
        if (fixture.type === 'zenuml') {
          const participant = svg.querySelector('.participant-box')!;
          assert(getComputedStyle(participant).fill === (isDark ? 'rgb(32, 62, 50)' : 'rgb(221, 243, 231)'), 'ZenUML palette missing');
          assert(Array.from(svg.querySelectorAll('style')).every(style => !/(^|})\s*\./.test(style.textContent ?? '')), 'ZenUML has unscoped CSS');
        }
        if (fixture.type === 'c4') {
          const node = svg.querySelector('.c4-system rect')!;
          assert(getComputedStyle(node).fill === (isDark ? 'rgb(32, 62, 50)' : 'rgb(23, 107, 66)'), 'C4 palette missing');
        }
        results.push({ name, passed: true });
        card.dataset.passed = 'true';
      } catch (error) {
        results.push({ name, passed: false, error: String(error) });
        const message = document.createElement('pre');
        message.textContent = String(error);
        card.append(message);
        card.dataset.passed = 'false';
      }
      // Let the preview report progress while large fixture suites run.
      await new Promise(resolve => window.requestAnimationFrame(resolve));
    }
  }
  document.body.classList.remove('theme-dark');
  dark.checked = false;
  const palettes = document.querySelector('#palette-checks')!;
  palettes.replaceChildren();
  await checkPaletteContrast(renderer, palettes, test);
  await checkKanban(renderer, output, test);
  await checkReadability(renderer, output, test);
  await checkColorStyles(renderer, output, test);
  await test('Inherited settings ignore saved inactive custom options', async () => {
    const result = await renderer.render(`inherit-inactive-${++serial}`, fixtures[0]!.source,
      loadSettings({ types: { flowchart: { mode: 'inherit', config: '{ invalid JSON', palette: 'rose' } } }));
    assert(result.svg.includes('#ddf3e7') && !result.svg.includes('#f8e5ed'), 'Inactive options affected the diagram');
  });
  await test('Every declared diagram family has a fixture', async () => {
    const covered = new Set(fixtures.map(item => item.type));
    for (const type of Object.keys(DIAGRAM_TYPES)) assert(type === 'other' || covered.has(type as keyof typeof DIAGRAM_TYPES), `Uncovered family: ${type}`);
  });
  await test('Per-type colors remain isolated during concurrent rendering', async () => {
    const settings = loadSettings({ types: { sequence: { mode: 'beauty', palette: 'rose' } } });
    const sources = ['sequenceDiagram\nA->>B: one', 'flowchart LR; A-->B', 'sequenceDiagram\nB->>C: two'];
    const rendered = await Promise.all(sources.map(source => renderer.render(`isolation-${++serial}`, source, settings)));
    assert(rendered[0]!.svg.includes('#f8e5ed'), 'Custom sequence palette missing');
    assert(rendered[1]!.svg.includes('#ddf3e7'), 'Flowchart defaults missing');
    assert(!rendered[1]!.svg.includes('#f8e5ed'), 'Sequence options leaked to flowchart');
  });
  await test('Custom light and dark colors reach flowcharts, sequences, charts and ZenUML', async () => {
    const colors = {
      light: { surface: '#ffe4c4', text: '#713f12', border: '#b45309', label: '#fff7ed', line: '#78716c', accent: '#ea580c', background: '#fffbeb' },
      dark: { surface: '#4c1d95', text: '#ede9fe', border: '#8b5cf6', label: '#2e1065', line: '#c4b5fd', accent: '#a78bfa', background: '#18181b' },
    };
    const settings = loadSettings({ defaults: { colors }, types: { sequence: { mode: 'beauty', colors: { light: { surface: '#aaddff' } } } } });
    const container = document.createElement('div'); output.append(container);
    const rgb = (hex: string): string => `rgb(${[1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16)).join(', ')})`;
    try {
      for (const mode of ['light', 'dark'] as const) {
        document.body.classList.toggle('theme-dark', mode === 'dark');
        for (const type of ['flowchart', 'sequence', 'xy', 'zenuml'] as const) {
          container.replaceChildren();
          const result = await renderer.render(`custom-${++serial}`, fixtures.find(item => item.type === type)!.source, settings, container);
          const svg = mount(container, result.svg);
          const c = colors[mode];
          assert(getComputedStyle(svg).backgroundColor === rgb(c.background), `${type} background missing`);
          if (type === 'flowchart') {
            const node = svg.querySelector('.node rect')!;
            assert(getComputedStyle(node).fill === rgb(c.surface), 'Custom node fill missing');
            assert(getComputedStyle(node).stroke === rgb(c.border), 'Custom border missing');
            assert(getComputedStyle(svg.querySelector('.node text')!).fill === rgb(c.text), 'Custom text missing');
            assert(getComputedStyle(svg.querySelector('.edgeLabel rect')!).fill === rgb(c.label), 'Custom label fill missing');
            assert(getComputedStyle(svg.querySelector('.flowchart-link')!).stroke === rgb(c.line), 'Custom connector missing');
          } else if (type === 'sequence') {
            assert(getComputedStyle(svg.querySelector('rect.actor')!).fill === rgb(mode === 'light' ? '#aaddff' : c.surface), 'Per-type or dark inheritance failed');
          } else if (type === 'zenuml') {
            assert(getComputedStyle(svg.querySelector('.participant-box')!).fill === rgb(c.surface), 'Custom ZenUML fill missing');
          } else {
            assert(Array.from(svg.querySelectorAll('rect, path')).some(element => getComputedStyle(element).fill === rgb(c.accent)), 'Custom chart accent missing');
          }
        }
      }
    } finally { container.remove(); document.body.classList.remove('theme-dark'); }
  });
  await test('Preset selection hides saved custom colors and Custom restores them', async () => {
    const settings = loadSettings({ defaults: { palette: 'sky', useCustomColors: false,
      colors: { light: { surface: '#fedcba' }, dark: { surface: '#654321' } } } });
    const container = document.createElement('div'); output.append(container);
    try {
      for (const dark of [false, true]) {
        document.body.classList.toggle('theme-dark', dark);
        for (const custom of [false, true]) {
          settings.defaults.useCustomColors = custom;
          container.replaceChildren();
          const result = await renderer.render(`palette-switch-${++serial}`, 'flowchart LR; A[Choose] --> B[Enjoy]', settings, container);
          const svg = mount(container, result.svg);
          const expected = custom ? (dark ? 'rgb(101, 67, 33)' : 'rgb(254, 220, 186)')
            : (dark ? 'rgb(35, 59, 83)' : 'rgb(225, 239, 252)');
          assert(getComputedStyle(svg.querySelector('.node rect')!).fill === expected, 'Preset/custom switch did not update the rendered colors');
        }
      }
    } finally { container.remove(); document.body.classList.remove('theme-dark'); }
  });
  await test('Source colors override a custom palette', async () => {
    const result = await renderer.render(`source-custom-${++serial}`, fixtures.find(item => item.name === 'Source config')!.source,
      loadSettings({ defaults: { colors: { light: { surface: '#fedcba' } } } }));
    const container = document.createElement('div'); output.append(container);
    try {
      const svg = mount(container, result.svg);
      assert(getComputedStyle(svg.querySelector('.node rect')!).fill === 'rgb(255, 238, 170)', 'Custom palette replaced source color');
    } finally { container.remove(); }
  });
  for (const [type, selector] of Object.entries(CONNECTORS) as [DiagramType, string][]) {
    await test(`Connector width applies to ${type} in light and dark modes`, async () => {
      const container = document.createElement('div'); output.append(container);
      try {
        for (const dark of [false, true]) {
          document.body.classList.toggle('theme-dark', dark);
          container.replaceChildren();
          const result = await renderer.render(`line-width-${++serial}`, fixtures.find(item => item.type === type)!.source,
            loadSettings({ defaults: { lineWidth: 3 } }), container);
          const svg = mount(container, result.svg);
          const connectors = [...svg.querySelectorAll(selector)];
          assert(connectors.length > 0, `${type} has no matched connectors`);
          for (const connector of connectors) assert(getComputedStyle(connector).strokeWidth === '3px',
            `${type} connector has width ${getComputedStyle(connector).strokeWidth}`);
        }
      } finally { container.remove(); document.body.classList.remove('theme-dark'); }
    });
  }
  await test('Line widths preserve explicit, dashed, thick and invisible edges', async () => {
    const source = 'flowchart LR\nA[Browse] --> B[Order]\nB -.-> C[Pay]\nC ==> D[Ship]\nA ~~~ D\nlinkStyle 0 stroke-width:5px';
    const container = document.createElement('div'); output.append(container);
    try {
      const result = await renderer.render(`edge-meaning-${++serial}`, source, loadSettings({ defaults: { lineWidth: 2 } }), container);
      const svg = mount(container, result.svg);
      const edges = [...svg.querySelectorAll('.flowchart-link')];
      assert(edges.some(edge => getComputedStyle(edge).strokeWidth === '5px'), 'Explicit source width lost');
      assert(getComputedStyle(svg.querySelector('.edge-thickness-thick')!).strokeWidth === '4px', 'Thick edge lost its emphasis');
      const invisible = svg.querySelector('.edge-thickness-invisible');
      assert(invisible && getComputedStyle(invisible).strokeWidth === '0px', 'Invisible edge became visible');
      assert(getComputedStyle(svg.querySelector('.edge-pattern-dotted')!).strokeDasharray !== 'none', 'Dashed edge became solid');
    } finally { container.remove(); }
  });
  await test('Line width leaves node borders, chart axes and quantity-scaled bands unchanged', async () => {
    const container = document.createElement('div'); output.append(container);
    try {
      for (const [type, selector] of [['flowchart', '.node rect'], ['sankey', '.link path'], ['xy', 'path, line']] as const) {
        const widths: string[][] = [];
        for (const lineWidth of [1.1, 4]) {
          container.replaceChildren();
          const result = await renderer.render(`width-boundary-${++serial}`, fixtures.find(item => item.type === type)!.source,
            loadSettings({ defaults: { lineWidth } }), container);
          const svg = mount(container, result.svg);
          widths.push([...svg.querySelectorAll(selector)].map(node => getComputedStyle(node).strokeWidth));
        }
        assert(widths[0]!.length > 0 && JSON.stringify(widths[0]) === JSON.stringify(widths[1]), `${type} non-connector widths changed`);
      }
    } finally { container.remove(); }
  });
  await test('Per-type widths remain isolated', async () => {
    const settings = loadSettings({ defaults: { lineWidth: 2.4 }, types: { sequence: { mode: 'beauty', lineWidth: 0.5 } } });
    const container = document.createElement('div'); output.append(container);
    try {
      for (const type of ['flowchart', 'sequence', 'flowchart'] as const) {
        container.replaceChildren();
        const result = await renderer.render(`width-isolation-${++serial}`, fixtures.find(item => item.type === type)!.source, settings, container);
        const svg = mount(container, result.svg);
        const selector = type === 'flowchart' ? '.flowchart-link' : '.messageLine0';
        assert(getComputedStyle(svg.querySelector(selector)!).strokeWidth === (type === 'flowchart' ? '2.4px' : '0.5px'), `${type} width leaked`);
      }
    } finally { container.remove(); }
  });
  await test('Line width comparison renders at normal and narrow widths', async () => {
    for (const lineWidth of [1.1, 3, 6]) {
      const card = document.createElement('article'); card.className = 'card light-card';
      const title = document.createElement('h2'); title.textContent = `Line width ${lineWidth} / light`; card.append(title);
      const container = document.createElement('div'); container.className = 'mermaid'; card.append(container); output.append(card);
      const result = await renderer.render(`width-preview-${++serial}`, 'flowchart LR\nA[Browse products] -->|Choose| B[Place order]\nB -->|Pay| C[Receive package]',
        loadSettings({ defaults: { lineWidth } }), container);
      mount(container, result.svg); card.dataset.passed = 'true';
    }
  });
  await test('Native opt-out and unloading preserve the original renderer', async () => {
    let nativeCalls = 0;
    const host: MermaidHost = { render: async () => { nativeCalls++; return { svg: '<svg/>', diagramType: 'native' }; } };
    const native = host.render;
    const settings = loadSettings({ types: { sequence: { mode: 'native' } } });
    const detach = attachRenderer(host, () => settings, (id, source) => renderer.render(id, source, settings), () => undefined);
    assert((await host.render(`bridge-${++serial}`, 'flowchart LR; A-->B')).svg.includes('mermaid-beauty-diagram'), 'Enhanced path not called');
    await host.render(`bridge-${++serial}`, 'sequenceDiagram\nA->>B: Hi');
    assert(nativeCalls === 1, 'Native opt-out not called');
    detach();
    assert(host.render === native, 'Original renderer not restored');
  });
  await test('Invalid source does not poison the queue or leak measuring elements', async () => {
    let failed = false;
    try { await renderer.render(`invalid-${++serial}`, 'flowchart LR\nA[', loadSettings({})); } catch { failed = true; }
    assert(failed, 'Invalid syntax was accepted');
    const result = await renderer.render(`after-error-${++serial}`, 'flowchart LR; A-->B', loadSettings({}));
    assert(result.svg.includes('mermaid-beauty-diagram'), 'Queue did not recover');
    assert(document.querySelectorAll('.mermaid-beauty-measure').length === 0, 'Measurement host leaked');
  });
  await test('Labels cannot introduce executable markup', async () => {
    const result = await renderer.render(`sanitized-${++serial}`, 'flowchart LR\nA["<img src=x onerror=alert(1)>"]', loadSettings({}));
    const svg = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
    assert(!svg.querySelector('script, [onerror], [onload]'), 'Executable markup survived');
  });
  await test('Fit-width diagrams stay inside a 360px container', async () => {
    document.body.classList.add('compact');
    for (const card of output.querySelectorAll('.card[data-passed="true"]')) {
      const diagram = card.querySelector<HTMLElement>('.mermaid')!;
      const svg = diagram.querySelector('svg')!;
      assert(svg.getBoundingClientRect().width <= diagram.clientWidth + 2, `${card.querySelector('h2')?.textContent} overflows`);
    }
    document.body.classList.remove('compact');
  });
  await test('Unscaled diagrams retain their natural width and scroll', async () => {
    const container = document.createElement('div'); container.className = 'mermaid preview-narrow'; output.append(container);
    const result = await renderer.render(`natural-${++serial}`, fixtures[0]!.source, loadSettings({ defaults: { fitWidth: false } }), container);
    const svg = mount(container, result.svg);
    assert(svg.getBoundingClientRect().width > 320 && container.scrollWidth > container.clientWidth, 'Natural width was shrunk');
    container.remove();
  });
  await test('Scroll containers preserve bindings and reset on native rendering, fallback, and unload', async () => {
    const container = document.createElement('div');
    container.className = 'mermaid preview-narrow preview-scroll-check'; output.append(container);
    let settings = loadSettings({ defaults: { fitWidth: false } });
    let nativeBindings = 0;
    let enhancedBindings = 0;
    let fallback = false;
    const host: MermaidHost = { render: async () => ({ svg: '<svg xmlns="http://www.w3.org/2000/svg"/>', diagramType: 'flowchart',
      bindFunctions: () => { nativeBindings++; } }) };
    const detach = attachRenderer(host, () => settings, async (id, source, parent) => {
      const result = await renderer.render(id, source, settings, parent);
      return { ...result, bindFunctions: element => { enhancedBindings++; result.bindFunctions?.(element); } };
    }, () => { fallback = true; });
    const draw = async (source = fixtures[0]!.source) => {
      const result = await host.render(`scroll-${++serial}`, source, container);
      container.replaceChildren(); mount(container, result.svg); result.bindFunctions?.(container);
      return result;
    };
    try {
      await draw();
      assert(enhancedBindings === 1, 'Original enhanced bindings were lost');
      assert(getComputedStyle(container).overflowX === 'auto' && container.scrollWidth > container.clientWidth,
        'Enhanced diagrams lost horizontal scrolling');
      settings = loadSettings({ enabled: false }); await draw();
      assert(nativeBindings === 1 && !container.classList.contains('mermaid-beauty-container') &&
        getComputedStyle(container).overflowX === 'visible', 'Native diagrams retained plugin scrolling');
      settings = loadSettings({ defaults: { fitWidth: false } }); await draw();
      await draw('flowchart LR\nA[');
      assert(fallback && !container.classList.contains('mermaid-beauty-container'), 'Fallback retained plugin scrolling');
      const pendingBinding = await draw(); detach();
      assert(!container.classList.contains('mermaid-beauty-container'), 'Unload left a container class');
      pendingBinding.bindFunctions?.(container);
      assert(!container.classList.contains('mermaid-beauty-container'), 'A late binding reactivated styling after unload');
    } finally { detach(); container.remove(); }
  });
  await checkZoom(renderer, output, test);
  await test('Semantic shapes and explicit node styles survive', async () => {
    const card = Array.from(output.querySelectorAll('.card')).find(card => card.querySelector('h2')?.textContent === 'Shapes and styles / light')!;
    assert(card.querySelector('.node polygon, .node path'), 'Decision or database shape lost');
    const warning = card.querySelector('.node.warning polygon, .node.warning path')!;
    assert(warning && getComputedStyle(warning).fill === 'rgb(255, 224, 224)', 'Explicit class style lost');
  });
  await test('ZenUML theme remains isolated between rendered diagrams', async () => {
    const light = Array.from(output.querySelectorAll('.card')).find(card => card.querySelector('h2')?.textContent === 'ZenUML / light')!;
    assert(getComputedStyle(light.querySelector('.participant-box')!).fill === 'rgb(221, 243, 231)', 'A later diagram changed the earlier palette');
  });
  await test('Flowchart cards fit content and labels reserve capsule space', async () => {
    const card = Array.from(output.querySelectorAll('.card')).find(card => card.querySelector('h2')?.textContent === 'Flowchart / light')!;
    const nodes = Array.from(card.querySelectorAll<SVGGElement>('.node'));
    const publisher = nodes.find(node => node.textContent === '发布端')!.getBBox();
    const control = nodes.find(node => node.textContent === 'control service')!.getBBox();
    const database = nodes.find(node => node.textContent === '数据库')!.getBBox();
    assert(publisher.width < control.width && database.width < publisher.width, 'Short labels were stretched to uniform width');
    assert(publisher.height >= 60, 'Cards lost vertical breathing room');
    for (const label of card.querySelectorAll<SVGGElement>('.edgeLabel')) {
      const rect = label.querySelector<SVGRectElement>('rect[data-beauty-measured]');
      const text = label.querySelector<SVGTextElement>('text');
      if (!text?.textContent) continue;
      assert(rect, 'Label padding was not measured before layout');
      assert(rect.getBBox().width >= text.getBBox().width + 20, 'Label padding missing');
    }
    const long = Array.from(card.querySelectorAll('.edgeLabel')).find(label => label.textContent?.includes('登记节点'))!;
    assert(long.querySelectorAll('.text-outer-tspan').length === 1, 'Medium-length label wraps unnecessarily');
    assert(card.querySelector('path.flowchart-link[d*="Q"]'), 'Rounded routes missing');
    const arrow = card.querySelector<SVGPathElement>('marker[id$="-pointEnd"] path')!;
    assert(getComputedStyle(arrow).fill === 'none', 'Open arrow style missing');
  });
  await test('Flowchart line breaks, emphasis, nested groups and loops survive', async () => {
    const source = 'flowchart TB\nsubgraph Group[Group]\nA[Start] -->|"first<br/>second"| B{"Choice?"}\nB -->|"`**Try** again`"| A\nend\nB --> D[(Records)]\nD --> D';
    const container = document.createElement('div'); output.append(container);
    try {
      const result = await renderer.render(`flow-semantics-${++serial}`, source, loadSettings({}), container);
      const svg = mount(container, result.svg);
      assert(svg.querySelectorAll('.cluster').length === 1, 'Group lost');
      assert(svg.querySelectorAll('path.flowchart-link').length === 4, 'Cycle or self-loop lost');
      assert(svg.querySelectorAll('.edgeLabel .text-outer-tspan').length >= 3, 'Explicit line break lost');
      assert(svg.querySelector('.edgeLabel tspan[font-weight="bold"]'), 'Markdown emphasis lost');
      assert(svg.querySelectorAll('.node polygon, .node path').length >= 2, 'Decision or database shape lost');
    } finally { container.remove(); }
  });
  renderer.dispose();
  await test('Disposed renderer rejects new work', async () => {
    let rejected = false;
    try { await renderer.render('disposed', 'flowchart LR; A-->B', loadSettings({})); } catch { rejected = true; }
    assert(rejected, 'Disposed renderer accepted work');
  });
  const failed = [...results, ...checks].filter(result => !result.passed);
  status.textContent = `${results.length - results.filter(r => !r.passed).length}/${results.length} renders passed; ${checks.filter(r => r.passed).length}/${checks.length} behavior checks passed.`;
  const report = document.createElement('pre');
  report.id = 'report';
  const examples = Array.from(output.querySelectorAll('.card')).filter(card => ['Flowchart / light', 'Sequence / light', 'Mind map / dark'].includes(card.querySelector('h2')?.textContent ?? '')).map(card => ({ name: card.querySelector('h2')!.textContent, svg: card.querySelector('svg')?.outerHTML ?? '' }));
  report.textContent = JSON.stringify({ buildHash: BUILD_HASH, results, checks, failed }, null, 2);
  output.append(report);
  const response = await fetch('/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ buildHash: BUILD_HASH, results, checks, failed, examples }) });
  if (!response.ok) throw new Error('Could not save the browser report.');
  run.disabled = false; exportButton.disabled = false;
}
