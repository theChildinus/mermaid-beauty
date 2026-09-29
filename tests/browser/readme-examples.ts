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

function panel(source: string, y: number, height: number, title: string, subtitle: string): string {
  const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
  svg.setAttribute('x', '32'); svg.setAttribute('y', String(y + 72));
  svg.setAttribute('width', '1136'); svg.setAttribute('height', String(height - 100));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.removeAttribute('style');
  return `<rect x="8" y="${y}" width="1184" height="${height}" rx="16" fill="#ffffff" stroke="#dce5df"/>
    <text x="32" y="${y + 32}" font-size="20" font-weight="600" fill="#24382d">${title}</text>
    <text x="32" y="${y + 55}" font-size="13" fill="#66736c">${subtitle}</text>
    ${new XMLSerializer().serializeToString(svg)}`;
}

/** Both sides use exactly the same source and canvas width; only rendering changes. */
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
      const after = await renderer.render(`after-${example.type}`, example.source, loadSettings({}));
      const rowHeight = example.type === 'flowchart' ? 360 : 430;
      const height = rowHeight * 2 + 32;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" font-family="system-ui, sans-serif" role="img" aria-label="${example.name}: before and after Mermaid Beauty">
        <rect width="1200" height="${height}" fill="#f5f7f6"/>
        ${panel(before.svg, 8, rowHeight, 'Before', 'Native Mermaid 11.13.0 · default theme and layout')}
        ${panel(after.svg, rowHeight + 24, rowHeight, 'After', 'Mermaid Beauty · Mint preset')}
      </svg>`;
      const article = document.createElement('article');
      article.id = `readme-${example.type}`;
      article.className = 'preview-readme-article';
      const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
      if (parsed.querySelector('parsererror')) throw new Error('Invalid comparison SVG.');
      const drawing = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
      drawing.classList.add('preview-readme-svg');
      article.append(drawing); container.append(article);
      assets.push({ name: example.type, svg, baseline: native.baseline });
    }
    const response = await fetch('/readme-assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assets) });
    if (!response.ok) throw new Error('Could not save README comparison images.');
  } finally { renderer.dispose(); document.body.classList.toggle('theme-dark', wasDark); }
}
