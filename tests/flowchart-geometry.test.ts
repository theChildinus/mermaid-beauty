import { describe, expect, it } from 'vitest';
import type { Edge, LayoutData, Node } from 'mermaid/dist/rendering-util/types.js';
import { automaticFlowchartCards, flowchartCardWidths, straightenFlowchartEdges } from '../src/flowchart-geometry';

const card = (id: string, extra: Partial<Node> = {}): Node => ({ id, isGroup: false, shape: 'rect', ...extra } as Node);
const data = (nodes: Node[], edges: Edge[] = []): LayoutData => ({ nodes, edges, config: { layout: 'beauty-flowchart' } });
function jog(): LayoutData {
  return data([card('source', { x: 50, y: 50, width: 100, height: 60 }), card('target', { x: 300, y: 56, width: 100, height: 60 })],
    [{ id: 'connection', start: 'source', end: 'target', points: [{ x: 100, y: 50 }, { x: 165, y: 50 }, { x: 165, y: 56 }, { x: 250, y: 56 }] }]);
}

describe('flowchart cards', () => {
  it('captures only auto-sized plain rectangles before measurement', () => {
    const layout = data([card('auto'), card('fixed', { width: 200 }), card('styled', { cssCompiledStyles: ['fill:red;width:180px'] }),
      card('decision', { shape: 'diamond' }), card('rough', { look: 'handDrawn' }), { id: 'group', isGroup: true }]);
    expect([...automaticFlowchartCards(layout)]).toEqual(['auto']);
    layout.config.layout = 'elk';
    expect(automaticFlowchartCards(layout).size).toBe(0);
  });

  it('equalizes one layer without stretching later layers, other groups or authored widths', () => {
    const graph = { id: 'root', layoutOptions: { 'elk.direction': 'RIGHT' }, children: [
      { id: 'stage', children: [
        { id: 'short', x: 25, y: 0, width: 80, height: 60 }, { id: 'long', x: 0, y: 110, width: 140, height: 60 },
        { id: 'later', x: 220, y: 0, width: 220, height: 60 }, { id: 'fixed', x: 0, y: 220, width: 400, height: 60 },
      ] }, { id: 'other', children: [{ id: 'separate', x: 0, y: 0, width: 60, height: 60 }] },
    ] };
    expect([...flowchartCardWidths(graph, new Set(['short', 'long', 'later', 'separate']))]).toEqual([['short', 140]]);
  });

  it('uses the local direction of a nested group', () => {
    const graph = { id: 'root', layoutOptions: { 'elk.direction': 'LEFT' }, children: [{ id: 'nested', layoutOptions: { 'elk.direction': 'UP' }, children: [
      { id: 'a', x: 0, y: 0, width: 80, height: 60 }, { id: 'b', x: 160, y: 0, width: 160, height: 60 },
      { id: 'later', x: 0, y: 130, width: 240, height: 60 },
    ] }] };
    expect([...flowchartCardWidths(graph, new Set(['a', 'b', 'later']))]).toEqual([['a', 160]]);
  });
});

describe('safe flowchart jog removal', () => {
  it('straightens a tiny jog and keeps the same nodes, edges and arrow semantics', () => {
    const layout = jog();
    Object.assign(layout.edges[0]!, { arrowTypeStart: 'circle', arrowTypeEnd: 'point', label: 'continue', width: 50, height: 20 });
    straightenFlowchartEdges(layout);
    expect(layout.edges[0]).toMatchObject({ id: 'connection', start: 'source', end: 'target', arrowTypeStart: 'circle', arrowTypeEnd: 'point',
      points: [{ x: 100, y: 53 }, { x: 250, y: 53 }], x: 175, y: 53 });
    expect(layout.nodes.map(node => [node.x, node.y])).toEqual([[50, 50], [300, 56]]);
  });

  it.each(['LR', 'RL', 'TB', 'BT'])('handles %s without depending on IDs or graph direction', direction => {
    const layout = jog();
    const vertical = direction === 'TB' || direction === 'BT', reverse = direction === 'RL' || direction === 'BT';
    for (const node of layout.nodes) {
      if (reverse) node.x = -node.x!;
      if (vertical) { [node.x, node.y] = [node.y, node.x]; [node.width, node.height] = [node.height, node.width]; }
    }
    for (const point of layout.edges[0]!.points!) {
      if (reverse) point.x = -point.x;
      if (vertical) [point.x, point.y] = [point.y, point.x];
    }
    straightenFlowchartEdges(layout);
    const points = layout.edges[0]!.points!;
    expect(points).toHaveLength(2);
    expect(points[0]![vertical ? 'x' : 'y']).toBe(points[1]![vertical ? 'x' : 'y']);
  });

  it.each(['node', 'label', 'group', 'crossing', 'overlap'])('keeps the route when straightening would hit a %s', obstacle => {
    const layout = jog();
    const original = structuredClone(layout.edges[0]!.points);
    if (obstacle === 'node') layout.nodes.push(card('obstacle', { x: 200, y: 53, width: 20, height: 20 }));
    if (obstacle === 'group') layout.nodes.push({ id: 'unrelated', isGroup: true, x: 200, y: 53, width: 20, height: 20 });
    if (obstacle === 'label') layout.edges.push({ id: 'label', label: 'busy', x: 200, y: 53, width: 20, height: 20 });
    if (obstacle === 'crossing') layout.edges.push({ id: 'other', points: [{ x: 200, y: 51 }, { x: 200, y: 55 }] });
    if (obstacle === 'overlap') layout.edges.push({ id: 'other', points: [{ x: 180, y: 53 }, { x: 220, y: 53 }] });
    straightenFlowchartEdges(layout);
    expect(layout.edges[0]!.points).toEqual(original);
  });

  it.each(['semantic shape', 'disabled', 'explicit layout', 'feedback', 'large jog', 'label too wide', 'corner'])('preserves %s', reason => {
    const layout = jog();
    if (reason === 'semantic shape') layout.nodes[1]!.shape = 'diamond';
    if (reason === 'disabled') layout.config.elk = { straightenEdges: false };
    if (reason === 'explicit layout') layout.config.layout = 'dagre';
    if (reason === 'feedback') layout.edges[0]!.points![1]!.x = 90;
    if (reason === 'large jog') { layout.edges[0]!.points![2]!.y = 80; layout.edges[0]!.points![3]!.y = 80; }
    if (reason === 'label too wide') Object.assign(layout.edges[0]!, { label: 'too wide', width: 300, height: 20 });
    if (reason === 'corner') { layout.nodes[0]!.height = 12; layout.nodes[1]!.height = 12; }
    const original = structuredClone(layout.edges[0]!.points);
    straightenFlowchartEdges(layout);
    expect(layout.edges[0]!.points).toEqual(original);
  });

  it('does not move an edge label onto an existing crossing', () => {
    const layout = jog();
    Object.assign(layout.edges[0]!, { label: 'continue', width: 40, height: 20, x: 125, y: 50 });
    layout.edges.push({ id: 'crossing', points: [{ x: 175, y: 0 }, { x: 175, y: 100 }] });
    const original = structuredClone(layout.edges[0]);
    straightenFlowchartEdges(layout);
    expect(layout.edges[0]).toEqual(original);
  });
});
