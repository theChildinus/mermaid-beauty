import { seriesColors, tint } from './chart-theme';
import type { Colors } from './colors';
import type { Appearance, DiagramType } from './settings';

// These renderers allocate native color slots without changing node semantics.
export const MULTICOLOR_TYPES = new Set<DiagramType>([
  'flowchart', 'sequence', 'class', 'state', 'er', 'requirement', 'block', 'swimlane', 'agentflow', 'usecase',
]);

export function componentPalette(c: Colors, dark: boolean): { fills: string[]; borders: string[] } {
  const series = seriesColors(c, dark);
  if (c.componentFills) return { borders: c.componentBorders ? [...c.componentBorders] : series.slice(0, c.componentFills.length), fills: [...c.componentFills] };
  const borders = [0, 6, 2, 1, 3, 4].map(index => series[index]!);
  return { borders, fills: borders.map(color => tint(color, c.background, dark ? 0.15 : 0.12)) };
}

/** Keep explicit colors authoritative even when Mermaid reads its palette arrays. */
export function componentTheme(c: Colors, appearance: Appearance, dark: boolean, type: DiagramType,
  authored: Record<string, unknown>): Record<string, unknown> {
  const { fills, borders } = componentPalette(c, dark);
  const custom = appearance.useCustomColors === false ? undefined : appearance.colors?.[dark ? 'dark' : 'light'];
  const fillKeys = type === 'sequence' ? ['actorBkg'] : type === 'requirement'
    ? ['requirementBackground', 'mainBkg', 'primaryColor'] : ['mainBkg', 'primaryColor'];
  const borderKeys = type === 'sequence' ? ['actorBorder'] : type === 'requirement'
    ? ['requirementBorderColor', 'nodeBorder', 'primaryBorderColor'] : ['nodeBorder', 'primaryBorderColor'];
  const explicitFill = fillKeys.map(key => authored[key]).find(value => typeof value === 'string') ?? custom?.surface;
  const explicitBorder = borderKeys.map(key => authored[key]).find(value => typeof value === 'string') ?? custom?.border;
  return {
    bkgColorArray: fills.map(fill => explicitFill ?? fill),
    borderColorArray: borders.map(border => explicitBorder ?? border),
    // Suppress Redux decorations; Beauty keeps control of geometry and typography.
    nodeShadow: false, dropShadow: 'none', useGradient: false,
    mainBkg: authored.mainBkg ?? authored.primaryColor ?? c.surface, nodeBorder: c.border,
    secondaryColor: custom?.label ?? fills[2], secondaryTextColor: c.text, secondaryBorderColor: borders[2],
    tertiaryColor: custom?.label ?? fills[1], tertiaryTextColor: c.text, tertiaryBorderColor: borders[1],
    clusterBkg: custom?.label ?? tint(borders[1]!, c.background, dark ? 0.07 : 0.05),
    clusterBorder: custom?.border ?? borders[1],
    activationBkgColor: custom?.surface ?? fills[2], activationBorderColor: custom?.border ?? borders[2],
    noteBkgColor: custom?.label ?? fills[3], noteBorderColor: custom?.border ?? borders[3], noteTextColor: c.text,
    // Redux supplies white label boxes and table rows even in dark mode.
    requirementEdgeLabelBackground: c.label, erEdgeLabelBackground: c.label,
    rowOdd: c.background, rowEven: c.label, attributeBackgroundColorOdd: c.background, attributeBackgroundColorEven: c.label,
    compositeBackground: c.background, altBackground: c.label,
  };
}
