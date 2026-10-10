import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Mermaid 12 bypasses insertEdgeLabel from its layout helper argument. This
// narrowly scoped build patch measures capsule labels before ELK, without
// changing installed dependency files. Fail closed if an upgrade moves the seam.
export const mermaidLayoutPatch = {
  name: 'mermaid-beauty-label-measurement',
  setup(build) {
    // Capture Mermaid's own graph before either layout rewrites it; apply colors
    // after shapes exist. This avoids reparsing source or using deprecated APIs.
    build.onLoad({ filter: /mermaid\/dist\/chunks\/mermaid\.core\/chunk-7M6MHVWA\.mjs$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8');
      const before = '  await render(data4Layout, svg);';
      if (source.split(before).length !== 2) throw new Error('Mermaid flowchart graph seam changed. Review the pinned engine before building.');
      const after = '  const beautyGroups = flowchartGroupsForLayout(data4Layout);\n' + before +
        '\n  styleFlowchartColors(svg.node(), data4Layout.config, beautyGroups);';
      return { contents: `import { flowchartGroupsForLayout, styleFlowchartColors } from ${JSON.stringify(resolve('src/flowchart-colors.ts'))};\n` + source.replace(before, after), loader: 'js' };
    });
    // SVG node labels are left-anchored in Mermaid 12; center their actual
    // measured box before shape/layout calculation (including font bearings).
    const sharedLabelEdits = [
      { file: 'chunk-7INBJB4K', edits: [
        ['labelEl.attr("transform", "translate(0, " + -bbox.height / 2 + ")");',
         'labelEl.attr("transform", "translate(" + (-bbox.x - bbox.width / 2) + ", " + (-bbox.y - bbox.height / 2) + ")");', 2],
        ['kanbanNode.width = (kanbanNode.width ?? 200) - 10;', 'kanbanNode.width = (kanbanNode.width ?? 200) - 20;', 1],
      ] },
      // These defaults bypass theme variables upstream. Keep authored styles.
      { file: 'c4Diagram-YGBWAQC7', edits: [
        ['rel.textColor ? rel.textColor : "#444444"', 'rel.textColor ? rel.textColor : getConfig().themeVariables.textColor', 1],
        ['rel.lineColor ? rel.lineColor : "#444444"', 'rel.lineColor ? rel.lineColor : getConfig().themeVariables.lineColor', 1],
      ] },
      { file: 'wardleyDiagram-VNRHLVJA', edits: [
        ['.attr("stroke", "#000").attr("stroke-width", 1).attr("stroke-dasharray", "5 5")', '.attr("stroke", theme.gridColor).attr("stroke-width", 1).attr("stroke-dasharray", "5 5")', 1],
        ['if (node.className === "anchor") {\n      return "#000";', 'if (node.className === "anchor") {\n      return theme.componentLabelColor;', 1],
        ['.attr("fill", "#eee").attr("stroke", "#000")', '.attr("fill", theme.componentFill).attr("stroke", theme.componentStroke)', 1],
      ] },
      { file: 'vennDiagram-UO4OBE2U', edits: [
        ['customStyle?.color || (themeDark ? lighten(baseColor, 30) : darken(baseColor, 30))', 'customStyle?.color || themeVariables.vennSetTextColor || (themeDark ? lighten(baseColor, 30) : darken(baseColor, 30))', 1],
      ] },
    ];
    for (const edit of sharedLabelEdits) build.onLoad({ filter: new RegExp(`mermaid/dist/chunks/mermaid\\.core/${edit.file}\\.mjs$`) }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      for (const [before, after, count] of edit.edits) {
        if (contents.split(before).length !== count + 1) throw new Error(`Mermaid theme/layout seam changed in ${edit.file}. Review the pinned engine before building.`);
        contents = contents.replaceAll(before, after);
      }
      return { contents, loader: 'js' };
    });
    // Kanban's colors are supplied by themeCSS. Its labels also need usable
    // inner widths and a layout pass before the final SVG bounds are measured.
    const kanbanEdits = [
      { file: 'kanban-definition-PNTS6WVX', before: '  setupGraphViewbox(\n    void 0,',
        after: '  arrangeKanban(svg.node(), data4Layout.nodes, conf);\n  setupGraphViewbox(\n    void 0,',
        import: `import { arrangeKanban } from ${JSON.stringify(resolve('src/kanban-layout.ts'))};\n` },
      { file: 'chunk-UA2S7LBM',
        before: '  const labelEl = shapeSvg.insert("g").attr("class", "cluster-label ");\n  const text = await createText(labelEl, node.label, {\n    style: node.labelStyle,\n    useHtmlLabels,\n    isNode: true,\n    width: node.width\n  });',
        after: '  const labelEl = shapeSvg.insert("g").attr("class", "cluster-label ");\n  const text = await createText(labelEl, node.label, {\n    style: node.labelStyle,\n    useHtmlLabels,\n    isNode: true,\n    width: Math.max(20, node.width - 35)\n  });' },
    ];
    for (const edit of kanbanEdits) build.onLoad({ filter: new RegExp(`mermaid/dist/chunks/mermaid\\.core/${edit.file}\\.mjs$`) }, async ({ path }) => {
      const source = await readFile(path, 'utf8');
      if (source.split(edit.before).length !== 2) throw new Error(`Mermaid Kanban layout changed in ${edit.file}. Review the pinned engine before building.`);
      return { contents: (edit.import ?? '') + source.replace(edit.before, edit.after), loader: 'js' };
    });
    build.onLoad({ filter: /mermaid\/dist\/chunks\/mermaid\.core\/chunk-Z7XXMR3K\.mjs$/ }, async ({ path }) => {
      let contents = await readFile(path, 'utf8');
      const edits = [
        ['width: isMarkdown ? markdownWidth : void 0',
          'width: config.layout === "beauty-flowchart" ? config.flowchart?.wrappingWidth : (isMarkdown ? markdownWidth : void 0)'],
        ['  let bbox;\n  let transformBbox;',
          '  if (config.layout === "beauty-flowchart") measureFlowchartLabel(labelElement, Number(config.fontSize) || 15, config.theme === "redux-color" || config.theme === "redux-dark-color");\n  let bbox;\n  let transformBbox;'],
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
