import { BeautyRenderer } from '../../src/renderer';
import { contrastRatio } from '../../src/colors';
import { loadSettings, PALETTES, type BeautySettings, type PaletteName } from '../../src/settings';

type Check = (name: string, action: () => Promise<void>) => Promise<void>;
const sequence = 'sequenceDiagram\nautonumber 19\nparticipant A as Client\nparticipant B as Server\nA->>B: Request\nB-->>A: Response\nA->>A: Check\nA->>B: Continue';
const gantt = `gantt
  dateFormat YYYY-MM-DD
  axisFormat %m-%d
  section Work
  Done :done, completed, 2026-01-01, 3d
  Active :active, current, 2026-01-04, 4d
  Critical :crit, urgent, 2026-01-08, 3d
  A long outside label :active, outside, 2026-01-11, 1h`;
const pie = `pie title Shares
  "A" : 25
  "B" : 25
  "C" : 25
  "D" : 25`;
const git = 'gitGraph\ncommit\nbranch feature\ncommit\ncheckout main\nmerge feature';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function channels(value: string): number[] {
  const values = value.match(/[\d.]+/g)?.map(Number);
  assert(values?.length === 3, `Expected an opaque computed RGB color: ${value}`);
  return values;
}
function hex(values: number[]): string {
  return '#' + values.map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
}
function readable(svg: SVGSVGElement, label: Element, shape: Element | null, description: string): void {
  const canvas = channels(getComputedStyle(svg).backgroundColor);
  const style = shape ? getComputedStyle(shape) : undefined;
  const fill = style ? channels(style.fill) : canvas;
  const opacity = style ? Number(style.opacity) * Number(style.fillOpacity) : 1;
  const background = hex(fill.map((value, i) => value * opacity + canvas[i]! * (1 - opacity)));
  const foreground = hex(channels(getComputedStyle(label).fill));
  const contrast = contrastRatio(foreground, background);
  assert(contrast >= 4.5, `${description}: ${foreground} on ${background} is ${contrast.toFixed(2)}:1`);
}

export async function checkPaletteContrast(renderer: BeautyRenderer, output: Element, test: Check): Promise<void> {
  let serial = 0;
  const render = async (parent: Element, source: string, settings: BeautySettings): Promise<SVGSVGElement> => {
    const result = await renderer.render(`contrast-${++serial}`, source, settings);
    const parsed = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
    const svg = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
    parent.appendChild(svg);
    return svg;
  };
  for (const palette of Object.keys(PALETTES) as PaletteName[]) for (const dark of [false, true]) {
    await test(`${palette} ${dark ? 'dark' : 'light'} filled labels and palette contrast`, async () => {
      document.body.classList.toggle('theme-dark', dark);
      const card = document.createElement('article'); card.className = `palette-card ${dark ? 'dark-card' : 'light-card'}`;
      const title = document.createElement('h3'); title.textContent = `${PALETTES[palette]} / ${dark ? 'dark' : 'light'}`;
      card.append(title); output.append(card);
      const settings = loadSettings({ defaults: { palette } });
      const flow = await render(card, 'flowchart LR\nA[Read] -->|Next| B[Process]\nB --> C[Done]', settings);
      for (const node of flow.querySelectorAll('.node')) readable(flow, node.querySelector('text')!, node.querySelector('rect'), 'Node text');
      const svg = await render(card, sequence, settings);
      const circle = svg.querySelector('marker[id$="-sequencenumber"] circle');
      const numbers = svg.querySelectorAll('.sequenceNumber');
      assert(circle && numbers.length === 4 && numbers[3]!.textContent === '22', 'Missing autonumber fixture');
      for (const number of numbers) {
        readable(svg, number, circle, 'Sequence number');
        assert(Number(getComputedStyle(number).fontWeight) >= 600, 'Sequence number weight lost');
      }
      const zoom = document.createElement('div'); zoom.className = 'mermaid-zoom-modal-wrapper'; card.append(zoom);
      const clone = svg.cloneNode(true) as SVGSVGElement; zoom.append(clone);
      try {
        for (const number of clone.querySelectorAll('.sequenceNumber')) readable(clone, number, clone.querySelector('marker[id$="-sequencenumber"] circle'), 'Zoom number');
      } finally { zoom.remove(); }
      const timeline = await render(card, gantt, settings);
      const tasks = timeline.querySelectorAll('text.taskText');
      assert(tasks.length >= 3, 'In-bar task label coverage missing');
      for (const label of tasks) readable(timeline, label, timeline.querySelector(`#${CSS.escape(label.id.replace(/-text$/, ''))}`), 'Task text');
      const outside = timeline.querySelector('text.taskTextOutsideRight, text.taskTextOutsideLeft');
      assert(outside, 'Outside task label coverage missing'); readable(timeline, outside, null, 'Outside task text');
      const slices = await render(card, pie, settings);
      const shapes = slices.querySelectorAll('.pieCircle');
      assert(shapes.length === 4, 'Accent slice coverage missing');
      slices.querySelectorAll('text.slice').forEach((label, index) => readable(slices, label, shapes.item(index), 'Pie label'));
      const branches = await render(card, git, settings);
      const backgrounds = branches.querySelectorAll('.branchLabelBkg');
      assert(backgrounds.length === 2, 'Branch label coverage missing');
      for (const shape of backgrounds) {
        const index = /\blabel(\d+)\b/.exec(shape.getAttribute('class') ?? '')![1]!;
        readable(branches, shape.parentElement!.querySelector(`.branch-label${index} text`)!, shape, 'Branch label');
      }
    });
  }
  document.body.classList.remove('theme-dark');
  await test('Derived pie colors, opacity and repeated Git branch colors stay readable', async () => {
    const parent = document.createElement('div'); output.append(parent);
    try {
      for (const dark of [false, true]) {
        document.body.classList.toggle('theme-dark', dark);
        for (const opacity of [0.4, 0.7, 1]) {
          parent.replaceChildren();
          const source = 'pie\n' + Array.from({ length: 12 }, (_, i) => `"Section ${i}" : 10`).join('\n');
          const svg = await render(parent, source, loadSettings({ types: { pie: { mode: 'beauty', config: JSON.stringify({ themeVariables: { pieOpacity: opacity } }) } } }));
          const shapes = svg.querySelectorAll('.pieCircle');
          assert(shapes.length === 12, 'Derived pie color coverage missing');
          svg.querySelectorAll('text.slice').forEach((label, index) => readable(svg, label, shapes.item(index), 'Derived slice label'));
        }
        parent.replaceChildren();
        const source = 'gitGraph\ncommit\n' + Array.from({ length: 10 }, (_, i) => `branch branch${i}\ncommit`).join('\n');
        const svg = await render(parent, source, loadSettings({}));
        const labels = svg.querySelectorAll('.branchLabel text');
        assert(labels.length === 11, 'Repeated branch color coverage missing');
        for (const label of labels) readable(svg, label, label.closest('.branchLabel')!.previousElementSibling, 'Repeated branch label');
      }
    } finally { document.body.classList.remove('theme-dark'); parent.remove(); }
  });
  await test('Filled labels honor source and per-type text colors and source backgrounds', async () => {
    const parent = document.createElement('div'); output.append(parent);
    try {
      const explicit = { sequenceNumberColor: '#ff00ff', pieSectionTextColor: '#ff00ff', taskTextDarkColor: '#ff00ff', gitBranchLabel0: '#ff00ff' };
      const samples = [[sequence, '.sequenceNumber', 'sequence'], [pie, 'text.slice', 'pie'], [gantt, '.activeText0.taskText', 'gantt'], [git, '.branch-label0 text', 'git']] as const;
      for (const [source, selector, type] of samples) for (const inSource of [false, true]) {
        parent.replaceChildren();
        const settings = loadSettings({ types: { [type]: { mode: 'beauty', config: inSource ? '' : JSON.stringify({ themeVariables: explicit }) } } });
        const directive = inSource ? `%%{init: ${JSON.stringify({ themeVariables: explicit })}}%%\n` : '';
        const svg = await render(parent, directive + source, settings);
        assert(getComputedStyle(svg.querySelector(selector)!).fill === 'rgb(255, 0, 255)', `${type} explicit text color was changed`);
      }
      for (const signalColor of ['#222222', '#eeeeee', 'navy']) {
        parent.replaceChildren();
        const svg = await render(parent, `---\nconfig:\n  themeVariables:\n    signalColor: '${signalColor}'\n---\n${sequence}`, loadSettings({}));
        readable(svg, svg.querySelector('.sequenceNumber')!, svg.querySelector('marker[id$="-sequencenumber"] circle'), 'Source badge background');
      }
      parent.replaceChildren();
      const branches = await render(parent, git, loadSettings({ types: { git: { mode: 'beauty', config: '{"themeVariables":{"branchLabelColor":"#ff00ff"}}' } } }));
      for (const label of branches.querySelectorAll('.branchLabel text')) assert(getComputedStyle(label).fill === 'rgb(255, 0, 255)', 'Common branch label color was changed');
      parent.replaceChildren();
      const donut = await render(parent, pie, loadSettings({ types: { pie: { mode: 'beauty', config: '{"pie":{"donutHole":0.8,"textPosition":0.5}}' } } }));
      for (const label of donut.querySelectorAll('text.slice')) readable(donut, label, null, 'Label inside donut hole');
    } finally { parent.remove(); }
  });
}
