import { textOnFill, type Colors } from './colors';
import type { DiagramType } from './settings';

export function tint(color: string, background: string, weight: number): string {
  return '#' + [1, 3, 5].map(i => Math.round(parseInt(color.slice(i, i + 2), 16) * weight +
    parseInt(background.slice(i, i + 2), 16) * (1 - weight)).toString(16).padStart(2, '0')).join('');
}

export function seriesColors(c: Colors, dark: boolean): string[] {
  if (c.series) return [c.accent, ...c.series.slice(1)];
  return dark
    ? [c.accent, '#e8b86d', '#a9a1ee', '#75c9d2', '#e99eb6', '#b9cf78', '#a3badf', '#dfab91', '#8ec7aa', '#c5a5d2', '#c7c185', '#9bbec4']
    : [c.accent, '#916020', '#7656a6', '#237986', '#a34e73', '#647c28', '#496caa', '#a45b36', '#38765c', '#87578f', '#7c712d', '#476f78'];
}

/** Explicit series colors prevent Mermaid's base theme from darkening them to black. */
export function chartTheme(c: Colors, dark: boolean, type: DiagramType): Record<string, unknown> {
  const series = seriesColors(c, dark);
  const variables: Record<string, unknown> = {
    archEdgeColor: c.line, archEdgeArrowColor: c.line, archGroupBorderColor: c.border,
    gridColor: c.border,
    packet: { labelColor: c.text, titleColor: c.text, blockFillColor: c.surface, blockStrokeColor: c.border,
      startByteColor: c.text, endByteColor: c.text },
    treeView: { labelColor: c.text, lineColor: c.line, iconColor: c.text, descriptionColor: c.text,
      highlightBg: c.surface, highlightStroke: c.border },
    radar: { axisColor: c.line, graticuleColor: c.border, graticuleOpacity: 0, curveOpacity: 0.12 },
    wardley: { backgroundColor: c.background, axisColor: c.line, axisTextColor: c.text, gridColor: c.border,
      componentFill: c.surface, componentStroke: c.border, componentLabelColor: c.text, linkStroke: c.line,
      evolutionStroke: c.accent, annotationStroke: c.border, annotationTextColor: c.text, annotationFill: c.label },
    cynefin: { complexBg: c.surface, complicatedBg: c.label, chaoticBg: tint(series[4]!, c.background, 0.12),
      clearBg: tint(series[1]!, c.background, 0.12), confusionBg: c.label,
      textColor: c.text, labelColor: c.text, boundaryColor: c.line, arrowColor: c.line, cliffColor: dark ? '#e99b8e' : '#a43e2c' },
    emUiFill: c.surface, emUiStroke: c.border,
    emProcessorFill: tint(series[2]!, c.background, 0.16), emProcessorStroke: series[2],
    emReadModelFill: tint(series[5]!, c.background, 0.16), emReadModelStroke: series[5],
    emCommandFill: tint(series[3]!, c.background, 0.16), emCommandStroke: series[3],
    emEventFill: tint(series[1]!, c.background, 0.16), emEventStroke: series[1],
    emSwimlaneBackgroundOdd: c.label, emSwimlaneBackgroundStroke: c.border,
    treemap: { sectionStrokeColor: c.border, leafStrokeColor: c.border },
    ...(type === 'mindmap' ? { gitBranchLabel0: textOnFill(c.accent, c.text) } : {}),
  };
  series.forEach((color, index) => {
    variables[`cScale${index}`] = type === 'treemap' ? tint(color, c.background, 0.18) : color;
    variables[`cScaleInv${index}`] = c.border;
    variables[`cScalePeer${index}`] = c.border;
    // Treemap renders translucent fills; labels sit over the canvas/section tint.
    variables[`cScaleLabel${index}`] = type === 'treemap' ? c.text : textOnFill(color, c.text);
    variables[`pie${index + 1}`] = color;
    if (index < 8) variables[`git${index}`] = color;
    if (index < 8) variables[`venn${index + 1}`] = color;
  });
  return variables;
}
