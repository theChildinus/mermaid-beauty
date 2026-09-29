import type { BeautyRenderer } from '../../src/renderer';
import { paletteColors } from '../../src/colors';
import { loadSettings, PALETTES, type PaletteName } from '../../src/settings';

const source = `kanban
  backlog[待处理任务与相关文档]
    docs["检查字体、换行与较长文字是否位于卡片内部"]
    preview[Build preview]@{ ticket: DOC-128, assigned: Reader, priority: High }
    long[Review changes]@{ ticket: "DOC-2026-1234567890", assigned: "Another team member", priority: Low }
  progress[In progress]
    check[Write docs]
  done[Done]
    theme[Define theme]
  empty[Empty]`;
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
const rgb = (hex: string): string => `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
function inside(inner: DOMRect, outer: DOMRect, padding: number, message: string): void {
  assert(inner.left >= outer.left + padding - 0.5 && inner.right <= outer.right - padding + 0.5 &&
    inner.top >= outer.top + padding - 0.5 && inner.bottom <= outer.bottom - padding + 0.5, message);
}
export async function checkKanban(renderer: BeautyRenderer, output: Element,
  test: (name: string, action: () => Promise<void>) => Promise<void>): Promise<void> {
  let serial = 0;
  for (const palette of Object.keys(PALETTES) as PaletteName[]) for (const dark of [false, true]) {
    await test(`Kanban ${palette} ${dark ? 'dark' : 'light'} outlines and label bounds`, async () => {
      document.body.classList.toggle('theme-dark', dark);
      const card = document.createElement('article'); card.className = `card ${dark ? 'dark-card' : 'light-card'}`;
      const title = document.createElement('h2'); title.textContent = `Kanban layout / ${palette} / ${dark ? 'dark' : 'light'}`;
      card.append(title); output.append(card);
      const container = document.createElement('div'); container.className = 'mermaid'; card.append(container);
      for (const fontSize of [15, 28]) {
        const settings = loadSettings({ defaults: { palette, fontSize }, types: { kanban: { mode: 'beauty', config: JSON.stringify({ kanban: { sectionWidth: fontSize === 28 ? 260 : 200, ticketBaseUrl: 'https://example.invalid/#TICKET#' } }) } } });
        const result = await renderer.render(`kanban-check-${++serial}`, source, settings, container);
        const svg = document.importNode(new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement, true) as unknown as SVGSVGElement;
        container.replaceChildren(svg);
        const c = paletteColors(settings.defaults, dark);
        for (const width of [1000, 360]) {
          container.style.width = `${width}px`;
          const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
          const sections = [...svg.querySelectorAll('.sections .cluster')];
          assert(sections.length === 4, 'Lost a column, including the empty column');
          const heights: number[] = [];
          for (const section of sections) {
            const rect = section.querySelector('rect')!, label = section.querySelector('.cluster-label')!;
            assert(getComputedStyle(rect).fill === rgb(c.label), 'Column fill bypasses the palette');
            assert(getComputedStyle(rect).stroke === rgb(c.border), 'Column outline missing');
            inside(label.getBoundingClientRect(), rect.getBoundingClientRect(), 10 * scale, 'Header touches or exceeds column border');
            heights.push(rect.getBoundingClientRect().height);
          }
          assert(Math.max(...heights) - Math.min(...heights) < 0.5, 'Columns have inconsistent heights');
          const items = [...svg.querySelectorAll('.items .node')];
          assert(items.length === 5, 'Card count changed');
          for (const item of items) {
            const rect = item.querySelector('rect')!, bounds = rect.getBoundingClientRect();
            assert(getComputedStyle(rect).fill === rgb(c.surface), 'Card fill bypasses the palette');
            assert(getComputedStyle(rect).stroke === rgb(c.border), 'Card outline missing');
            assert(parseFloat(getComputedStyle(rect).rx) <= 8, 'Card became a capsule');
            const labels = [...item.querySelectorAll('g.label')].filter(label => label.textContent?.trim());
            for (const label of labels) inside(label.getBoundingClientRect(), bounds, 8 * scale, `Card text clips: ${label.textContent}`);
            for (let a = 0; a < labels.length; a++) for (let b = a + 1; b < labels.length; b++) {
              const first = labels[a]!.getBoundingClientRect(), second = labels[b]!.getBoundingClientRect();
              assert(first.right <= second.left || second.right <= first.left || first.bottom <= second.top || second.bottom <= first.top, 'Card labels overlap');
            }
            assert(sections.some(section => {
              const area = section.querySelector('rect')!.getBoundingClientRect();
              return bounds.left >= area.left && bounds.right <= area.right && bounds.top >= area.top && bounds.bottom <= area.bottom;
            }), 'Card escapes its column');
          }
          assert(svg.querySelector('a')?.getAttribute('xlink:href') === 'https://example.invalid/DOC-128', 'Ticket link changed');
          const priorities = [...svg.querySelectorAll('.node > line')].map(line => line.getAttribute('stroke'));
          assert(priorities.includes('orange') && priorities.includes('blue'), 'Priority colors changed');
        }
        container.style.width = `${Math.min(1000, output.clientWidth)}px`;
      }
    });
  }
  document.body.classList.remove('theme-dark');
  await test('Kanban source colors remain authoritative', async () => {
    const container = document.createElement('div'); output.append(container);
    try {
      const result = await renderer.render(`kanban-source-${++serial}`, `---\nconfig:\n  themeVariables:\n    clusterBkg: '#ffeecc'\n    clusterBorder: '#aa5500'\n    primaryColor: '#ccddee'\n    primaryTextColor: '#123456'\n---\n${source}`, loadSettings({}), container);
      const svg = document.importNode(new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement, true);
      container.append(svg);
      assert(getComputedStyle(svg.querySelector('.cluster > rect')!).fill === 'rgb(255, 238, 204)', 'Source column fill lost');
      assert(getComputedStyle(svg.querySelector('.cluster > rect')!).stroke === 'rgb(170, 85, 0)', 'Source column border lost');
      assert(getComputedStyle(svg.querySelector('.node > rect')!).fill === 'rgb(204, 221, 238)', 'Source card fill lost');
      assert(getComputedStyle(svg.querySelector('.node text')!).fill === 'rgb(18, 52, 86)', 'Source text color lost');
      const custom = await renderer.render(`kanban-scale-${++serial}`, source, loadSettings({ types: { kanban: { mode: 'beauty', config: '{"themeVariables":{"cScale2":"#000000","cScaleLabel2":"#ffff00","nodeBorder":"#ff0000"}}' } } }), container);
      const customSvg = document.importNode(new DOMParser().parseFromString(custom.svg, 'image/svg+xml').documentElement, true);
      container.replaceChildren(customSvg);
      assert(getComputedStyle(customSvg.querySelector('.section-1 > rect')!).fill === 'rgb(26, 26, 26)', 'Explicit section palette lost');
      assert(getComputedStyle(customSvg.querySelector('.section-1 text')!).fill === 'rgb(255, 255, 0)', 'Explicit section text lost');
      assert(getComputedStyle(customSvg.querySelector('.node > rect')!).stroke === 'rgb(255, 0, 0)', 'Explicit node border lost');
    } finally { container.remove(); }
  });
}
