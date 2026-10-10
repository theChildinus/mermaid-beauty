import type { BeautyRenderer } from '../../src/renderer';
import { contrastRatio } from '../../src/colors';
import { loadSettings, MULTICOLOR_PALETTES, type BeautySettings } from '../../src/settings';
import { fixtures } from './fixtures';
import { flowchartSourceId } from '../../src/flowchart-colors';

type Check = (name: string, action: () => Promise<void>) => Promise<void>;
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function hex(rgb: string): string {
  const channels = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(rgb);
  assert(channels, `Expected opaque RGB: ${rgb}`);
  return '#' + channels.slice(1).map(channel => Number(channel).toString(16).padStart(2, '0')).join('');
}
function readable(label: Element, shape: Element): void {
  const text = hex(getComputedStyle(label).fill), style = getComputedStyle(shape);
  const fill = hex(style.fill), background = hex(getComputedStyle(shape.closest('svg')!).backgroundColor);
  const opacity = Number(style.opacity) * Number(style.fillOpacity);
  const composed = '#' + [1, 3, 5].map(offset => Math.round(parseInt(fill.slice(offset, offset + 2), 16) * opacity +
    parseInt(background.slice(offset, offset + 2), 16) * (1 - opacity)).toString(16).padStart(2, '0')).join('');
  assert(contrastRatio(text, composed) >= 4.5, `Unreadable ${label.textContent}: ${text} on ${composed}`);
}

const sequence = `sequenceDiagram
  participant Reader as Reader
  participant Library as Library
  participant Archive as Archive
  Reader->>Library: Borrow a book
  activate Library
  Note right of Library: Check availability
  Library->>Archive: Find book
  Archive-->>Library: Available
  Library-->>Reader: Ready
  deactivate Library`;
const flowchart = `flowchart LR
  subgraph Order
    A[Choose a book] --> B{Available?}
  end
  subgraph Delivery
    C[Borrow] --> D[Read]
  end
  B -->|Yes| C
  B -->|No| E[Reserve]`;

/** Exercise the real engine, including dark-mode palette derivation and source overrides. */
export async function checkColorStyles(renderer: BeautyRenderer, output: Element, test: Check): Promise<void> {
  let serial = 0;
  const render = async (container: Element, source: string, settings: BeautySettings): Promise<SVGSVGElement> => {
    const result = await renderer.render(`colors-${++serial}`, source, settings);
    const svg = document.importNode(new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement, true) as unknown as SVGSVGElement;
    container.replaceChildren(svg);
    assert(svg.viewBox.baseVal.width > 0 && svg.viewBox.baseVal.height > 0, 'Invalid SVG bounds');
    assert(!svg.textContent?.includes('Syntax error in text'), 'Error diagram rendered');
    return svg;
  };
  const container = document.createElement('div'); container.className = 'mermaid'; output.append(container);
  try {
    for (const dark of [false, true]) {
      document.body.classList.toggle('theme-dark', dark);
      for (const layout of ['auto', 'dagre'] as const) {
        await test(`Multicolor structural groups ${layout} / ${dark ? 'dark' : 'light'}`, async () => {
          const settings = loadSettings({ defaults: { colorStyle: 'multi', layout } });
          const source = `flowchart TB
            A[Request] --> B[Check]
            B --> C{Dispatch}
            C -->|Prepare locally| D[Prepare]
            D --> E[Complete]
            C -->|Schedule| F[Schedule]
            X[Template] --> F
            F --> G[Run]
            G --> H[Archive]
            G --> I[Collect]
            I --> J[Result]
            C -.->|Reference| G`;
          const colors = (svg: SVGSVGElement): Map<string, string> => new Map([...svg.querySelectorAll('.node')].map(node =>
            [flowchartSourceId(node.id, svg.id), getComputedStyle(node.querySelector('.label-container')!).fill]));
          const svg = await render(container, source, settings), before = colors(svg);
          assert(before.size === 11 && svg.querySelectorAll('.flowchart-link').length === 11, 'Node or edge semantics changed');
          assert(new Set(before.values()).size === 3, 'Expected three quiet groups');
          for (const group of [['A', 'B', 'C'], ['D', 'E'], ['X', 'F', 'G', 'H', 'I', 'J']]) {
            assert(new Set(group.map(id => before.get(id))).size === 1, `Broken chain: ${group.join(', ')}`);
          }
          for (const rect of svg.querySelectorAll('.edgeLabel rect')) assert(getComputedStyle(rect).stroke === 'none', 'Label capsule still outlined');
          const label = svg.querySelector('.edgeLabel text');
          assert(label && getComputedStyle(label).fontWeight === '400', 'Edge label competes with nodes');
          const reordered = colors(await render(container, source.split('\n').slice(0, 1).concat(source.split('\n').slice(1).reverse()).join('\n'), settings));
          for (const [id, fill] of before) assert(reordered.get(id) === fill, `Declaration order changed ${id}`);
          const inserted = colors(await render(container, source.replace('A[Request] --> B[Check]', 'A[Renamed] --> New[Extra step]\nNew --> B[Check]'), settings));
          for (const [id, fill] of before) assert(inserted.get(id) === fill, `Chain insertion changed ${id}`);
          for (const links of ['A-->B\nA-->C\nB-->D\nC-->D', 'A-->B\nB-->C\nC-->A', 'A<-->B\nB-->C\nA-->D\nD-->E']) {
            assert(new Set(colors(await render(container, `flowchart LR\n${links}`, settings)).values()).size === 1, 'Join or cycle fragmented');
          }
          const nestedSvg = await render(container, `flowchart TB
            subgraph Outer
              A[One] --> B[Two]
              subgraph Inner
                C[Three] --> D[Four]
              end
              B --> C
            end`, settings);
          const nested = colors(nestedSvg);
          assert(nested.get('A') === nested.get('B') && nested.get('C') === nested.get('D') && nested.get('A') !== nested.get('C'), 'Nested group membership lost');
          for (const [group, member] of [['Outer', 'A'], ['Inner', 'C']]) {
            const cluster = [...nestedSvg.querySelectorAll('.cluster')].find(node => flowchartSourceId(node.id, nestedSvg.id) === group)!;
            assert(getComputedStyle(cluster.querySelector('rect')!).fill === nested.get(member!), 'Container and members have different colors');
          }
          if (layout === 'auto') {
            const card = document.createElement('article'); card.className = `card ${dark ? 'dark' : 'light'}-card`;
            const title = document.createElement('h2'); title.textContent = `Coordinated colors / structural groups / ${dark ? 'dark' : 'light'}`; card.append(title);
            const diagram = document.createElement('div'); diagram.className = 'mermaid'; card.append(diagram); output.append(card);
            await render(diagram, source, settings);
          }
        });
        await test(`Multicolor stable source node colors ${layout} / ${dark ? 'dark' : 'light'}`, async () => {
          const settings = loadSettings({ defaults: { colorStyle: 'multi', layout } });
          const colors = (svg: SVGSVGElement): Record<string, string> => Object.fromEntries(
            [...svg.querySelectorAll('.node')].map(node => [node.textContent.trim(), getComputedStyle(node.querySelector('.label-container')!).fill]),
          );
          const before = colors(await render(container, 'flowchart LR\nA[Read] --> B[Process]\nB --> C[Finish]', settings));
          const after = colors(await render(container, 'flowchart LR\nX[Start] --> C[Finish]\nC --> B[Process]\nB --> A[Read]', settings));
          for (const label of ['Read', 'Process', 'Finish']) assert(before[label] === after[label], `Node ${label} changed color`);
          const renamed = colors(await render(container, 'flowchart LR\nA[Updated label] --> B[Process]\nB --> C[Finish]', settings));
          assert(before.Read === renamed['Updated label'], 'Changing label text changed the node color');
          const authored = await render(container, 'flowchart LR\nA[Read] --> B[Process]\nstyle A fill:#ffeeaa,stroke:#aa5500', settings);
          const shape = [...authored.querySelectorAll('.node')].find(node => node.textContent === 'Read')!.querySelector('.label-container')!;
          assert(getComputedStyle(shape).fill === 'rgb(255, 238, 170)' && getComputedStyle(shape).stroke === 'rgb(170, 85, 0)', 'Source styles lost');
        });
      }
      for (const fixture of fixtures) {
        await test(`Multicolor ${fixture.name} / ${dark ? 'dark' : 'light'}`, async () => {
          const svg = await render(container, fixture.source, loadSettings(null));
          assert(svg.querySelectorAll('text, foreignObject').length > 0, 'Missing diagram labels');
        });
      }
      for (const multiPalette of Object.keys(MULTICOLOR_PALETTES)) for (const type of ['flowchart', 'sequence', 'class', 'kanban'] as const) {
        await test(`Multicolor ${multiPalette} ${type} ${dark ? 'dark' : 'light'} separation and contrast`, async () => {
          const source = type === 'sequence' ? sequence : type === 'flowchart' ? flowchart : fixtures.find(item => item.type === type)!.source;
          const settings = loadSettings({ defaults: { colorStyle: 'multi', multiPalette } });
          const svg = await render(container, source, settings);
          const selector = type === 'sequence' ? 'rect.actor-top' : type === 'kanban' ? '.sections .cluster > rect'
            : type === 'class' ? '.node > .outer-path > path:first-child' : '.node > .label-container';
          const shapes = [...svg.querySelectorAll(selector)];
          assert(shapes.length >= 2, `Missing ${type} shapes`);
          const fills = shapes.map(shape => getComputedStyle(shape).fill);
          assert(new Set(fills).size >= 2, `${type} collapsed to one fill: ${fills.join(', ')}`);
          for (const shape of shapes) {
            const labels = type === 'sequence' ? shape.parentElement!.querySelectorAll('text.actor > tspan')
              : (shape.closest('.node') ?? shape.parentElement!).querySelectorAll('text tspan');
            assert(labels.length > 0, 'Missing visible text contrast coverage');
            for (const label of labels) readable(label, shape);
            assert(contrastRatio(hex(getComputedStyle(shape).stroke), hex(getComputedStyle(shape).fill)) >= 3, 'Indistinct component border');
          }
          if (type === 'sequence') {
            const note = svg.querySelector('.note')!, activation = svg.querySelector('[class^="activation"]')!;
            assert(note && activation, 'Missing note/activation fixture');
            assert(new Set([fills[0], getComputedStyle(note).fill, getComputedStyle(activation).fill]).size === 3, 'Component roles lost their colors');
            readable(svg.querySelector('text.noteText > tspan')!, note);
            const bottom = [...svg.querySelectorAll('rect.actor-bottom')].map(shape => getComputedStyle(shape).fill);
            assert(JSON.stringify(bottom) === JSON.stringify(fills), 'Participant colors changed at the footer');
          }
          for (const width of [1000, 360]) {
            container.style.width = `${width}px`;
            assert(svg.getBoundingClientRect().width <= width + 1, `${type} does not fit ${width}px`);
          }
          const firstFills = JSON.stringify(fills);
          await render(container, source, loadSettings({ defaults: { colorStyle: 'single', multiPalette } }));
          const again = await render(container, source, settings);
          assert(JSON.stringify([...again.querySelectorAll(selector)].map(shape => getComputedStyle(shape).fill)) === firstFills, 'Color allocation changed after switching modes');
          // Keep a small set of real-engine samples for visual review at both sizes.
          if (multiPalette === 'clear' || type === 'flowchart') {
            const card = document.createElement('article'); card.className = `card ${dark ? 'dark-card' : 'light-card'}`;
            const heading = document.createElement('h2'); heading.textContent = `Coordinated colors / ${multiPalette} / ${type} / ${dark ? 'dark' : 'light'}`;
            const diagram = document.createElement('div'); diagram.className = 'mermaid'; diagram.append(again);
            card.append(heading, diagram); output.append(card);
          }
        });
      }
      for (const multiPalette of Object.keys(MULTICOLOR_PALETTES)) {
        await test(`Multicolor ${multiPalette} text, connectors and plot labels / ${dark ? 'dark' : 'light'}`, async () => {
          const settings = loadSettings({ defaults: { colorStyle: 'multi', multiPalette } });
          const svg = await render(container, flowchart, settings);
          const background = hex(getComputedStyle(svg).backgroundColor);
          for (const path of svg.querySelectorAll('.flowchart-link')) {
            assert(contrastRatio(hex(getComputedStyle(path).stroke), background) >= 4.5, 'Connector too faint');
          }
          for (const node of svg.querySelectorAll('.node')) {
            const shape = node.querySelector('.label-container')!, label = node.querySelector('text')!;
            assert(contrastRatio(hex(getComputedStyle(label).fill), hex(getComputedStyle(shape).fill)) >= 7, 'Component text too faint');
          }
          const pie = await render(container, 'pie\n' + Array.from({ length: 12 }, (_, i) => `"Series ${i}" : 10`).join('\n'), settings);
          const shapes = pie.querySelectorAll('.pieCircle');
          assert(shapes.length === 12, 'Full series coverage missing');
          pie.querySelectorAll('text.slice').forEach((label, index) => readable(label, shapes.item(index)));
        });
      }
      await test(`Multicolor explicit colors / ${dark ? 'dark' : 'light'}`, async () => {
        const settings = loadSettings(null);
        const flow = await render(container, `flowchart LR\nA[Read]:::authored --> B[Process]\nclassDef authored fill:#ffccdd,stroke:#aa2255,color:#331122`, settings);
        const node = flow.querySelector('.node.authored')!;
        assert(getComputedStyle(node.querySelector('rect')!).fill === 'rgb(255, 204, 221)', 'classDef fill was overwritten');
        assert(getComputedStyle(node.querySelector('text')!).fill === 'rgb(51, 17, 34)', 'classDef text was overwritten');
        const styled = await render(container, 'flowchart LR\nA[Read] --> B[Process]\nstyle A fill:#ffccdd,stroke:#aa2255,color:#331122', settings);
        assert(getComputedStyle(styled.querySelector('.node rect')!).fill === 'rgb(255, 204, 221)', 'style fill was overwritten');
        for (const [source, key, selector] of [[flowchart, 'primaryColor', '.node rect'], [sequence, 'actorBkg', 'rect.actor-top']] as const) {
          const svg = await render(container, `---\nconfig:\n  themeVariables:\n    ${key}: '#ffeeaa'\n---\n${source}`, settings);
          for (const shape of svg.querySelectorAll(selector)) assert(getComputedStyle(shape).fill === 'rgb(255, 238, 170)', `${key} was overwritten`);
        }
        const groups = await render(container, `---\nconfig:\n  themeVariables:\n    clusterBkg: '#ffeeaa'\n    clusterBorder: '#aa5500'\n---\n${flowchart}`, settings);
        for (const shape of groups.querySelectorAll('.cluster > rect')) {
          assert(getComputedStyle(shape).fill === 'rgb(255, 238, 170)', 'Source group fill was overwritten');
          assert(getComputedStyle(shape).stroke === 'rgb(170, 85, 0)', 'Source group border was overwritten');
        }
        const kanban = fixtures.find(item => item.type === 'kanban')!.source;
        const board = await render(container, `---\nconfig:\n  themeVariables:\n    clusterBkg: '#ffeeaa'\n    primaryColor: '#ccddee'\n---\n${kanban}`, settings);
        for (const shape of board.querySelectorAll('.cluster > rect')) assert(getComputedStyle(shape).fill === 'rgb(255, 238, 170)', 'Source column fill was overwritten');
        for (const shape of board.querySelectorAll('.node > rect')) assert(getComputedStyle(shape).fill === 'rgb(204, 221, 238)', 'Source card fill was overwritten');
      });
      await test(`Multicolor custom controls and named themes / ${dark ? 'dark' : 'light'}`, async () => {
        const mode = dark ? 'dark' : 'light';
        const settings = loadSettings({ defaults: { colorStyle: 'multi', colors: {
          [mode]: { surface: '#ddeeff', label: '#ffeecc', border: '#556677', text: '#112233' },
        } } });
        // Label background rects intentionally have no stroke; check semantic node outlines.
        for (const [source, selector] of [[flowchart, '.node > .label-container'], [sequence, 'rect.actor-top']] as const) {
          const svg = await render(container, source, settings);
          for (const shape of svg.querySelectorAll(selector)) {
            assert(getComputedStyle(shape).fill === 'rgb(221, 238, 255)', 'Custom node fill lost');
            assert(getComputedStyle(shape).stroke === 'rgb(85, 102, 119)', `Custom border lost: ${source.split('\n')[0]} ${shape.getAttribute('class')} ${getComputedStyle(shape).stroke}`);
          }
        }
        const kanban = fixtures.find(item => item.type === 'kanban')!.source;
        const board = await render(container, kanban, settings);
        for (const shape of board.querySelectorAll('.cluster > rect')) {
          assert(getComputedStyle(shape).fill === 'rgb(255, 238, 204)', 'Custom column fill lost');
          assert(getComputedStyle(shape).stroke === 'rgb(85, 102, 119)', 'Custom column border lost');
        }
        const sections = await render(container, `---\nconfig:\n  themeVariables:\n    cScale2: '#000000'\n    cScaleLabel2: '#ffff00'\n---\n${kanban}`, loadSettings(null));
        assert(getComputedStyle(sections.querySelector('.section-1 > rect')!).fill === (dark ? 'rgb(0, 0, 0)' : 'rgb(26, 26, 26)'), 'Explicit series color lost');
        assert(getComputedStyle(sections.querySelector('.section-1 text')!).fill === 'rgb(255, 255, 0)', 'Explicit series label lost');
        for (const section of sections.querySelectorAll('.cluster:not(.section-1)')) readable(section.querySelector('text tspan')!, section.querySelector('rect')!);
        for (const config of ['theme: forest', 'flowchart:\n    theme: forest']) {
          const svg = await render(container, `---\nconfig:\n  ${config}\n---\nflowchart LR\nA[Read] --> B[Process]`, loadSettings(null));
          assert(new Set([...svg.querySelectorAll('.node rect')].map(shape => getComputedStyle(shape).fill)).size === 1, 'Auto colors replaced an explicit theme');
        }
      });
    }
  } finally { document.body.classList.remove('theme-dark'); container.remove(); }
}
