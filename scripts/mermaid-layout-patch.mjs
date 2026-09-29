import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Mermaid 12 bypasses insertEdgeLabel from its layout helper argument. This
// narrowly scoped build patch measures capsule labels before ELK, without
// changing installed dependency files. Fail closed if an upgrade moves the seam.
export const mermaidLayoutPatch = {
  name: 'mermaid-beauty-label-measurement',
  setup(build) {
    build.onLoad({ filter: /mermaid\/dist\/chunks\/mermaid\.core\/chunk-Z7XXMR3K\.mjs$/ }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      const edits = [
        ['width: isMarkdown ? markdownWidth : void 0',
          'width: config.layout === "beauty-flowchart" ? config.flowchart?.wrappingWidth : (isMarkdown ? markdownWidth : void 0)'],
        ['  let bbox;\n  let transformBbox;',
          '  if (config.layout === "beauty-flowchart") measureFlowchartLabel(labelElement, Number(config.fontSize) || 15);\n  let bbox;\n  let transformBbox;'],
      ];
      for (const [before, after] of edits) {
        if (contents.split(before).length !== 2) throw new Error('Mermaid label measurement changed. Review the pinned engine before building.');
        contents = contents.replace(before, after);
      }
      contents = `import { measureFlowchartLabel } from ${JSON.stringify(resolve('src/flowchart-label.ts'))};\n${contents}`;
      return { contents, loader: 'js' };
    });
  },
};
