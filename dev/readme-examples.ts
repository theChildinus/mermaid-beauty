import type { Fixture } from './fixtures';
import { BeautyRenderer } from '../src/renderer';
import { loadSettings } from '../src/settings';

export const readmeExamples: Fixture[] = [
  { name: 'Flowchart', type: 'flowchart', source: `flowchart LR
  Publisher[Publisher] -->|Publish version| Control[Content service]
  Reader[Reader] -->|Look up path| Control
  Worker[Sync worker] -->|Check for updates| Control
  Worker -->|Download files| Files[File store]
  Control <-->|Read and write| Index[(Index)]
  Worker -->|Register files and report status| Index` },
  { name: 'Sequence', type: 'sequence', source: `sequenceDiagram
  participant Reader
  participant API as Content service
  participant Store as File store
  Reader->>API: Open article
  activate API
  API->>Store: Load content
  Store-->>API: Article
  Note right of API: Cache the result
  API-->>Reader: Display article
  deactivate API` },
  { name: 'Class', type: 'class', source: `classDiagram
  class Library {
    +String name
    +findBook()
  }
  class Book {
    +String title
    +borrow()
  }
  class Reader {
    +String name
    +read()
  }
  Library "1" --> "many" Book : stores
  Reader --> Book : borrows` },
];

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

async function png(source: string, height: number): Promise<string> {
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = height * 2;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png').split(',')[1]!;
  } finally { URL.revokeObjectURL(url); }
}

/** Both sides use exactly the same source and canvas width; only rendering changes. */
export async function exportReadmeExamples(container: HTMLElement): Promise<void> {
  container.replaceChildren();
  const engine = (await import('mermaid')).default;
  const renderer = new BeautyRenderer();
  const assets = [];
  const wasDark = document.body.classList.contains('theme-dark');
  document.body.classList.remove('theme-dark');
  try {
    for (const example of readmeExamples) {
      engine.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default', htmlLabels: false,
        flowchart: { htmlLabels: false }, suppressErrorRendering: true });
      const before = await engine.render(`before-${example.type}`, example.source);
      const after = await renderer.render(`after-${example.type}`, example.source, loadSettings({}));
      const rowHeight = example.type === 'flowchart' ? 380 : 430;
      const height = rowHeight * 2 + 32;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" font-family="system-ui, sans-serif" role="img" aria-label="${example.name}: before and after Mermaid Beauty">
        <rect width="1200" height="${height}" fill="#f5f7f6"/>
        ${panel(before.svg, 8, rowHeight, 'Before', 'Default Mermaid · same diagram source')}
        ${panel(after.svg, rowHeight + 24, rowHeight, 'After', 'Mermaid Beauty · Mint preset')}
      </svg>`;
      const encoded = await png(svg, height);
      const image = document.createElement('img'); image.src = `data:image/png;base64,${encoded}`;
      image.alt = `${example.name}: default Mermaid compared with Mermaid Beauty`;
      image.style.width = '100%'; image.style.maxWidth = '1200px'; container.append(image);
      assets.push({ name: example.type, svg, png: encoded });
    }
    const response = await fetch('/readme-assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assets) });
    if (!response.ok) throw new Error('Could not save README comparison images.');
  } finally { renderer.dispose(); document.body.classList.toggle('theme-dark', wasDark); }
}
