const MAX_SIDE = 4096;
const MAX_PIXELS = 16_000_000;

/** Keep raster exports within mobile canvas limits without changing the aspect ratio. */
export function pngSize(width: number, height: number): { width: number; height: number; scale: number } {
  if (![width, height].every(value => Number.isFinite(value) && value > 0)) throw new Error('Invalid diagram dimensions.');
  const scale = Math.min(2, MAX_SIDE / width, MAX_SIDE / height, Math.sqrt(MAX_PIXELS / (width * height)));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)), scale };
}

export interface DiagramImage { svg: string; width: number; height: number; }

// Capture resolved styles, including theme variables and HTML labels, so the image
// does not depend on the vault's stylesheets. Never mutate the displayed diagram.
const STYLE_PROPERTIES = [
  'color', 'background-color', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width',
  'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin',
  'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
  'letter-spacing', 'line-height', 'text-anchor', 'dominant-baseline', 'text-decoration',
  'white-space', 'word-break', 'overflow-wrap', 'text-align', 'vertical-align',
  'display', 'visibility', 'padding', 'margin', 'border', 'border-radius',
  'box-sizing', 'width', 'height', 'max-width', 'min-width', 'filter',
  'marker-start', 'marker-mid', 'marker-end', 'clip-path', 'mask', 'vector-effect',
  'transform', 'transform-origin', 'transform-box', 'rx', 'ry',
];

/** Snapshot an already rendered diagram. External images are rejected rather than fetched. */
export function diagramImage(svg: SVGSVGElement): DiagramImage {
  const bounds = svg.viewBox.baseVal;
  const width = bounds.width, height = bounds.height;
  pngSize(width, height);
  const view = svg.ownerDocument.defaultView;
  if (!view) throw new Error('Diagram window is unavailable.');
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const originals = [svg, ...svg.querySelectorAll<SVGElement | HTMLElement>('*')];
  const copies = [copy, ...copy.querySelectorAll<SVGElement | HTMLElement>('*')];
  for (let i = 0; i < originals.length; i++) {
    const original = originals[i]!, target = copies[i]!;
    if (!target.style) continue;
    const computed = view.getComputedStyle(original);
    target.removeAttribute('style');
    for (const property of STYLE_PROPERTIES) {
      let value = computed.getPropertyValue(property);
      // Chromium resolves fragment paint servers against the note URL.
      value = value.replace(/url\(["']?([^"')]+)["']?\)/g, (_match, url: string) => {
        const fragment = url.indexOf('#');
        if (fragment >= 0 && (url.startsWith('#') || url.slice(0, fragment) === svg.ownerDocument.URL.split('#')[0])) {
          return `url(${url.slice(fragment)})`;
        }
        throw new Error('External image resources cannot be exported.');
      });
      if (value) target.style.setProperty(property, value);
    }
  }
  for (const element of copy.querySelectorAll('script, iframe, object, embed, video, audio, source, track, link, meta')) element.remove();
  for (const element of [copy, ...copy.querySelectorAll('*')]) {
    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
    }
    if (['image', 'img', 'use'].includes(element.localName)) {
      element.removeAttribute('srcset');
      for (const name of ['href', 'xlink:href', 'src']) {
        const url = element.getAttribute(name);
        if (url && !url.startsWith('#') && !/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(url)) {
          throw new Error('External image resources cannot be exported.');
        }
      }
    }
  }
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', String(width)); copy.setAttribute('height', String(height));
  copy.style.setProperty('width', `${width}px`); copy.style.setProperty('height', `${height}px`);
  // This detached snapshot must retain its intrinsic size outside Obsidian.
  for (const property of ['max-width', 'max-height', 'min-width']) copy.style.removeProperty(property);
  // Scoped Mermaid CSS is now resolved inline. Keeping it could override the snapshot.
  for (const style of copy.querySelectorAll('style')) style.remove();
  return { svg: new XMLSerializer().serializeToString(copy), width, height };
}

/** Rasterize a self-contained snapshot; data URLs also support HTML labels in Chromium. */
export async function diagramPng(image: DiagramImage, canvas: HTMLCanvasElement): Promise<Blob> {
  const size = pngSize(image.width, image.height);
  const picture = new Image();
  let timer: number | undefined;
  picture.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(image.svg)}`;
  try {
    await Promise.race([picture.decode(), new Promise<never>((_resolve, reject) => {
      timer = window.setTimeout(() => reject(new Error('Image decoding timed out.')), 15_000);
    })]);
    canvas.width = size.width; canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image canvas is unavailable.');
    context.drawImage(picture, 0, 0, size.width, size.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not encode the image.')), 'image/png');
    });
  } finally {
    window.clearTimeout(timer);
    picture.src = '';
    canvas.width = 0; canvas.height = 0;
  }
}
