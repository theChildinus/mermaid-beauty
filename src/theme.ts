import type { MermaidConfig } from 'mermaid';
import { isRecord, type Appearance, type DiagramType, type PaletteName } from './settings';

interface Colors { background: string; surface: string; label: string; text: string; border: string; line: string; accent: string; }
const LIGHT: Record<PaletteName, Colors> = {
  mint: { background: '#ffffff', surface: '#ddf3e7', label: '#effaf4', text: '#176b42', border: '#afd7c1', line: '#8b9690', accent: '#26845b' },
  slate: { background: '#ffffff', surface: '#edf0f5', label: '#f7f8fa', text: '#354158', border: '#c1cbd8', line: '#8993a3', accent: '#536783' },
  sky: { background: '#ffffff', surface: '#e1effc', label: '#f1f7ff', text: '#225c95', border: '#b1cee9', line: '#869daf', accent: '#367db9' },
  rose: { background: '#ffffff', surface: '#f8e5ed', label: '#fff4f8', text: '#934360', border: '#dfb5c6', line: '#a5929a', accent: '#aa5375' },
};
const DARK: Record<PaletteName, Colors> = {
  mint: { background: '#171c1a', surface: '#203e32', label: '#1b2e26', text: '#b3e4cb', border: '#416b55', line: '#819c8d', accent: '#79cba1' },
  slate: { background: '#191c22', surface: '#2b3445', label: '#222936', text: '#d6dfef', border: '#526177', line: '#98a3b5', accent: '#abc0e2' },
  sky: { background: '#171d24', surface: '#233b53', label: '#1e2c3b', text: '#b9dcff', border: '#436c91', line: '#8aa4bc', accent: '#86bfee' },
  rose: { background: '#21191d', surface: '#482d3b', label: '#33222b', text: '#f4cbdd', border: '#80546a', line: '#b395a5', accent: '#e39eba' },
};
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
  const c = (dark ? DARK : LIGHT)[appearance.palette];
  const font = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const config: MermaidConfig = {
    startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true,
    secure: ['securityLevel', 'secure', 'startOnLoad', 'maxTextSize', 'maxEdges', 'suppressErrorRendering'],
    maxTextSize: 100_000, maxEdges: 1500, theme: 'base', look: 'classic',
    fontFamily: font, fontSize: appearance.fontSize, htmlLabels: false,
    themeVariables: {
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
      activationBkgColor: c.surface, activationBorderColor: c.border, sequenceNumberColor: c.text,
      noteBkgColor: c.label, noteBorderColor: c.border, noteTextColor: c.text,
      titleColor: c.text, sectionBkgColor: c.label, altSectionBkgColor: c.background,
      taskBkgColor: c.surface, taskBorderColor: c.border, taskTextColor: c.text,
      taskTextDarkColor: c.text, taskTextOutsideColor: c.text,
      doneTaskBkgColor: c.label, doneTaskBorderColor: c.border,
      activeTaskBkgColor: c.accent, activeTaskBorderColor: c.accent,
      pieTitleTextColor: c.text, pieSectionTextColor: c.text, pieLegendTextColor: c.text,
      pieStrokeColor: c.background, pieOuterStrokeColor: c.border,
      pie1: c.surface, pie2: c.border, pie3: c.label, pie4: c.accent,
      git0: c.accent, git1: c.border, git2: c.surface,
      xyChart: { backgroundColor: c.background, titleColor: c.text, xAxisLabelColor: c.text,
        yAxisLabelColor: c.text, xAxisLineColor: c.line, yAxisLineColor: c.line,
        xAxisTickColor: c.line, yAxisTickColor: c.line, plotColorPalette: `${c.accent},${c.border},${c.line}` },
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
  if (type === 'flowchart') config.elk = {
    preset: 'legacy', nodePlacementAlignment: 'NONE', straightenEdges: true,
    mergeEdges: false, considerModelOrder: 'NODES_AND_EDGES',
  };
  if (supportsGraphLayout(type)) config.layout = appearance.layout === 'auto' ? 'elk' : appearance.layout;
  if (type === 'flowchart' && config.layout === 'elk') config.layout = 'beauty-flowchart';
  // Keep specialized layouts for timelines, charts, mind maps, and architecture diagrams.
  return mergeConfig(config as Record<string, unknown>, extra);
}
