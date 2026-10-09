import type { Fixture } from './fixtures';

export const readmeExamples: Fixture[] = [
  { name: 'Request review', type: 'flowchart', source: `flowchart TD
  A[New request] --> B{Approved?}
  B -->|Yes| C[Process request]
  B -->|No| D[Request changes]
  D --> A
  C --> E[Done]` },
];
