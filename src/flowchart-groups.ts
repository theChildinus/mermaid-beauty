export interface FlowchartNode { id: string; parentId?: string; isGroup?: boolean }
export interface FlowchartEdge { start: string; end: string; pattern?: string; arrowTypeStart?: string }

/** Group structure, not labels or layout coordinates. A palette slot is not a semantic role. */
export function flowchartGroups(nodes: readonly FlowchartNode[], edges: readonly FlowchartEdge[]): Map<string, number> {
  const vertices = nodes.filter(node => !node.isGroup);
  const groups = new Map(nodes.map(node => [node.id, node.isGroup ? `group:${node.id}` : node.parentId ? `group:${node.parentId}` : `node:${node.id}`]));
  const neighbors = new Map(vertices.filter(node => !node.parentId).map(node => [node.id, new Set<string>()]));
  const outgoing = new Map([...neighbors.keys()].map(id => [id, new Set<string>()]));
  // Dotted references and invisible layout links must not fragment otherwise continuous chains.
  const solid = edges.filter(edge => edge.pattern !== 'dotted' && edge.pattern !== 'invisible');
  for (const edge of solid) {
    if (!neighbors.has(edge.start) || !neighbors.has(edge.end) || edge.start === edge.end) continue;
    neighbors.get(edge.start)!.add(edge.end);
    neighbors.get(edge.end)!.add(edge.start);
    outgoing.get(edge.start)!.add(edge.end);
    if (edge.arrowTypeStart && edge.arrowTypeStart !== 'none') outgoing.get(edge.end)!.add(edge.start);
  }
  const cuts = new Map<string, Set<string>>();
  for (const [start, targets] of outgoing) {
    if (targets.size < 2) continue;
    const branches: string[] = [];
    for (const end of targets) {
      if (outgoing.get(end)!.has(start)) continue;
      // Removing this edge must isolate a real branch. Reconverging paths and
      // cycles stay together rather than inventing a main path through them.
      const seen = new Set([end]), queue = [end];
      for (let i = 0; i < queue.length && !seen.has(start); i++) {
        const current = queue[i]!;
        for (const next of neighbors.get(current)!) {
          if (current === end && next === start) continue;
          if (!seen.has(next)) { seen.add(next); queue.push(next); }
        }
      }
      if (!seen.has(start) && seen.size >= 2) branches.push(end);
    }
    // A leaf next to a continuing chain is too small to justify another color.
    if (branches.length >= 2) cuts.set(start, new Set(branches));
  }
  const visited = new Set<string>();
  for (const id of [...neighbors.keys()].sort()) {
    if (visited.has(id)) continue;
    const queue = [id]; visited.add(id);
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i]!;
      groups.set(current, `node:${id}`);
      for (const next of neighbors.get(current)!) {
        if (visited.has(next) || cuts.get(current)?.has(next) || cuts.get(next)?.has(current)) continue;
        visited.add(next); queue.push(next);
      }
    }
  }

  // Assign a bounded set of colors in stable graph order, independent of source
  // declaration order, render counters, labels, and ELK/Dagre layout positions.
  const links = new Map([...new Set(groups.values())].sort().map(group => [group, new Set<string>()]));
  const incoming = new Set<string>();
  for (const edge of solid) {
    const from = groups.get(edge.start), to = groups.get(edge.end);
    if (!from || !to || from === to) continue;
    links.get(from)!.add(to); incoming.add(to);
  }
  const slots = new Map<string, number>();
  const roots = [...links.keys()].filter(group => !incoming.has(group));
  for (const root of [...roots, ...links.keys()]) {
    if (slots.has(root)) continue;
    const queue = [root];
    slots.set(root, slots.size % 3);
    for (let i = 0; i < queue.length; i++) {
      for (const next of [...links.get(queue[i]!)!].sort()) {
        if (slots.has(next)) continue;
        slots.set(next, slots.size % 3); queue.push(next);
      }
    }
  }
  return new Map([...groups].map(([id, group]) => [id, slots.get(group)!]));
}
