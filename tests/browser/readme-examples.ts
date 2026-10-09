import { BeautyRenderer } from '../../src/renderer';
import { loadSettings } from '../../src/settings';

import { readmeExamples } from './readme-sources';

interface NativeExample { type: string; source: string; svg: string; }
interface NativeResult {
  kind: 'mermaid-native-examples'; examples: NativeExample[];
  baseline: { version: string; theme: string; layout: string; htmlLabels: boolean };
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
  scale: number, title: string, subtitle: string): string {
  const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
  const size = dimensions(source);
  const drawingWidth = size.width * scale, drawingHeight = size.height * scale;
  svg.setAttribute('x', String(x + (width - drawingWidth) / 2));
  svg.setAttribute('y', String(y + 84 + (height - 108 - drawingHeight) / 2));
  svg.setAttribute('width', String(drawingWidth)); svg.setAttribute('height', String(drawingHeight));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.removeAttribute('style');
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="14" fill="#ffffff" stroke="#d6deea"/>
    <text x="${x + 24}" y="${y + 36}" font-size="24" font-weight="600" fill="#1f2937">${title}</text>
    <text x="${x + 24}" y="${y + 61}" font-size="15" fill="#526176">${subtitle}</text>
    ${new XMLSerializer().serializeToString(svg)}`;
}

/** Rasterize the self-contained SVG at 3× resolution, including HTML labels. */
async function pngDataUrl(svg: string, width: number, height: number): Promise<string> {
  const picture = new Image();
  picture.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await picture.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width * 3; canvas.height = height * 3;
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
      const before = native.examples.find(item => item.type === example.type);
      if (!before || before.source !== example.source || before.svg.includes('mermaid-beauty')) {
        throw new Error('The native baseline must use the same source and contain no plugin output.');
      }
      const after = await renderer.render(`after-${example.type}`, example.source, loadSettings(undefined));
      const beforeSize = dimensions(before.svg), afterSize = dimensions(after.svg);
      const panelWidth = 556;
      const scale = Math.min((panelWidth - 48) / Math.max(beforeSize.width, afterSize.width),
        560 / Math.max(beforeSize.height, afterSize.height));
      const panelHeight = Math.ceil(Math.max(beforeSize.height, afterSize.height) * scale) + 108;
      const comparison = (stacked: boolean): { svg: string; width: number; height: number } => {
        const width = stacked ? panelWidth + 32 : panelWidth * 2 + 48;
        const height = stacked ? panelHeight * 2 + 48 : panelHeight + 32;
        return { width, height, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif" role="img" aria-label="${example.name}: before and after Mermaid Beauty">
          <rect width="${width}" height="${height}" fill="#f6f8fb"/>
          ${panel(before.svg, 16, 16, panelWidth, panelHeight, scale, 'Before', 'Mermaid 11.13.0 · default rendering')}
          ${panel(after.svg, stacked ? 16 : panelWidth + 32, stacked ? panelHeight + 32 : 16,
            panelWidth, panelHeight, scale, 'After', 'Mermaid Beauty · default coordinated colors')}
        </svg>` };
      };
      const wide = comparison(false), stacked = comparison(true);
      const svg = wide.svg;
      const article = document.createElement('article');
      article.id = `readme-${example.type}`;
      article.className = 'preview-readme-article';
      const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
      if (parsed.querySelector('parsererror')) throw new Error('Invalid comparison SVG.');
      const drawing = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
      drawing.classList.add('preview-readme-svg');
      article.append(drawing); container.append(article);
      assets.push({ name: example.type, svg, png: await pngDataUrl(svg, wide.width, wide.height),
        stackedPng: await pngDataUrl(stacked.svg, stacked.width, stacked.height), baseline: native.baseline });
    }
    const response = await fetch('/readme-assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assets) });
    if (!response.ok) throw new Error('Could not save README comparison images.');
  } finally { renderer.dispose(); document.body.classList.toggle('theme-dark', wasDark); }
}
