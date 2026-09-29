import { CONNECTORS } from './line-width';
import type { MermaidConfig } from 'mermaid';
import { isRecord, type Appearance } from './settings';

/** ZenUML emits its own unscoped stylesheet and does not consume Mermaid's theme variables. */
export function styleZenUml(svg: Element, config: MermaidConfig, appearance: Appearance): void {
  const id = svg.getAttribute('id');
  if (!id) throw new Error('ZenUML returned an SVG without an id.');
  for (const style of svg.querySelectorAll('style')) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(style.textContent ?? '');
    for (const rule of sheet.cssRules) {
      if (!(rule instanceof CSSStyleRule)) throw new Error('Unsupported ZenUML stylesheet rule.');
      rule.selectorText = rule.selectorText.split(',').map(selector => `#${CSS.escape(id)} ${selector.trim()}`).join(',');
    }
    style.textContent = Array.from(sheet.cssRules, rule => rule.cssText).join('\n');
  }
  const rawVariables: unknown = config.themeVariables;
  const variables = isRecord(rawVariables) ? rawVariables : {};
  const value = (key: string, fallback: string): string => typeof variables[key] === 'string' ? variables[key] : fallback;
  const text = value('primaryTextColor', '#176b42');
  const border = value('primaryBorderColor', '#afd7c1');
  const surface = value('primaryColor', '#ddf3e7');
  const line = value('lineColor', '#8b9690');
  const background = value('background', '#ffffff');
  const apply = (selector: string, properties: Record<string, string>): void => {
    for (const element of svg.querySelectorAll<SVGElement>(selector)) {
      for (const [name, property] of Object.entries(properties)) {
        // Keep explicit source styles; CSSOM also prevents values from injecting new declarations.
        if (!element.style.getPropertyValue(name)) element.style.setProperty(name, property);
      }
    }
  };
  apply('text', { fill: text, 'font-family': String(config.fontFamily ?? 'system-ui') });
  apply('.participant-box', { fill: value('actorBkg', surface), stroke: border, 'stroke-width': '1.25px', rx: `${appearance.radius}px` });
  apply('.participant-label', { fill: value('actorTextColor', text), 'font-weight': '600' });
  apply('.frame-border-outer', { fill: border });
  apply('.frame-border-inner, .frame-header-bg, .group-title-bg', { fill: background });
  apply('.occurrence, .fragment-header, .divider-bg', { fill: value('secondaryColor', surface), stroke: border });
  apply(CONNECTORS.zenuml!, { stroke: line, 'stroke-width': `${appearance.lineWidth}px` });
  apply('.fragment-border, .fragment-separator, .frame-header-line, .group-outline, .divider-line', { stroke: line, 'stroke-width': '1.25px' });
  apply('.arrow-head path', { fill: line, stroke: line, 'stroke-width': '1.25px' });
  apply('.self-call svg path, .fragment > svg path', { stroke: line });
  apply('.self-call svg path[fill="#000"]', { fill: line });
  apply('.participant-icon, .return-icon', { color: text, fill: text });
  // Scale the whole measured layout: changing text alone would clip fixed-size participants.
  const width = Number(svg.getAttribute('viewBox')?.split(/\s+/)[2]);
  if (width > 0) svg.setAttribute('style', `max-width: ${width * appearance.fontSize / 16}px;`);
}
