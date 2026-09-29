// This entry is built separately, without the plugin's Mermaid build patch.
// The iframe also isolates Mermaid's state and styles from the enhanced renderer.
import mermaid from 'mermaid-native';
import { readmeExamples } from './readme-sources';

async function render(): Promise<void> {
  const baseline = { version: '11.13.0', theme: 'default', layout: 'dagre', htmlLabels: true } as const;
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: baseline.theme, layout: baseline.layout, htmlLabels: baseline.htmlLabels });
  const examples = [];
  for (const example of readmeExamples) {
    const rendered = await mermaid.render(`native-${example.type}`, example.source);
    examples.push({ type: example.type, source: example.source, svg: rendered.svg });
  }
  window.parent.postMessage({ kind: 'mermaid-native-examples', examples,
    baseline }, location.origin);
}
void render().catch((error: unknown) => {
  window.parent.postMessage({ kind: 'mermaid-native-examples', error: String(error) }, location.origin);
});
