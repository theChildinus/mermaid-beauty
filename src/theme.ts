import type { MermaidConfig } from 'mermaid';
import { chartTheme } from './chart-theme';
import { normalizeColor, paletteColors, textOnFill } from './colors';
import { componentPalette, componentTheme, MULTICOLOR_TYPES } from './component-theme';
import { isRecord, type Appearance, type DiagramType } from './settings';

const GRAPH_TYPES = new Set<DiagramType>(['flowchart', 'class', 'state', 'er', 'requirement', 'usecase', 'agentflow']);
export function supportsGraphLayout(type: DiagramType): boolean { return GRAPH_TYPES.has(type); }

export function mergeConfig(base: Record<string, unknown>, extra: Record<string, unknown>): Record<string, unknown> {
  const result = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    result[key] = isRecord(result[key]) && isRecord(value) ? mergeConfig(result[key], value) : value;
  }
  return result;
}

export function themeConfig(appearance: Appearance, type: DiagramType, dark: boolean, extra: Record<string, unknown> = {}): MermaidConfig {
  const c = paletteColors(appearance, dark);
  const charts = chartTheme(c, dark, type);
  const extraVariables = isRecord(extra.themeVariables) ? extra.themeVariables : {};
  const multicolor = appearance.colorStyle === 'multi';
  const numberBackground = normalizeColor(extraVariables.signalColor) ?? c.line;
  const font = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const config: MermaidConfig = {
    startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true,
    secure: ['securityLevel', 'secure', 'startOnLoad', 'maxTextSize', 'maxEdges', 'suppressErrorRendering'],
    maxTextSize: 100_000, maxEdges: 1500,
    theme: multicolor && MULTICOLOR_TYPES.has(type) ? (dark ? 'redux-dark-color' : 'redux-color') : 'base', look: 'classic',
    fontFamily: font, fontSize: appearance.fontSize, htmlLabels: false,
    themeVariables: {
      ...charts,
      darkMode: dark, background: c.background, fontFamily: font, fontSize: `${appearance.fontSize}px`,
      radius: appearance.radius, strokeWidth: 1.25,
      primaryColor: c.surface, primaryTextColor: c.text, primaryBorderColor: c.border,
      secondaryColor: c.label, secondaryTextColor: c.text, secondaryBorderColor: c.border,
      tertiaryColor: c.background, tertiaryTextColor: c.text, tertiaryBorderColor: c.border,
      lineColor: c.line, textColor: c.text,
      clusterBkg: c.label, clusterBorder: c.border, edgeLabelBackground: c.label,
      actorBkg: c.surface, actorBorder: c.border, actorTextColor: c.text, actorLineColor: c.line,
      signalColor: c.line, signalTextColor: c.text, labelBoxBkgColor: c.label,
      labelBoxBorderColor: c.border, labelTextColor: c.text, loopTextColor: c.text,
      // Sequence number badges use signalColor as their fill, unlike actor labels.
      activationBkgColor: c.surface, activationBorderColor: c.border, sequenceNumberColor: textOnFill(numberBackground, c.text),
      noteBkgColor: c.label, noteBorderColor: c.border, noteTextColor: c.text,
      titleColor: c.text, sectionBkgColor: c.label, altSectionBkgColor: c.background,
      taskBkgColor: c.surface, taskBorderColor: c.border, taskTextColor: c.text,
      taskTextDarkColor: c.text, taskTextOutsideColor: c.text,
      doneTaskBkgColor: c.label, doneTaskBorderColor: c.border,
      activeTaskBkgColor: c.accent, activeTaskBorderColor: c.accent,
      pieTitleTextColor: c.text, pieSectionTextColor: c.text, pieLegendTextColor: c.text,
      pieStrokeColor: c.background, pieOuterStrokeColor: c.border,
      xyChart: { backgroundColor: c.background, titleColor: c.text, legendTextColor: c.text, dataLabelColor: c.text, xAxisTitleColor: c.text, yAxisTitleColor: c.text, xAxisLabelColor: c.text,
        yAxisLabelColor: c.text, xAxisLineColor: c.line, yAxisLineColor: c.line,
        xAxisTickColor: c.line, yAxisTickColor: c.line, plotColorPalette: Array.from({ length: 12 }, (_, i) => String(charts[`cScale${i}`])).join(',') },
      ...(multicolor ? componentTheme(c, appearance, dark, type, extraVariables) : {}),
    },
    flowchart: { htmlLabels: false, useMaxWidth: appearance.fitWidth, nodeSpacing: appearance.spacing,
      rankSpacing: appearance.spacing + 24, padding: 16, minNodeWidth: 0, curve: 'rounded', wrappingWidth: 420 },
    sequence: { useMaxWidth: appearance.fitWidth, actorMargin: appearance.spacing, messageMargin: 32,
      noteMargin: 16, boxMargin: 16, actorFontSize: appearance.fontSize, messageFontSize: appearance.fontSize, noteFontSize: appearance.fontSize },
    class: { useMaxWidth: appearance.fitWidth }, state: { useMaxWidth: appearance.fitWidth },
    er: { useMaxWidth: appearance.fitWidth }, gantt: { useMaxWidth: appearance.fitWidth },
    pie: { useMaxWidth: appearance.fitWidth }, journey: { useMaxWidth: appearance.fitWidth },
    themeCSS: `
      text, .label { font-family: ${font}; }
      .node text, .edgeLabel text, text.actor, .classTitle, .entityLabel { font-weight: 600; }
      .sequenceNumber { font-weight: 600; }
      .node tspan[font-weight="normal"], .edgeLabel tspan[font-weight="normal"] { font-weight: 600; }
      .node rect, rect.actor, rect.actor-top, rect.actor-bottom, .classGroup rect { rx: ${appearance.radius}px; ry: ${appearance.radius}px; }
      .edgeLabel rect, .edgeLabel .label rect { rx: ${appearance.fontSize}px; ry: ${appearance.fontSize}px; stroke: ${c.border}; stroke-width: 1px; opacity: 1; }
      .flowchart-link, .messageLine0, .messageLine1, .transition { stroke-width: 1.1px; stroke-linecap: round; stroke-linejoin: round; }
      ${type === 'flowchart' ? `.edgeLabel text { font-size: ${Math.max(10, appearance.fontSize - 1)}px; }` : ''}
    `,
  };
  const c4: Record<string, string | number | boolean> = { useMaxWidth: appearance.fitWidth };
  for (const element of ['person', 'system', 'system_db', 'system_queue', 'container', 'container_db', 'container_queue', 'component', 'component_db', 'component_queue']) {
    for (const name of [element, `external_${element}`]) {
      // C4 uses white labels internally, so use a darker surface for adequate contrast.
      c4[`${name}_bg_color`] = dark ? c.surface : c.text;
      c4[`${name}_border_color`] = c.border;
      c4[`${name}FontFamily`] = font;
      c4[`${name}FontSize`] = appearance.fontSize;
    }
  }
  config.c4 = c4;
  config.railroad = { terminalFill: c.surface, terminalStroke: c.border, terminalTextColor: c.text,
    nonTerminalFill: c.label, nonTerminalStroke: c.border, nonTerminalTextColor: c.text,
    commentFill: c.label, commentStroke: c.border, commentTextColor: c.text,
    specialFill: c.surface, specialStroke: c.border, ruleNameColor: c.text, lineColor: c.line, markerFill: c.line };
  if (type === 'flowchart') config.elk = {
    preset: 'legacy', nodePlacementAlignment: 'NONE', straightenEdges: true,
    mergeEdges: false, considerModelOrder: 'NODES_AND_EDGES',
  };
  if (supportsGraphLayout(type)) config.layout = appearance.layout === 'auto' ? 'elk' : appearance.layout;
  if (type === 'flowchart' && config.layout === 'elk') config.layout = 'beauty-flowchart';
  // Keep specialized layouts for timelines, charts, mind maps, and architecture diagrams.
  const merged = mergeConfig(config as Record<string, unknown>, extra) as MermaidConfig;
  const variables = merged.themeVariables as Record<string, string> & { treemap: { leafStrokeColor: string; sectionStrokeColor: string } };
  if (multicolor && ('clusterBkg' in extraVariables || 'clusterBorder' in extraVariables)) merged.themeCSS += `
    .cluster[data-look][data-color-id]:not(.swimlane) > rect,
    .cluster[data-look][data-color-id]:not(.swimlane) > path {
      ${'clusterBkg' in extraVariables ? `fill: ${variables.clusterBkg};` : ''}
      ${'clusterBorder' in extraVariables ? `stroke: ${variables.clusterBorder};` : ''}
    }
  `;
  if (type === 'kanban') {
    const customSections = Object.keys(extraVariables).some(key => /^cScale\d+$/.test(key));
    const customSectionText = Object.keys(extraVariables).some(key => /^cScaleLabel\d+$/.test(key));
    const columnFill = (!multicolor && !customSections) || 'clusterBkg' in extraVariables ? `fill: ${variables.clusterBkg};` : '';
    const columnBorder = (!multicolor && !customSections) || 'clusterBorder' in extraVariables ? `stroke: ${variables.clusterBorder};` : '';
    const headerText = !customSectionText || 'textColor' in extraVariables ? `fill: ${variables.textColor};` : '';
    const cardBorder = 'nodeBorder' in extraVariables ? variables.nodeBorder : variables.primaryBorderColor;
    // Mermaid derives section colors from cScale, which can collapse to black
    // in dark themes. Use the explicit column/node roles instead.
    merged.themeCSS += `
      .sections .cluster > rect { ${columnFill} ${columnBorder} stroke-width: 1.25px; }
      .sections .cluster-label text { ${headerText} font-weight: 600; }
      .items .node > rect { fill: ${variables.primaryColor}; stroke: ${cardBorder}; rx: ${Math.min(appearance.radius, 8)}px; ry: ${Math.min(appearance.radius, 8)}px; }
      .items .node .label { fill: ${variables.primaryTextColor}; color: ${variables.primaryTextColor}; }
      .items .node text, .items .node tspan[font-weight="normal"] { font-weight: 400; }
    `;
    if (multicolor) {
      const { fills, borders } = componentPalette(c, dark);
      const custom = appearance.useCustomColors === false ? undefined : appearance.colors?.[dark ? 'dark' : 'light'];
      for (let i = 0; i < 12; i++) {
        const authoredSection = `cScale${i + 1}` in extraVariables;
        merged.themeCSS += `
          .sections .cluster.section-${i} > rect {
            ${'clusterBkg' in extraVariables || authoredSection ? '' : `fill: ${custom?.label ?? fills[i % fills.length]};`}
            ${'clusterBorder' in extraVariables || authoredSection ? '' : `stroke: ${custom?.border ?? borders[i % borders.length]};`}
          }
          .sections .cluster.section-${i} .cluster-label text {
            ${`cScaleLabel${i + 1}` in extraVariables && !('textColor' in extraVariables) ? '' : `fill: ${variables.textColor};`}
          }
        `;
      }
    }
  }
  if (type === 'sankey') merged.themeCSS += `
    .links .link { mix-blend-mode: normal !important; }
    .nodes .node rect { rx: 0; ry: 0; stroke: ${variables.lineColor}; stroke-width: 1px; }
    .node-labels text { fill: ${variables.textColor}; paint-order: stroke; stroke: ${variables.background}; stroke-width: 4px; stroke-linejoin: round; }
  `;
  if (type === 'timeline') merged.themeCSS += `.lineWrapper line { stroke: ${variables.lineColor}; }`;
  if (type === 'journey') merged.themeCSS += `.journey-section, .task { stroke: ${variables.primaryBorderColor}; }`;
  if (type === 'treemap') merged.themeCSS += `
    .treemapLeaf { stroke: ${variables.treemap.leafStrokeColor}; }
    rect.treemapSection { stroke: ${variables.treemap.sectionStrokeColor}; stroke-opacity: 1; }
  `;
  return merged;
}
