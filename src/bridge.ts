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
  const wrapper: RenderFunction = async function (id, text, container) {
    const native = (): Promise<RenderResult> => previous.call(host, id, text, container);
    if (!active || !shouldEnhance(readSettings(), diagramType(text))) return native();
    try {
      const result = await render(id, text, container);
      return active ? result : native();
    } catch (error) {
      if (active) onFallback(error);
      return native();
    }
  };
  host.render = wrapper;
  return () => {
    active = false;
    // A later plugin may wrap us. Leave that wrapper intact, and make this one a pass-through.
    if (host.render === wrapper) host.render = previous;
  };
}
