import { BeautyRenderer } from '../../src/renderer';
import { loadSettings } from '../../src/settings';

import { readmeExamples } from './readme-sources';

interface NativeExample {
  id: string; source: string; svg: string;
  baseline: { version: string; theme: string; layout: string; htmlLabels: boolean };
}
interface NativeResult {
  kind: 'mermaid-native-examples'; examples: NativeExample[];
  error?: string;
}

async function nativeExamples(): Promise<NativeResult> {
  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'Unmodified native Mermaid');
  frame.className = 'preview-native-frame';
  let timer: number;
  let receive: (event: MessageEvent<NativeResult>) => void;
  try {
    return await new Promise<NativeResult>((resolve, reject) => {
      receive = event => {
        if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.kind !== 'mermaid-native-examples') return;
        if (event.data.error) reject(new Error(event.data.error));
        else resolve(event.data);
      };
      window.addEventListener('message', receive);
      timer = window.setTimeout(() => reject(new Error('Native Mermaid rendering timed out.')), 30_000);
      frame.src = '/native.html';
      document.body.append(frame);
    });
  } finally {
    window.clearTimeout(timer!); window.removeEventListener('message', receive!); frame.remove();
  }
}

function dimensions(source: string): { width: number; height: number } {
  const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
  const bounds = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
  if (!bounds || bounds.length !== 4 || !bounds.every(Number.isFinite) || bounds[2]! <= 0 || bounds[3]! <= 0) {
    throw new Error('The comparison needs a valid diagram viewBox.');
  }
  return { width: bounds[2]!, height: bounds[3]! };
}

function panel(source: string, x: number, y: number, width: number, height: number,
  scale: number, title: string, subtitle: string, dark = false): string {
  const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
  const size = dimensions(source);
  const drawingWidth = size.width * scale, drawingHeight = size.height * scale;
  svg.setAttribute('x', String(x + (width - drawingWidth) / 2));
  svg.setAttribute('y', String(y + 84 + (height - 108 - drawingHeight) / 2));
  svg.setAttribute('width', String(drawingWidth)); svg.setAttribute('height', String(drawingHeight));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.removeAttribute('style');
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="${dark ? '#202124' : '#ffffff'}" stroke="${dark ? '#515763' : '#d6deea'}"/>
    <text x="${x + 24}" y="${y + 36}" font-size="24" font-weight="600" fill="${dark ? '#e8eaf0' : '#1f2937'}">${title}</text>
    <text x="${x + 24}" y="${y + 61}" font-size="15" fill="${dark ? '#b6bdca' : '#526176'}">${subtitle}</text>
    ${new XMLSerializer().serializeToString(svg)}`;
}

/** Rasterize the self-contained SVG at 3× resolution, including HTML labels. */
async function pngDataUrl(svg: string, width: number, height: number, resolution = 3): Promise<string> {
  const picture = new Image();
  picture.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await picture.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width * resolution; canvas.height = height * resolution;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the README image canvas.');
  context.drawImage(picture, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/** Both sides use the same source and scale, so font and spacing differences stay honest. */
export async function exportReadmeExamples(container: HTMLElement): Promise<void> {
  container.replaceChildren();
  const native = await nativeExamples();
  const renderer = new BeautyRenderer(() => document.createElement('div'),
    () => document.createElementNS('http://www.w3.org/2000/svg', 'style'));
  const assets = [];
  const wasDark = document.body.classList.contains('theme-dark');
  document.body.classList.remove('theme-dark');
  try {
    for (const example of readmeExamples) {
      document.body.classList.toggle('theme-dark', Boolean(example.dark));
      const before = native.examples.find(item => item.id === example.id);
      if (!before || before.source !== example.source || before.svg.includes('mermaid-beauty')) {
        throw new Error('The native baseline must use the same source and contain no plugin output.');
      }
      const after = await renderer.render(`after-${example.id}`, example.source, loadSettings(undefined));
      const beforeSize = dimensions(before.svg), afterSize = dimensions(after.svg);
      const comparison = (stacked: boolean): { svg: string; width: number; height: number } => {
        // Full-width rows keep horizontal diagrams readable in a README column.
        const panelWidth = stacked ? 1080 : 556;
        const scale = Math.min((panelWidth - 48) / Math.max(beforeSize.width, afterSize.width),
          560 / Math.max(beforeSize.height, afterSize.height));
        const panelHeight = Math.ceil(Math.max(beforeSize.height, afterSize.height) * scale) + 108;
        const beforeHeight = stacked ? Math.ceil(beforeSize.height * scale) + 108 : panelHeight;
        const afterHeight = stacked ? Math.ceil(afterSize.height * scale) + 108 : panelHeight;
        const width = stacked ? panelWidth + 32 : panelWidth * 2 + 48;
        const height = stacked ? beforeHeight + afterHeight + 48 : panelHeight + 32;
        return { width, height, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif" role="img" aria-label="${example.name}: before and after Mermaid Beauty">
          <rect width="${width}" height="${height}" fill="${example.dark ? '#16181c' : '#f6f8fb'}"/>
          ${panel(before.svg, 16, 16, panelWidth, beforeHeight, scale, 'Before · Native Mermaid', example.beforeCaption, example.dark)}
          ${panel(after.svg, stacked ? 16 : panelWidth + 32, stacked ? beforeHeight + 32 : 16,
            panelWidth, afterHeight, scale, 'After · Mermaid Beauty', example.afterCaption, example.dark)}
        </svg>` };
      };
      const wide = comparison(false), stacked = comparison(true);
      const svg = wide.svg;
      const article = document.createElement('article');
      article.id = `readme-${example.id}`;
      article.className = 'preview-readme-article';
      const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
      if (parsed.querySelector('parsererror')) throw new Error('Invalid comparison SVG.');
      const drawing = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
      drawing.classList.add('preview-readme-svg');
      article.append(drawing); container.append(article);
      // Six stills form a 15-second demo. Both phases keep the same source and scale.
      const demoScale = Math.min(992 / Math.max(beforeSize.width, afterSize.width), 560 / Math.max(beforeSize.height, afterSize.height));
      const demo = (drawing: string, title: string, caption: string): string =>
        `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="720" viewBox="0 0 1080 720" font-family="system-ui, sans-serif"><rect width="1080" height="720" fill="${example.dark ? '#16181c' : '#f6f8fb'}"/>${panel(drawing, 16, 16, 1048, 688, demoScale, title, caption, example.dark)}</svg>`;
      assets.push({ name: example.id, svg, png: await pngDataUrl(svg, wide.width, wide.height),
        stackedPng: await pngDataUrl(stacked.svg, stacked.width, stacked.height), baseline: before.baseline,
        demoBefore: await pngDataUrl(demo(before.svg, 'Before · Native Mermaid', example.name), 1080, 720, 1),
        demoAfter: await pngDataUrl(demo(after.svg, 'After · Mermaid Beauty', example.name), 1080, 720, 1) });
    }
    const response = await fetch('/readme-assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assets) });
    if (!response.ok) throw new Error('Could not save README comparison images.');
  } finally { renderer.dispose(); document.body.classList.toggle('theme-dark', wasDark); }
}
