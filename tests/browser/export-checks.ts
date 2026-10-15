import { diagramImage, diagramPng } from '../../src/diagram-export';
import type { BeautyRenderer } from '../../src/renderer';
import { loadSettings } from '../../src/settings';
import { DiagramExportControls } from '../../src/export-controls';
import { SvgClipboard } from '../../src/svg-clipboard';
import { DiagramFileExport } from '../../src/file-export';
import { installCreateEl, menuItems } from './obsidian-export-stub';
import type { App } from 'obsidian';

type Check = (name: string, action: () => Promise<void>) => Promise<void>;
const sources = [
  'flowchart LR\n A[提交申请与中文说明] -->|批准| B[保存结果]\n B --> A',
  'sequenceDiagram\n participant A as 用户\n participant B as 服务\n A->>B: 提交申请\n B-->>A: 已完成',
  'mindmap\n root((Research))\n  Notes\n  Questions\n  Results',
];

function addZoomControls(host: HTMLElement): HTMLElement {
  host.classList.add('preview-inline-zoom');
  const cluster = document.createElement('div'); cluster.className = 'mermaid-zoom-inline-controls';
  for (const [label, text] of [['Zoom in', '+'], ['Zoom out', '−'], ['Fit width', '↔'], ['Reset zoom', '↶'], ['Lock gestures', '⌑'], ['Fullscreen', '⛶']]) {
    const button = document.createElement('button'); button.className = 'mermaid-zoom-icon-btn';
    button.setAttribute('aria-label', label!); button.textContent = text!; cluster.append(button);
  }
  // Match Zoom 1.7's scroll anchoring without importing the plugin into Beauty.
  host.addEventListener('scroll', () => { cluster.style.transform = `translateX(${host.scrollLeft}px)`; }, { passive: true });
  host.append(cluster); return cluster;
}

export async function checkExports(renderer: BeautyRenderer, output: Element, test: Check): Promise<void> {
  let serial = 0;
  const wasDark = document.body.classList.contains('theme-dark');
  try {
    for (const card of output.querySelectorAll('.card[data-passed="true"]')) {
      const name = card.querySelector('h2')!.textContent;
      await test(`Export supported family ${name}`, async () => {
        const svg = card.querySelector<SVGSVGElement>('svg.mermaid-beauty-diagram')!;
        const before = svg.outerHTML;
        const snapshot = diagramImage(svg);
        const blob = await diagramPng(snapshot, document.createElement('canvas'));
        if (blob.size < 500 || svg.outerHTML !== before) throw new Error('Export failed or changed the displayed diagram.');
      });
    }
    for (const dark of [false, true]) for (const source of sources) {
      await test(`Export ${source.split('\n')[0]} / ${dark ? 'dark' : 'light'}`, async () => {
        document.body.classList.toggle('theme-dark', dark);
        const card = document.createElement('article'); card.className = `card ${dark ? 'dark-card' : 'light-card'}`;
        const title = document.createElement('h2'); title.textContent = `Image export / ${dark ? 'dark' : 'light'}`; card.append(title);
        const host = document.createElement('div'); host.className = 'mermaid preview-narrow'; card.append(host); output.append(card);
        const result = await renderer.render(`export-${++serial}`, source, loadSettings(undefined), host);
        const node = new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement;
        const svg = document.importNode(node, true) as unknown as SVGSVGElement; host.append(svg);
        installCreateEl(host);
        const controls = new DiagramExportControls(host, 'Example.md', text => text, new SvgClipboard({} as App, text => text), new DiagramFileExport({} as App, text => text, () => undefined, async () => {}));
        controls.onload();
        if (source.startsWith('flowchart')) addZoomControls(host);
        const before = svg.outerHTML;
        const image = diagramImage(svg);
        if (svg.outerHTML !== before) throw new Error('Export changed the rendered diagram.');
        const parsed = new DOMParser().parseFromString(image.svg, 'image/svg+xml');
        if (parsed.querySelector('parsererror')) throw new Error('Export is not valid SVG.');
        if (parsed.querySelectorAll('text, foreignObject').length !== svg.querySelectorAll('text, foreignObject').length) throw new Error('Export lost diagram labels.');
        if (parsed.querySelectorAll('path').length !== svg.querySelectorAll('path').length) throw new Error('Export lost connections.');
        if (image.svg.includes('var(--')) throw new Error('Export still depends on a theme variable.');
        const sourceRect = svg.querySelector('rect');
        const exportedRect = parsed.querySelector('rect');
        if (sourceRect && exportedRect && exportedRect.style.rx !== getComputedStyle(sourceRect).rx) throw new Error('Export lost rounded corners.');
        const blob = await diagramPng(image, document.createElement('canvas'));
        if (blob.type !== 'image/png' || blob.size < 500) throw new Error('PNG export is empty.');
        const picture = document.createElement('img');
        picture.alt = 'PNG exported from the diagram above';
        const url = URL.createObjectURL(blob); picture.src = url;
        await picture.decode(); URL.revokeObjectURL(url);
        if (!picture.naturalWidth || !picture.naturalHeight) throw new Error('PNG cannot be decoded.');
        picture.className = 'preview-export-image'; card.append(picture);
        // Keep only the button for visual inspection; the test page owns no vault.
        // Disconnect through the child's lifecycle when its card is removed.
        const removed = new MutationObserver(() => {
          if (!card.isConnected) { controls.onunload(); removed.disconnect(); }
        });
        removed.observe(output, { childList: true });
      });
    }
    await test('Export rejects external images without changing the source SVG', async () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      const image = document.createElementNS(svg.namespaceURI, 'image'); image.setAttribute('href', 'https://example.invalid/private.png'); svg.append(image);
      // Keep detached so the browser never fetches the test URL.
      const original = svg.outerHTML;
      let failed = false;
      try { diagramImage(svg); } catch (error) { failed = error instanceof Error && error.message.includes('External image'); }
      if (!failed || svg.outerHTML !== original) throw new Error('External image handling is unsafe.');
    });
    for (const width of [240, 320, 900]) for (const zoomFirst of [false, true]) {
      await test(`Export and Zoom controls stay separate at ${width}px / ${zoomFirst ? 'Zoom first' : 'Beauty first'}`, async () => {
        const section = document.createElement('section'); section.style.width = `${width}px`; output.append(section);
        const host = document.createElement('div'); host.className = 'mermaid'; section.append(host); installCreateEl(host);
        const result = await renderer.render(`export-zoom-${++serial}`, sources[0]!, loadSettings(undefined), host);
        const svg = document.importNode(new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement, true) as unknown as SVGSVGElement;
        host.append(svg);
        const nextParagraph = document.createElement('p'); nextParagraph.textContent = 'Content after the diagram'; section.append(nextParagraph);
        const controls = new DiagramExportControls(host, 'Example.md', text => text, new SvgClipboard({} as App, text => text), new DiagramFileExport({} as App, text => text, () => undefined, async () => {}));
        host.classList.add('mermaid-beauty-container', 'preview-inline-zoom');
        const heightBefore = host.getBoundingClientRect().height, nextTopBefore = nextParagraph.getBoundingClientRect().top;
        let cluster: HTMLElement;
        if (zoomFirst) { cluster = addZoomControls(host); controls.onload(); }
        else { controls.onload(); cluster = addZoomControls(host); }
        try {
          const button = section.querySelector<HTMLButtonElement>('.mermaid-beauty-export')!;
          const bounds = button.getBoundingClientRect(), zoomBounds = cluster.getBoundingClientRect();
          if (bounds.left < zoomBounds.right && bounds.right > zoomBounds.left && bounds.top < zoomBounds.bottom && bounds.bottom > zoomBounds.top) throw new Error('Export button overlaps Zoom controls.');
          if (!host.contains(button) || bounds.top < host.getBoundingClientRect().top || bounds.bottom > host.getBoundingClientRect().bottom) throw new Error('Export button is not inside the diagram.');
          if (Math.abs(host.getBoundingClientRect().height - heightBefore) > 1 || Math.abs(nextParagraph.getBoundingClientRect().top - nextTopBefore) > 1) throw new Error('Export controls add a row or change the diagram height.');
          if (host.querySelector('svg') !== svg) throw new Error('Zoom would select an action icon instead of the diagram.');
          const before = button.getBoundingClientRect().left;
          // Zoom replaces Mermaid's inline natural-size cap when scaling.
          svg.style.removeProperty('max-width');
          svg.style.width = `${width * 2}px`; svg.classList.add('preview-export-scrolled');
          host.scrollLeft = width;
          await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
          if (!host.scrollLeft) throw new Error('The Zoom fixture did not produce horizontal overflow.');
          if (Math.abs(button.getBoundingClientRect().left - before) > 1) throw new Error('Export button moves with the horizontally scrolled diagram.');
          if (button.getBoundingClientRect().right > cluster.getBoundingClientRect().left) throw new Error('Export button overlaps Zoom controls after scrolling.');
          if (button.getBoundingClientRect().right > section.getBoundingClientRect().right + 1) throw new Error('Export button escapes the note width.');
          button.focus();
          if (document.activeElement !== button || getComputedStyle(button).opacity !== '1') throw new Error('Export button is not visible and keyboard reachable.');
        } finally { controls.onunload(); section.remove(); }
      });
    }
    for (const rootIsDiagram of [true, false]) await test(`Export controls attach after async rendering, survive refresh and clean up / ${rootIsDiagram ? 'diagram root' : 'section root'}`, async () => {
      const section = document.createElement('section'); output.append(section);
      const host = document.createElement('div'); host.className = 'mermaid preview-narrow'; section.append(host);
      installCreateEl(host);
      const controls = new DiagramExportControls(rootIsDiagram ? host : section, 'Example.md', text => text, new SvgClipboard({} as App, text => text), new DiagramFileExport({} as App, text => text, () => undefined, async () => {}));
      let parentClicks = 0, parentPointerDowns = 0;
      section.addEventListener('click', () => { parentClicks++; });
      section.addEventListener('pointerdown', () => { parentPointerDowns++; });
      const settle = (): Promise<void> => new Promise(resolve => window.requestAnimationFrame(() => resolve()));
      controls.onload();
      try {
        const result = await renderer.render('export-controls', sources[0]!, loadSettings(undefined), host);
        let svg: Element = document.importNode(new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement, true);
        host.append(svg); await settle();
        if (section.querySelectorAll('.mermaid-beauty-export').length !== 1) throw new Error('Async diagram has no export control.');
        if (!host.classList.contains('mermaid-beauty-container')) throw new Error('Host lost scrolling when bindFunctions was not called.');
        const button = section.querySelector<HTMLButtonElement>('button')!;
        if (button.getAttribute('aria-label') !== 'Copy and export') throw new Error('Export control is not labeled.');
        menuItems.length = 0;
        button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 })); button.click();
        if (parentClicks || parentPointerDowns || menuItems.join('|') !== 'Copy as SVG|Copy as PNG|---|Export as SVG…|Export as PNG…') throw new Error('Export menu interferes with diagram clicks/dragging or omits an action.');
        host.append(document.createElement('span')); await settle();
        if (section.querySelectorAll('button').length !== 1) throw new Error('Export controls duplicated.');
        const replacement = svg.cloneNode(true) as Element; svg.replaceWith(replacement); svg = replacement; await settle();
        if (button.isConnected || section.querySelectorAll('.mermaid-beauty-actions').length !== 1) throw new Error('Rerender left stale or duplicate actions.');
        section.remove(); output.append(section); await settle();
        if (section.querySelectorAll('button').length !== 1) throw new Error('Cached preview lost its actions after reattachment.');
        svg.remove(); await settle();
        if (section.querySelector('button') || section.querySelector('.mermaid-beauty-actions') || host.classList.contains('mermaid-beauty-container')) throw new Error('Control or scrolling remained after native fallback.');
        host.append(svg); await settle(); controls.onunload();
        if (section.querySelector('button') || host.classList.contains('mermaid-beauty-container')) throw new Error('Unload left an export control or scrolling.');
        host.append(document.createElement('span')); await settle();
        if (section.querySelector('button')) throw new Error('Unloaded observer recreated a control.');
      } finally { controls.onunload(); section.remove(); }
    });
  } finally { document.body.classList.toggle('theme-dark', wasDark); }
}
