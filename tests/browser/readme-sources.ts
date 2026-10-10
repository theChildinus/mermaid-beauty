import type { Fixture } from './fixtures';

export const readmeExamples: Fixture[] = [
  { name: 'Release workflow', type: 'flowchart', source: `flowchart LR
  subgraph Checks[Checks]
    B[Build]
    C[Unit tests]
    D[Security scan]
    E[Review]
  end
  subgraph Validation[Validation]
    F[Integration]
    G[Preview]
    H{Ready?}
  end
  subgraph Release[Release]
    I[Publish]
    K[Monitor]
    J[Fix issues]
  end
  A[Code change] --> B
  A --> C
  A --> D
  A --> E
  B --> F
  C --> F
  B --> G
  E --> G
  D --> H
  F --> H
  G --> H
  H -->|Yes| I
  H -->|No| J
  J --> A
  I --> K
  K -->|Regression| J` },
];
