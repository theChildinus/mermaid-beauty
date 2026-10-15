# Public Mermaid examples / 公开示例

Copy a complete fenced block into an Obsidian note, then open Reading view or leave the block in Live Preview. These are fictional, public examples; they contain no vault or business data.

将完整代码块复制到 Obsidian 笔记，再切换阅读视图，或在实时预览中移出光标。示例均为虚构公开内容，不含个人笔记或业务资料。第三组请在深色主题下查看。

The README and demo render exactly these sources. The native comparison uses Mermaid 11.13.0 with Dagre and the matching light/dark theme; Mermaid Beauty uses its bundled engine and automatic layout. The display scale is the same on both sides.

## Release workflow

```mermaid
flowchart LR
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
  K -->|Regression| J
```

## Chinese labels and review loops

```mermaid
flowchart LR
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
  G --> H
```

## Data pipeline in dark mode

```mermaid
flowchart LR
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
  G --> I
```
