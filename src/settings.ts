import { COLOR_FIELDS, normalizeColor, type CustomColors } from './colors';

export const DIAGRAM_TYPES = {
  flowchart: 'Flowchart', sequence: 'Sequence', class: 'Class', state: 'State',
  er: 'Entity relationship', gantt: 'Gantt', pie: 'Pie', mindmap: 'Mind map',
  timeline: 'Timeline', journey: 'User journey', git: 'Git graph',
  quadrant: 'Quadrant', requirement: 'Requirement', c4: 'C4',
  sankey: 'Sankey', xy: 'XY chart', block: 'Block', packet: 'Packet',
  architecture: 'Architecture', kanban: 'Kanban', radar: 'Radar',
  treemap: 'Treemap', venn: 'Venn', railroad: 'Railroad',
  treeview: 'Tree view', cynefin: 'Cynefin', swimlane: 'Swimlane',
  usecase: 'Use case', agentflow: 'Agent flow', eventmodeling: 'Event modeling',
  ishikawa: 'Ishikawa', wardley: 'Wardley map', zenuml: 'ZenUML', info: 'Version info',
  other: 'Other / future types',
} as const;
export type DiagramType = keyof typeof DIAGRAM_TYPES;
export const PALETTES = { mint: 'Mint', slate: 'Slate', sky: 'Sky', rose: 'Rose' } as const;
export type PaletteName = keyof typeof PALETTES;
export type LayoutName = 'auto' | 'elk' | 'dagre';
export type RenderMode = 'inherit' | 'beauty' | 'native';
export interface Appearance {
  palette: PaletteName;
  colors?: CustomColors;
  fontSize: number;
  radius: number;
  spacing: number;
  layout: LayoutName;
  fitWidth: boolean;
}
export interface TypeSettings extends Partial<Appearance> {
  mode?: RenderMode;
  /** Colors and diagram options, never JavaScript or executable callbacks. */
  config?: string;
}
export interface BeautySettings {
  enabled: boolean;
  defaults: Appearance;
  types: Partial<Record<DiagramType, TypeSettings>>;
}
export const DEFAULT_SETTINGS: BeautySettings = {
  enabled: true,
  defaults: { palette: 'mint', fontSize: 15, radius: 14, spacing: 48, layout: 'auto', fitWidth: true },
  types: {},
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function bounded(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
function appearance(value: unknown): Partial<Appearance> {
  if (!isRecord(value)) return {};
  const result: Partial<Appearance> = {};
  if (typeof value.palette === 'string' && Object.hasOwn(PALETTES, value.palette)) result.palette = value.palette as PaletteName;
  if (isRecord(value.colors)) {
    const colors: CustomColors = {};
    for (const mode of ['light', 'dark'] as const) {
      const saved = value.colors[mode];
      if (!isRecord(saved)) continue;
      for (const key of Object.keys(COLOR_FIELDS) as (keyof typeof COLOR_FIELDS)[]) {
        const color = normalizeColor(saved[key]);
        if (color) (colors[mode] ??= {})[key] = color;
      }
    }
    if (Object.keys(colors).length) result.colors = colors;
  }
  if (bounded(value.fontSize, 10, 28)) result.fontSize = value.fontSize;
  if (bounded(value.radius, 0, 24)) result.radius = value.radius;
  if (bounded(value.spacing, 20, 120)) result.spacing = value.spacing;
  if (value.layout === 'auto' || value.layout === 'elk' || value.layout === 'dagre') result.layout = value.layout;
  if (typeof value.fitWidth === 'boolean') result.fitWidth = value.fitWidth;
  return result;
}
export function loadSettings(value: unknown): BeautySettings {
  const result: BeautySettings = { enabled: true, defaults: { ...DEFAULT_SETTINGS.defaults }, types: {} };
  if (!isRecord(value)) return result;
  result.enabled = typeof value.enabled === 'boolean' ? value.enabled : true;
  result.defaults = { ...result.defaults, ...appearance(value.defaults) };
  if (isRecord(value.types)) {
    for (const key of Object.keys(DIAGRAM_TYPES) as DiagramType[]) {
      const saved = value.types[key];
      if (!isRecord(saved)) continue;
      const item: TypeSettings = appearance(saved);
      if (saved.mode === 'inherit' || saved.mode === 'beauty' || saved.mode === 'native') item.mode = saved.mode;
      if (typeof saved.config === 'string') item.config = saved.config;
      result.types[key] = item;
    }
  }
  return result;
}
export function resolveAppearance(settings: BeautySettings, type: DiagramType): Appearance {
  const override = appearance(settings.types[type]);
  // Choosing a per-type preset starts from that preset, while individual color
  // overrides inherit any other global colors until a preset is chosen.
  const colors = override.palette ? override.colors : {
    light: { ...settings.defaults.colors?.light, ...override.colors?.light },
    dark: { ...settings.defaults.colors?.dark, ...override.colors?.dark },
  };
  return { ...settings.defaults, ...override, colors };
}
export function shouldEnhance(settings: BeautySettings, type: DiagramType): boolean {
  return settings.enabled && settings.types[type]?.mode !== 'native';
}

/** Only classify the declaration; the complete Mermaid parser still validates the source. */
export function diagramType(source: string): DiagramType {
  const text = source.replace(/^\uFEFF/, '').trimStart()
    .replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')
    .replace(/%%\{[\s\S]*?\}%%/g, '')
    .replace(/^\s*%%[^\n]*(?:\n|$)/gm, '').trimStart();
  const token = /^[a-zA-Z][\w-]*/.exec(text)?.[0].toLowerCase() ?? '';
  const aliases: Record<string, DiagramType> = {
    graph: 'flowchart', flowchart: 'flowchart', 'flowchart-elk': 'flowchart', sequencediagram: 'sequence',
    classdiagram: 'class', statediagram: 'state', 'statediagram-v2': 'state',
    erdiagram: 'er', gitgraph: 'git', quadrantchart: 'quadrant',
    requirementdiagram: 'requirement', 'xychart-beta': 'xy', xychart: 'xy',
    'block-beta': 'block', 'packet-beta': 'packet', 'architecture-beta': 'architecture',
    'radar-beta': 'radar', 'treemap-beta': 'treemap', 'venn-beta': 'venn',
    'cynefin-beta': 'cynefin', 'railroad-beta': 'railroad', 'treeview-beta': 'treeview',
    'swimlane-beta': 'swimlane', 'agentflow-beta': 'agentflow', 'usecase-beta': 'usecase',
    'sankey-beta': 'sankey', 'ishikawa-beta': 'ishikawa', 'wardley-beta': 'wardley',
    'railroad-ebnf-beta': 'railroad', 'railroad-abnf-beta': 'railroad', 'railroad-peg-beta': 'railroad',
  };
  if (token.startsWith('c4')) return 'c4';
  if (aliases[token]) return aliases[token];
  return Object.hasOwn(DIAGRAM_TYPES, token) ? token as DiagramType : 'other';
}

const ALLOWED_CONFIG = new Set([
  'themeVariables', 'elk', 'flowchart', 'sequence', 'class', 'state', 'er', 'gantt', 'pie',
  'mindmap', 'timeline', 'journey', 'gitGraph', 'quadrantChart', 'requirement', 'c4',
  'sankey', 'xyChart', 'block', 'packet', 'architecture', 'kanban', 'radar', 'treemap',
  'venn', 'railroad', 'treeView', 'cynefin', 'swimlane', 'agentflow', 'usecase', 'eventmodeling', 'ishikawa', 'wardley',
]);
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype', 'securityLevel', 'secure', 'themeCSS', 'dompurifyConfig']);
export function parseCustomConfig(text: string): Record<string, unknown> {
  if (!text.trim()) return {};
  if (text.length > 20_000) throw new Error('Custom settings must be shorter than 20,000 characters.');
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) throw new Error('Enter a JSON object.');
  for (const key of Object.keys(value)) {
    if (!ALLOWED_CONFIG.has(key)) throw new Error(`Unsupported option: ${key}. Use themeVariables or diagram-specific options.`);
  }
  const inspect = (entry: unknown, depth: number): void => {
    if (depth > 8) throw new Error('Custom settings are nested too deeply.');
    if (typeof entry === 'string' && /(?:url\s*\(|@import|javascript:|<\/?(?:script|style))/i.test(entry)) {
      throw new Error('External CSS resources and executable content are not supported.');
    }
    if (Array.isArray(entry)) entry.forEach(item => inspect(item, depth + 1));
    if (isRecord(entry)) for (const [key, item] of Object.entries(entry)) {
      if (FORBIDDEN.has(key)) throw new Error(`Unsupported option: ${key}.`);
      inspect(item, depth + 1);
    }
  };
  inspect(value, 0);
  return value;
}
