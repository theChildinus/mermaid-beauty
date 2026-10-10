import { describe, expect, it } from 'vitest';
import { flowchartSourceId } from '../src/flowchart-colors';
import { flowchartGroups, type FlowchartEdge, type FlowchartNode } from '../src/flowchart-groups';

const graph = (links: string[], nodes: FlowchartNode[] = [], extra: FlowchartEdge[] = []): Map<string, number> => {
  const edges = links.map(link => { const [start, end] = link.split('>'); return { start: start!, end: end! }; });
  const ids = new Set([...edges, ...extra].flatMap(edge => [edge.start, edge.end]));
  return flowchartGroups([...ids].map(id => nodes.find(node => node.id === id) ?? { id }).concat(nodes.filter(node => !ids.has(node.id))), [...edges, ...extra]);
};

describe('structural flowchart colors', () => {
  it('reads source IDs without depending on a render ID or node counter', () => {
    expect(flowchartSourceId('first-flowchart-Order-0', 'first')).toBe('Order');
    expect(flowchartSourceId('second-flowchart-step-2-99', 'second')).toBe('step-2');
    expect(flowchartSourceId('render-flowchart-中文节点-1', 'render')).toBe('中文节点');
  });
  it('keeps a continuous chain in one color, including inserted nodes', () => {
    const before = graph(['A>B', 'B>C']);
    const after = graph(['A>X', 'X>B', 'B>C']);
    expect(new Set(after.values()).size).toBe(1);
    for (const [id, color] of before) expect(after.get(id)).toBe(color);
  });
  it('separates substantial branches while keeping their chains together', () => {
    const colors = graph(['A>B', 'B>C', 'C>D', 'B>E', 'E>F']);
    expect(colors.get('A')).toBe(colors.get('B'));
    expect(colors.get('C')).toBe(colors.get('D'));
    expect(colors.get('E')).toBe(colors.get('F'));
    expect(new Set([colors.get('A'), colors.get('C'), colors.get('E')]).size).toBe(3);
  });
  it('absorbs terminal twigs instead of giving every leaf a new color', () => {
    expect(new Set(graph(['A>B', 'B>C', 'B>D', 'D>E']).values()).size).toBe(1);
  });
  it('keeps joins, cycles, self-loops and bidirectional paths conservative', () => {
    for (const links of [
      ['A>B', 'A>C', 'B>D', 'C>D', 'D>E'],
      ['A>B', 'B>C', 'C>A', 'B>D', 'D>E'],
      ['A>A', 'A>B', 'B>C'],
      ['A>B', 'B>A', 'B>C', 'A>D', 'D>E'],
    ]) expect(new Set(graph(links).values()).size).toBe(1);
  });
  it('keeps independent merge inputs in the downstream branch', () => {
    const colors = graph(['A>B', 'B>C', 'C>D', 'B>E', 'X>E', 'E>F', 'F>G', 'F>H', 'H>I']);
    expect(new Set(colors.values()).size).toBe(3);
    for (const id of ['X', 'F', 'G', 'H', 'I']) expect(colors.get(id)).toBe(colors.get('E'));
  });
  it('ignores dotted references and invisible layout links when finding branches', () => {
    const links = ['A>B', 'B>C', 'C>D', 'B>E', 'E>F'];
    expect(graph(links, [], [{ start: 'B', end: 'F', pattern: 'dotted' }, { start: 'D', end: 'F', pattern: 'invisible' }])).toEqual(graph(links));
  });
  it('deduplicates parallel edges and is independent of declaration order', () => {
    const links = ['A>B', 'B>C', 'C>D', 'B>E', 'E>F'];
    expect(graph([...links].reverse())).toEqual(graph(links));
    expect(graph([...links, 'B>C'])).toEqual(graph(links));
  });
  it('uses the nearest authored subgraph, including nested groups and disconnected nodes', () => {
    const nodes = [{ id: 'Outer', isGroup: true }, { id: 'Inner', parentId: 'Outer', isGroup: true },
      { id: 'A', parentId: 'Outer' }, { id: 'B', parentId: 'Outer' },
      { id: 'C', parentId: 'Inner' }, { id: 'D', parentId: 'Inner' }, { id: 'Z' }];
    const colors = graph(['A>C', 'B>D'], nodes);
    expect(colors.size).toBe(7);
    expect(colors.get('Outer')).toBe(colors.get('A'));
    expect(colors.get('Inner')).toBe(colors.get('C'));
    expect(colors.get('A')).toBe(colors.get('B'));
    expect(colors.get('C')).toBe(colors.get('D'));
    expect(colors.get('A')).not.toBe(colors.get('C'));
    expect(new Set(colors.values()).size).toBe(3);
  });
  it('bounds large diagrams to three color families without recursion', () => {
    const nodes = Array.from({ length: 1501 }, (_, i) => ({ id: `n${i}` }));
    const edges = nodes.slice(1).map((node, i) => ({ start: nodes[i]!.id, end: node.id }));
    expect(new Set(flowchartGroups(nodes, edges).values()).size).toBe(1);
    expect(new Set(flowchartGroups(nodes, []).values()).size).toBe(3);
  });
});
