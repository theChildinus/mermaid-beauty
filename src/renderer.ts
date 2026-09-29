import type { Mermaid, RenderResult } from 'mermaid';
import { diagramType, isRecord, parseCustomConfig, resolveAppearance, type BeautySettings } from './settings';
import { mergeConfig, themeConfig } from './theme';
import { styleZenUml } from './zenuml-style';
import { styleConnectorWidth } from './line-width';
import { flowchartLayout } from './flowchart-layout';
import { softenOrthogonalPath } from './rounded-path';

/** Each render owns the configuration until its SVG is complete. */
export class BeautyRenderer {
  private engine?: Promise<Mermaid>;
  private pending: Promise<unknown> = Promise.resolve();
  private disposed = false;

  render(id: string, source: string, settings: BeautySettings, container?: HTMLElement): Promise<RenderResult> {
    const task = this.pending.then(async () => {
      if (this.disposed) throw new Error('Mermaid Beauty has been unloaded.');
      this.engine ??= import('mermaid').then(async module => {
        const { default: zenuml } = await import('@mermaid-js/mermaid-zenuml');
        await module.default.registerExternalDiagrams([zenuml]);
        module.default.registerLayoutLoaders([flowchartLayout]);
        return module.default;
      });
      const engine = await this.engine;
      if (this.disposed) throw new Error('Mermaid Beauty has been unloaded.');
      const type = diagramType(source);
      const appearance = resolveAppearance(settings, type);
      const extra = parseCustomConfig(settings.types[type]?.config ?? '');
      const doc = container?.ownerDocument ?? document;
      const dark = doc.body.classList.contains('theme-dark');
      // Mermaid measures text in the main document, even for a pop-out window.
      // Keep the renderer usable in a browser without Obsidian's DOM extensions.
      const host = document.createElement('div');
      host.className = 'mermaid-beauty-measure';
      host.style.width = `${Math.max(320, container?.clientWidth ?? 800)}px`;
      document.body.appendChild(host);
      try {
        await document.fonts.ready;
        if (this.disposed) throw new Error('Mermaid Beauty has been unloaded.');
        let config = themeConfig(appearance, type, dark, extra);
        engine.initialize(config);
        if (/^\s*(?:---|%%\{)/m.test(source)) {
          const parsedSource = await engine.parse(source);
          if (parsedSource && parsedSource.config.themeVariables) {
            // Initialize again so Mermaid recalculates derived colors (such as mainBkg).
            // Only validated color options enter initialize; security settings stay fixed.
            const variables: unknown = parsedSource.config.themeVariables;
            const overrides = parseCustomConfig(JSON.stringify({ themeVariables: variables }));
            config = mergeConfig(config as Record<string, unknown>, overrides);
            engine.initialize(config);
          }
        }
        const result = await engine.render(id, source, host);
        if (this.disposed) throw new Error('Mermaid Beauty has been unloaded.');
        const parsed = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
        const svg = parsed.documentElement;
        if (svg.localName !== 'svg' || parsed.querySelector('parsererror')) throw new Error('Mermaid returned invalid SVG.');
        if (type === 'zenuml') styleZenUml(svg, config, appearance);
        styleConnectorWidth(svg, type, appearance.lineWidth);
        // Most Mermaid renderers leave the canvas transparent. Honor the selected
        // background as well as chart renderers that draw their own background.
        const variables: unknown = config.themeVariables;
        if (isRecord(variables) && typeof variables.background === 'string') {
          (svg as unknown as SVGSVGElement).style.backgroundColor = variables.background;
        }
        if (type === 'flowchart') {
          for (const path of svg.querySelectorAll('path.flowchart-link[data-look="classic"]')) {
            path.setAttribute('d', softenOrthogonalPath(path.getAttribute('d') ?? '', appearance.fontSize * 0.8));
          }
          // Open chevrons keep the same meaning and attachment point as filled arrows.
          for (const marker of svg.querySelectorAll('marker[id$="-pointEnd"], marker[id$="-pointStart"]')) {
            const arrow = marker.querySelector('path');
            if (!arrow) continue;
            const end = marker.id.endsWith('-pointEnd');
            arrow.setAttribute('d', end ? 'M2 1L8 5L2 9' : 'M8 1L2 5L8 9');
            arrow.setAttribute('style', `${arrow.getAttribute('style') ?? ''};fill:none;stroke-width:1.3;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:none`);
          }
        }
        svg.classList.add('mermaid-beauty-diagram');
        svg.setAttribute('data-mermaid-beauty-type', type);
        svg.setAttribute('data-mermaid-beauty-fit', String(appearance.fitWidth));
        // Mermaid's info renderer has fixed dimensions but omits its viewBox.
        if (type === 'info' && !svg.hasAttribute('viewBox')) svg.setAttribute('viewBox', '0 0 400 100');
        if (!appearance.fitWidth) {
          const bounds = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);
          if (bounds?.length === 4 && bounds[2]! > 0 && bounds[3]! > 0) {
            const scale = type === 'zenuml' ? appearance.fontSize / 16 : 1;
            svg.setAttribute('width', String(bounds[2]! * scale));
            svg.setAttribute('height', String(bounds[3]! * scale));
          }
        }
        for (const rect of svg.querySelectorAll('.edgeLabel rect')) {
          if (rect.hasAttribute('data-beauty-measured')) continue;
          const width = Number(rect.getAttribute('width'));
          const height = Number(rect.getAttribute('height'));
          if (!(width > 0 && height > 0)) continue;
          rect.setAttribute('x', String(Number(rect.getAttribute('x')) - 8));
          rect.setAttribute('y', String(Number(rect.getAttribute('y')) - 4));
          rect.setAttribute('width', String(width + 16));
          rect.setAttribute('height', String(height + 8));
        }
        svg.setAttribute('role', 'img');
        if (!svg.getAttribute('aria-label') && !svg.getAttribute('aria-labelledby')) {
          svg.setAttribute('aria-label', `Mermaid ${type} diagram`);
        }
        return { ...result, svg: new XMLSerializer().serializeToString(svg) };
      } finally {
        host.remove();
      }
    });
    this.pending = task.catch(() => undefined);
    return task;
  }

  dispose(): void { this.disposed = true; }
}
