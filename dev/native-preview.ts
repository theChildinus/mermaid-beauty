// This entry is built separately, without the plugin's Mermaid build patch.
// The iframe also isolates Mermaid's state and styles from the enhanced renderer.
import mermaid from 'mermaid-native';
import { readmeExamples } from './readme-sources';

async function render(): Promise<void> {
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
  const examples = [];
  for (const example of readmeExamples) {
    const rendered = await mermaid.render(`native-${example.type}`, example.source);
    examples.push({ type: example.type, source: example.source, svg: rendered.svg });
  }
  const config = mermaid.mermaidAPI.getConfig();
  const htmlLabels = config.htmlLabels ?? config.flowchart?.htmlLabels ?? true;
  if (config.theme !== 'default' || config.layout !== 'dagre' || htmlLabels !== true) {
    throw new Error('Native Mermaid defaults changed; review the baseline before exporting.');
  }
  window.parent.postMessage({ kind: 'mermaid-native-examples', examples,
    baseline: { version: '11.13.0', theme: config.theme, layout: config.layout, htmlLabels } }, location.origin);
}
void render().catch((error: unknown) => {
  window.parent.postMessage({ kind: 'mermaid-native-examples', error: String(error) }, location.origin);
});
