import { describe, expect, it } from 'vitest';
import { kanbanCardLayout } from '../src/kanban-layout';
import { themeConfig } from '../src/theme';
import { loadSettings } from '../src/settings';

const box = (width: number, height = 18) => ({ x: 0, y: 0.5, width, height });
describe('Kanban card layout', () => {
  it('centers a title vertically when there is no metadata', () => {
    const layout = kanbanCardLayout(185, box(100), box(0, 0), box(0, 0));
    expect(layout.height).toBe(38);
    expect(layout.title.y + 0.5).toBe(10);
  });
  it('keeps a short ticket and assignee apart on the same row', () => {
    const layout = kanbanCardLayout(185, box(100), box(50), box(60));
    expect(layout.ticket.y).toBe(layout.assigned.y);
    expect(layout.assigned.x - layout.ticket.x - 50).toBeGreaterThanOrEqual(6);
    expect(layout.height - layout.ticket.y - 0.5 - 18).toBe(10);
  });
  it('stacks long metadata and reserves its full height', () => {
    const layout = kanbanCardLayout(185, box(160, 36), box(120, 36), box(100, 18));
    expect(layout.assigned.x).toBe(layout.ticket.x);
    expect(layout.assigned.y - layout.ticket.y - 36).toBe(6);
    expect(layout.height - layout.assigned.y - 0.5 - 18).toBe(10);
  });
  it('accounts for text bearing when aligning labels', () => {
    const title = { x: -3, y: -12, width: 100, height: 18 };
    const layout = kanbanCardLayout(185, title, box(0, 0), box(0, 0));
    expect(layout.title.x + title.x).toBe(-82.5);
    expect(layout.title.y + title.y).toBe(10);
  });
  it('keeps Kanban styling scoped and respects configured colors', () => {
    const { defaults } = loadSettings({});
    const extra = { themeVariables: { clusterBkg: '#112233', clusterBorder: '#abcdef', primaryColor: '#445566', primaryTextColor: '#fedcba' } };
    const css = themeConfig(defaults, 'kanban', false, extra).themeCSS!;
    expect(css).toContain('fill: #112233; stroke: #abcdef');
    expect(css).toContain('fill: #445566;');
    expect(css).toContain('fill: #fedcba;');
    expect(themeConfig(defaults, 'flowchart', false).themeCSS).not.toContain('.sections .cluster > rect');
  });
});
