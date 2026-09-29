interface Point { x: number; y: number; }
const same = (a: Point, b: Point): boolean => Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
const axis = (a: Point, b: Point): boolean => Math.abs(a.x - b.x) < 0.001 || Math.abs(a.y - b.y) < 0.001;

/** Widen orthogonal corner rounding while retaining the routed vertices and arrow endpoints.
 * Curves, crossing hops, hand drawings and unknown SVG commands remain untouched.
 */
export function softenOrthogonalPath(path: string, radius: number): string {
  const tokens = path.match(/[MLQ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) ?? [];
  if (tokens.join('') !== path.replace(/[\s,]/g, '') || !path.startsWith('M')) return path;
  const points: Point[] = [];
  let index = 0;
  let current: Point | undefined;
  while (index < tokens.length) {
    const command = tokens[index++];
    const x = Number(tokens[index++]); const y = Number(tokens[index++]);
    if (!Number.isFinite(x + y)) return path;
    const point = { x, y };
    if (command === 'Q') {
      const end = { x: Number(tokens[index++]), y: Number(tokens[index++]) };
      if (!current || !Number.isFinite(end.x + end.y) || !axis(current, point) || !axis(point, end) || axis(current, end)) return path;
      // The preceding line ends at the curve's entry, not at a routed vertex.
      points.pop(); points.push(point, end); current = end;
    } else if (command === 'M' || command === 'L') {
      if (command === 'M' && points.length) return path;
      points.push(point); current = point;
    } else return path;
  }
  const route: Point[] = [];
  for (const point of points) {
    if (route.length && same(route[route.length - 1]!, point)) continue;
    while (route.length > 1) {
      const a = route[route.length - 2]!; const b = route[route.length - 1]!;
      if (!axis(a, b) || !axis(b, point) || !axis(a, point)) break;
      // Do not erase a U-turn.
      if ((b.x - a.x) * (point.x - b.x) + (b.y - a.y) * (point.y - b.y) < 0) break;
      route.pop();
    }
    route.push(point);
  }
  if (route.length < 2 || route.some((p, i) => i > 0 && !axis(route[i - 1]!, p))) return path;
  const pair = (p: Point): string => `${p.x},${p.y}`;
  let result = `M${pair(route[0]!)}`;
  for (let i = 1; i < route.length - 1; i++) {
    const a = route[i - 1]!; const b = route[i]!; const c = route[i + 1]!;
    const incoming = Math.hypot(b.x - a.x, b.y - a.y);
    const outgoing = Math.hypot(c.x - b.x, c.y - b.y);
    if (axis(a, c)) { result += `L${pair(b)}`; continue; }
    const cut = Math.min(radius, incoming / 2, outgoing / 2);
    const start = { x: b.x + (a.x - b.x) * cut / incoming, y: b.y + (a.y - b.y) * cut / incoming };
    const end = { x: b.x + (c.x - b.x) * cut / outgoing, y: b.y + (c.y - b.y) * cut / outgoing };
    result += `L${pair(start)}Q${pair(b)} ${pair(end)}`;
  }
  return `${result}L${pair(route[route.length - 1]!)}`;
}
