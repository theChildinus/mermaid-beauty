// Only the standalone export-control fixture imports this host stub. The build
// rejects all tests/ inputs in the production bundle. It never writes to a vault.
export class MarkdownRenderChild { constructor(public containerEl: HTMLElement) {} }
export class Notice { constructor(_message: string | DocumentFragment) {} hide(): void {} }
export class FileSystemAdapter {}
export const Platform = { isDesktopApp: true };
export const normalizePath = (path: string): string => path;
export class SuggestModal { constructor(_app: unknown) {} }

export const menuItems: string[] = [];
export class Menu {
  addItem(callback: (item: MenuItem) => void): this { callback(new MenuItem()); return this; }
  addSeparator(): this { menuItems.push('---'); return this; }
  showAtMouseEvent(): void {}
}
class MenuItem {
  setTitle(title: string): this { menuItems.push(title); return this; }
  setIcon(): this { return this; }
  onClick(): this { return this; }
}
export function setIcon(el: HTMLElement): void {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.6');
  const path = document.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('d', 'M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4'); svg.append(path); el.append(svg);
}

export function installCreateEl(host: HTMLElement): void {
  Object.defineProperty(host, 'createDiv', { value: (options: { cls: string }) => host.createEl('div', options) });
  Object.defineProperty(host, 'createEl', { value: (tag: string, options: { cls: string; attr?: Record<string, string> }) => {
    const element = document.createElement(tag); element.className = options.cls;
    for (const [name, value] of Object.entries(options.attr ?? {})) element.setAttribute(name, value);
    installCreateEl(element);
    host.append(element); return element;
  } });
}
