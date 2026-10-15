import type { Fixture } from './fixtures';

export interface ReadmeExample extends Fixture { id: string; dark?: boolean; beforeCaption: string; afterCaption: string; }
export const readmeExamples: ReadmeExample[] = [
  { id: 'flowchart', name: 'Release workflow', type: 'flowchart',
    beforeCaption: 'Scattered stages · long cross-group paths',
    afterCaption: 'Stages aligned left to right · feedback routed below', source: `flowchart LR
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
  { id: 'chinese', name: 'Chinese labels and review loops', type: 'flowchart',
    beforeCaption: 'Native layout · the same Chinese labels and review loop',
    afterCaption: 'Automatic layout · coordinated stages and label spacing', source: `flowchart LR
  subgraph Prepare[准备材料]
    A[整理会议记录与用户反馈]
    B[补充需求背景和验收标准]
    C[检查附件与引用链接]
  end
  subgraph Review[协作评审]
    D[确认方案与交付范围]
    E{材料是否完整？}
    F[补充说明并再次提交]
  end
  subgraph Publish[归档分享]
    G[生成最终文档]
    H[归档并发送给协作成员]
  end
  A --> B
  A --> C
  B --> D
  C --> D
  D --> E
  E -->|通过| G
  E -->|需要补充| F
  F --> B
  G --> H` },
  { id: 'dark', name: 'Data pipeline in dark mode', type: 'flowchart', dark: true,
    beforeCaption: 'Native dark theme · unchanged pipeline and retry paths',
    afterCaption: 'Dark palette · grouped stages and automatic routing', source: `flowchart LR
  subgraph Sources[Sources]
    A[Events]
    B[Batch files]
    C[API updates]
  end
  subgraph Process[Processing]
    D[Validate]
    E[Transform]
    F{Quality check}
  end
  subgraph Serve[Delivery]
    G[(Warehouse)]
    H[Dashboard]
    I[Alerts]
  end
  J[Retry queue]
  A --> D
  B --> D
  C --> E
  D --> E
  E --> F
  F -->|Pass| G
  F -->|Fail| J
  J --> D
  G --> H
  G --> I` },
];
