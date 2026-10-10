import type { Edge, LayoutData, Node } from 'mermaid/dist/rendering-util/types.js';
import { isRecord } from './settings';

type Point = { x: number; y: number };
type Box = { left: number; right: number; top: number; bottom: number };
interface LayoutNode {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: LayoutNode[];
  layoutOptions?: Record<string, string>;
}
const EPS = 0.1;
const isCard = (node: Node): boolean => !node.isGroup && ['rect', 'squareRect', 'roundedRect'].includes(node.shape ?? '') && node.look !== 'handDrawn';

/** Capture authored widths before Mermaid replaces them with measured bounds. */
export function automaticFlowchartCards(data: LayoutData): Set<string> {
  return new Set(data.config.layout === 'beauty-flowchart' ? data.nodes.filter(node => isCard(node) && !node.width &&
    ![...(node.cssStyles ?? []), ...(node.cssCompiledStyles ?? [])].some(style => /(?:^|;)\s*(?:min-|max-)?width\s*:/i.test(style))).map(node => node.id) : []);
}

/** Use ELK's measured layers, including nested groups and local directions. */
export function flowchartCardWidths(graph: LayoutNode, automatic: ReadonlySet<string>): Map<string, number> {
  const widths = new Map<string, number>();
  function visit(parent: LayoutNode, inheritedDirection: string): void {
    const direction = parent.layoutOptions?.['elk.direction'] ?? inheritedDirection;
    const horizontal = direction === 'RIGHT' || direction === 'LEFT';
    const axis = horizontal ? 'x' : 'y', extent = horizontal ? 'width' : 'height';
    const cards = (parent.children ?? []).filter(node => !node.children && automatic.has(node.id) &&
      Number.isFinite(node[axis]) && (node.width ?? 0) > 0 && (node.height ?? 0) > 0)
      .sort((a, b) => a[axis]! - b[axis]! || a.id.localeCompare(b.id));
    let layer: LayoutNode[] = [], end = -Infinity;
    const flush = (): void => {
      if (layer.length < 2) return;
      const width = Math.max(...layer.map(node => node.width!));
      for (const node of layer) if (width - node.width! > EPS) widths.set(node.id, width);
    };
    for (const node of cards) {
      if (node[axis]! >= end - EPS) { flush(); layer = []; end = Infinity; }
      layer.push(node);
      // Require a shared interval, rather than chaining adjacent layers together.
      end = Math.min(end, node[axis]! + node[extent]!);
    }
    flush();
    for (const child of parent.children ?? []) if (child.children) visit(child, direction);
  }
  visit(graph, 'DOWN');
  return widths;
}

/** Expand plain rectangles before the final routing pass; labels stay centered. */
export function sizeFlowchartCards(data: LayoutData, graph: LayoutNode, root: Element, automatic: ReadonlySet<string>): boolean {
  const widths = flowchartCardWidths(graph, automatic);
  const elements = new Map([...root.querySelectorAll('.node')].map(element => [element.id, element]));
  let changed = false;
  for (const node of data.nodes) {
    const width = widths.get(node.id);
    const rect = elements.get(node.domId ?? '')?.querySelector<SVGRectElement>(':scope > rect.label-container');
    if (width === undefined || !rect) continue;
    node.width = width;
    rect.setAttribute('width', String(width));
    rect.setAttribute('x', String(-width / 2));
    changed = true;
  }
  return changed;
}

function bounds(node: { x?: number; y?: number; width?: number; height?: number }, margin = 0): Box | undefined {
  if (![node.x, node.y, node.width, node.height].every(value => typeof value === 'number' && Number.isFinite(value))) return;
  return { left: node.x! - node.width! / 2 - margin, right: node.x! + node.width! / 2 + margin,
    top: node.y! - node.height! / 2 - margin, bottom: node.y! + node.height! / 2 + margin };
}
const overlaps = (a: Box, b: Box): boolean => a.left < b.right - EPS && a.right > b.left + EPS && a.top < b.bottom - EPS && a.bottom > b.top + EPS;
const lineBox = (a: Point, b: Point, margin = 0): Box => ({ left: Math.min(a.x, b.x) - margin, right: Math.max(a.x, b.x) + margin,
  top: Math.min(a.y, b.y) - margin, bottom: Math.max(a.y, b.y) + margin });
function axis(a: Point, b: Point): 'x' | 'y' | undefined {
  if (Math.abs(a.y - b.y) < EPS && Math.abs(a.x - b.x) > EPS) return 'x';
  if (Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) > EPS) return 'y';
}
function routeConflicts(points: Point[], route: Point[]): number {
  let conflicts = 0;
  for (let i = 1; i < points.length; i++) for (let j = 1; j < route.length; j++) {
    const a = points[i - 1]!, b = points[i]!, c = route[j - 1]!, d = route[j]!;
    if (!overlaps(lineBox(a, b, EPS), lineBox(c, d, EPS))) continue;
    if (axis(a, b) === axis(c, d)) {
      // Collinear runs must not become a shared line that hides distinct edges.
      conflicts++;
    } else {
      const side = (o: Point, p: Point, q: Point): number => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
      if (side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0) conflicts++;
    }
  }
  return conflicts;
}

/** Remove only small monotone jogs with safe ports, labels and clear sightlines. */
export function straightenFlowchartEdges(data: LayoutData): void {
  if (data.config.layout !== 'beauty-flowchart' || data.config.elk?.straightenEdges === false) return;
  const nodes = new Map(data.nodes.map(node => [node.id, node]));
  const variables: unknown = data.config.themeVariables;
  const radius = isRecord(variables) ? Number(variables.radius) || 0 : 0;
  for (const edge of data.edges) {
    const points = edge.points;
    const source = nodes.get(edge.start ?? ''), target = nodes.get(edge.end ?? '');
    if (!points || points.length < 3 || !source || !target || source === target || !isCard(source) || !isCard(target) || edge.labelNodeId || edge.isLayoutOnly) continue;
    const a = points[0]!, b = points.at(-1)!;
    const along = axis(a, points[1]!);
    if (!along || axis(points.at(-2)!, b) !== along) continue;
    const across = along === 'x' ? 'y' : 'x';
    const jog = Math.abs(b[across] - a[across]);
    if (jog < EPS || jog > 12) continue;
    const forward = Math.sign(b[along] - a[along]);
    if (!forward || points.some((point, index) => index > 0 &&
      (!axis(points[index - 1]!, point) || forward * (point[along] - points[index - 1]![along]) < -EPS)) ||
      points.some(point => Math.abs(point[across] - a[across]) > jog + EPS)) continue;
    const from = bounds(source), to = bounds(target);
    if (!from || !to) continue;
    const near = along === 'x' ? 'left' : 'top', far = along === 'x' ? 'right' : 'bottom';
    if (Math.abs(a[along] - from[forward > 0 ? far : near]) > EPS || Math.abs(b[along] - to[forward > 0 ? near : far]) > EPS) continue;
    const margin = Math.max(8, radius, source.rx ?? 0, target.rx ?? 0);
    const lo = Math.max(along === 'x' ? from.top : from.left, along === 'x' ? to.top : to.left) + margin;
    const hi = Math.min(along === 'x' ? from.bottom : from.right, along === 'x' ? to.bottom : to.right) - margin;
    const level = (a[across] + b[across]) / 2;
    if (lo > hi || level < lo || level > hi) continue;
    const candidate = [{ ...a, [across]: level }, { ...b, [across]: level }];
    const ancestors = new Set<string>();
    for (const endpoint of [source, target]) {
      let parent = endpoint.parentId;
      while (parent && !ancestors.has(parent)) { ancestors.add(parent); parent = nodes.get(parent)?.parentId; }
    }
    const obstacles: Box[] = [];
    for (const node of data.nodes) {
      if (node === source || node === target) continue;
      const box = bounds(node, 4);
      if (!box) continue;
      if (node.isGroup && ancestors.has(node.id)) box.bottom = box.top + (node.labelBBox?.height ?? 20) + 16;
      obstacles.push(box);
    }
    for (const other of data.edges) if (other !== edge && other.label) {
      const box = bounds(other, 4);
      if (box) obstacles.push(box);
    }
    const line = lineBox(candidate[0]!, candidate[1]!, 1);
    if (obstacles.some(box => overlaps(line, box))) continue;
    const labelPosition = { x: (candidate[0]!.x + candidate[1]!.x) / 2, y: (candidate[0]!.y + candidate[1]!.y) / 2 };
    if (edge.label && !canPlaceLabel(edge, labelPosition, obstacles, from, to, data.edges)) continue;
    if (data.edges.some(other => other !== edge && other.points && routeConflicts(candidate, other.points) > routeConflicts(points, other.points))) continue;
    edge.points = candidate;
    if (edge.label) Object.assign(edge, labelPosition);
  }
}

function canPlaceLabel(edge: Edge, position: Point, obstacles: Box[], from: Box, to: Box, edges: Edge[]): boolean {
  const box = bounds({ ...edge, ...position }, 4);
  if (!box || [...obstacles, from, to].some(obstacle => overlaps(box, obstacle))) return false;
  return !edges.some(other => other !== edge && other.points?.some((point, index, route) =>
    index > 0 && overlaps(box, lineBox(route[index - 1]!, point, 1))));
}
