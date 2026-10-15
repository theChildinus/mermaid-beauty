// This entry is built separately, without the plugin's Mermaid build patch.
// The iframe also isolates Mermaid's state and styles from the enhanced renderer.
import mermaid from 'mermaid-native';
import { readmeExamples } from './readme-sources';

async function render(): Promise<void> {
  const examples = [];
  for (const example of readmeExamples) {
    const baseline = { version: '11.13.0', theme: example.dark ? 'dark' : 'default', layout: 'dagre', htmlLabels: true } as const;
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: baseline.theme, layout: baseline.layout, htmlLabels: baseline.htmlLabels });
    const rendered = await mermaid.render(`native-${example.id}`, example.source);
    examples.push({ id: example.id, source: example.source, svg: rendered.svg, baseline });
  }
  window.parent.postMessage({ kind: 'mermaid-native-examples', examples }, location.origin);
}
void render().catch((error: unknown) => {
  window.parent.postMessage({ kind: 'mermaid-native-examples', error: String(error) }, location.origin);
});
