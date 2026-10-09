import { describe, expect, it } from 'vitest';
import { flowchartColorIndex } from '../src/flowchart-colors';

describe('stable flowchart colors', () => {
  it('keeps the source node color when the render ID or Mermaid node counter changes', () => {
    expect(flowchartColorIndex('first-flowchart-Order-0', 'first', 6))
      .toBe(flowchartColorIndex('second-flowchart-Order-12', 'second', 6));
    expect(flowchartColorIndex('one-flowchart-step-2-10', 'one', 6))
      .toBe(flowchartColorIndex('two-flowchart-step-2-99', 'two', 6));
  });
  it('assigns neighboring node IDs different colors and supports custom palette lengths', () => {
    const slots = ['A', 'B', 'C', 'D', 'E', 'F'].map(id => flowchartColorIndex(`render-flowchart-${id}-0`, 'render', 6));
    expect(new Set(slots).size).toBe(6);
    for (const length of [1, 2, 6, 12]) {
      const slot = flowchartColorIndex('render-flowchart-中文节点-1', 'render', length);
      expect(slot).toBeGreaterThanOrEqual(0);
      expect(slot).toBeLessThan(length);
    }
  });
});
