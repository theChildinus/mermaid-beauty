import type { RenderResult } from 'mermaid';
import { diagramType, shouldEnhance, type BeautySettings } from './settings';

export type RenderFunction = (id: string, text: string, container?: HTMLElement) => Promise<RenderResult>;
export interface MermaidHost { render: RenderFunction; }

/** Patch only rendering. Obsidian retains ownership of code blocks and their lifecycle. */
export function attachRenderer(
  host: MermaidHost,
  readSettings: () => BeautySettings,
  render: RenderFunction,
  onFallback: (error: unknown) => void,
): () => void {
  const previous = host.render;
  let active = true;
  const styledContainers = new Set<Element>();
  const bindContainer = (result: RenderResult, enhanced: boolean): RenderResult => ({
    ...result,
    bindFunctions(element) {
      // Obsidian calls this after inserting the SVG. Track only live containers
      // and undo our class on native rendering, fallback, and plugin unload.
      for (const old of styledContainers) if (!old.isConnected) {
        old.classList.remove('mermaid-beauty-container');
        styledContainers.delete(old);
      }
      if (element.matches('.mermaid')) {
        const styled = active && enhanced && Boolean(element.querySelector(':scope > svg.mermaid-beauty-diagram'));
        element.classList.toggle('mermaid-beauty-container', styled);
        if (styled) styledContainers.add(element);
        else styledContainers.delete(element);
      }
      result.bindFunctions?.(element);
    },
  });
  const wrapper: RenderFunction = async function (id, text, container) {
    const native = async (): Promise<RenderResult> => {
      const result = await previous.call(host, id, text, container);
      return active ? bindContainer(result, false) : result;
    };
    if (!active || !shouldEnhance(readSettings(), diagramType(text))) return native();
    try {
      const result = await render(id, text, container);
      return active ? bindContainer(result, true) : native();
    } catch (error) {
      if (active) onFallback(error);
      return native();
    }
  };
  host.render = wrapper;
  return () => {
    active = false;
    for (const element of styledContainers) element.classList.remove('mermaid-beauty-container');
    styledContainers.clear();
    // A later plugin may wrap us. Leave that wrapper intact, and make this one a pass-through.
    if (host.render === wrapper) host.render = previous;
  };
}
