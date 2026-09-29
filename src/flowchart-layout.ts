import type { LayoutLoaderDefinition } from 'mermaid/dist/rendering-util/render.js';

/** Size cards before ELK allocates ports and routes; retain all semantic shapes. */
export const flowchartLayout: LayoutLoaderDefinition = {
  name: 'beauty-flowchart', algorithm: 'elk.layered',
  loader: async () => {
    const elk = await import('mermaid/dist/chunks/mermaid.core/elk-276RUBZZ.mjs');
    return { render: async (data, svg, helpers, options) => {
      const size = Number(data.config.fontSize) || 15;
      for (const node of data.nodes) {
        if (node.isGroup || !['rect', 'squareRect', 'roundedRect'].includes(node.shape ?? '')) continue;
        // Explicit node dimensions still win. Other shapes keep their native proportions.
        if (!node.height) node.height = size * 4;
      }
      await elk.render(data, svg, helpers, options);
    } };
  },
};
