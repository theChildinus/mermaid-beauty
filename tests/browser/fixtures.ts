import type { DiagramType } from '../../src/settings';
export interface Fixture { name: string; type: DiagramType; source: string; }
export const fixtures: Fixture[] = [
  { name: 'Flowchart', type: 'flowchart', source: `flowchart LR
    Publisher[发布端] -->|登记版本 update/info| Control[control service]
    Client[客户端] -->|查询路径 path/info| Control
    Worker[worker] -->|同步状态 sync/info| Control
    Worker -->|下载文件| Files[文件源]
    Control <-->|读写状态| DB[(数据库)]
    Worker -->|登记节点、回写状态和可用路径| DB` },
  { name: 'Sequence', type: 'sequence', source: `sequenceDiagram
    participant A as 客户端
    participant B as 服务端
    A->>B: 查询数据
    activate B
    Note right of B: 读取缓存
    B-->>A: 返回结果
    deactivate B` },
  { name: 'Class', type: 'class', source: `classDiagram
    class Reader {
      +String name
      +read()
    }
    class Book
    Reader --> Book : reads` },
  { name: 'State', type: 'state', source: `stateDiagram-v2
    [*] --> Ready
    Ready --> Running : start
    Running --> Ready : finish
    Running --> [*] : stop` },
  { name: 'Entity relationship', type: 'er', source: `erDiagram
    READER ||--o{ BOOK : borrows
    READER {
      string name
    }
    BOOK {
      string title
    }` },
  { name: 'Gantt', type: 'gantt', source: `gantt
    title Release plan
    dateFormat YYYY-MM-DD
    section Work
    Design :done, a, 2026-01-01, 3d
    Build :active, b, after a, 4d
    Verify :c, after b, 2d` },
  { name: 'Pie', type: 'pie', source: `pie title Reading time
    "Fiction" : 50
    "History" : 30
    "Science" : 20` },
  { name: 'Mind map', type: 'mindmap', source: `mindmap
    root((阅读计划))
      技术
        编程
        设计
      文学
        小说
        诗歌` },
  { name: 'Timeline', type: 'timeline', source: `timeline
    title Product history
    2024 : Prototype
    2025 : First release
    2026 : Community edition` },
  { name: 'Journey', type: 'journey', source: `journey
    title Reading journey
    section Library
      Choose a book: 5: Reader
      Borrow a book: 4: Reader, Librarian
    section Home
      Read: 5: Reader` },
  { name: 'Git graph', type: 'git', source: `gitGraph
    commit
    branch feature
    checkout feature
    commit
    checkout main
    merge feature
    commit` },
  { name: 'Quadrant', type: 'quadrant', source: `quadrantChart
    title Project choices
    x-axis Low effort --> High effort
    y-axis Low value --> High value
    quadrant-1 Plan
    quadrant-2 Start
    quadrant-3 Later
    quadrant-4 Avoid
    Docs: [0.2, 0.8]
    Migration: [0.8, 0.7]` },
  { name: 'Requirement', type: 'requirement', source: `requirementDiagram
    requirement reliable {
      id: 1
      text: response available
      risk: low
      verifymethod: test
    }
    element service {
      type: software
    }
    service - satisfies -> reliable` },
  { name: 'C4', type: 'c4', source: `C4Context
    Person(reader, "Reader", "Reads books")
    System(library, "Library", "Manages books")
    Rel(reader, library, "Borrows")` },
  { name: 'Sankey', type: 'sankey', source: `sankey-beta
    Solar,Grid,40
    Wind,Grid,60
    Grid,Homes,75
    Grid,Shops,25` },
  { name: 'XY chart', type: 'xy', source: `xychart-beta
    title "Weekly visits"
    x-axis [Mon, Tue, Wed, Thu]
    y-axis "Visits" 0 --> 100
    bar [40, 60, 50, 80]
    line [30, 50, 60, 70]` },
  { name: 'Block', type: 'block', source: `block-beta
    columns 3
    A["Input"] B["Process"] C["Output"]
    A --> B
    B --> C` },
  { name: 'Packet', type: 'packet', source: `packet-beta
    0-7: "Kind"
    8-15: "Length"
    16-31: "Payload"` },
  { name: 'Architecture', type: 'architecture', source: `architecture-beta
    group api(cloud)[API]
    service server(server)[Server] in api
    service db(database)[Database] in api
    server:R -- L:db` },
  { name: 'Kanban', type: 'kanban', source: `kanban
    backlog[Backlog]
      task1[Write docs]
    progress[In progress]
      task2[Build preview]
    done[Done]
      task3[Define theme]` },
  { name: 'Radar', type: 'radar', source: `radar-beta
    axis speed["Speed"], clarity["Clarity"], coverage["Coverage"]
    curve v1["Version 1"]{70, 90, 80}
    curve v2["Version 2"]{85, 80, 95}
    max 100` },
  { name: 'Treemap', type: 'treemap', source: `treemap-beta
    "Library"
      "Fiction": 35
      "Science": 25
    "Archive"
      "History": 20
      "Art": 10` },
  { name: 'Venn', type: 'venn', source: `venn-beta
    set Readers
    set Writers
    union Readers,Writers["Both"]` },
  { name: 'Railroad', type: 'railroad', source: `railroad-beta
    command = sequence(terminal("read"), nonterminal("book"));` },
  { name: 'Railroad EBNF', type: 'railroad', source: `railroad-ebnf-beta
    action = "read" | "write" ;` },
  { name: 'Railroad ABNF', type: 'railroad', source: `railroad-abnf-beta
    action = "read" / "write" ;` },
  { name: 'Railroad PEG', type: 'railroad', source: `railroad-peg-beta
    Action <- "read" / "write" ;` },
  { name: 'Tree view', type: 'treeview', source: `treeView-beta
├── notes/
│   ├── reading.md
│   └── ideas.md
└── index.md` },
  { name: 'Cynefin', type: 'cynefin', source: `cynefin-beta
    title Work choices
    complex
      "Explore a design"
    complicated
      "Plan a migration"
    clear
      "Update a label"
    chaotic
      "Restore service"` },
  { name: 'Swimlane', type: 'swimlane', source: `swimlane-beta LR
    subgraph Reader
      Choose[Choose book]
    end
    subgraph Library
      Lend[Lend book]
    end
    Choose --> Lend` },
  { name: 'Use case', type: 'usecase', source: `usecase-beta
    direction LR
    actor Reader("Reader")
    systemBoundary "Library"
      Borrow("Borrow a book")
    end
    Reader --> Borrow` },
  { name: 'Agent flow', type: 'agentflow', source: `agentflow-beta TB
    flow helper["Library assistant"]
      query["Book query"]@{ shape: input }
      search["Find books"]@{ shape: tool }
      query --> search
    end` },
  { name: 'Event modeling', type: 'eventmodeling', source: `eventmodeling
    tf 01 ui LibraryUI
    tf 02 cmd BorrowBook
    tf 03 evt BookBorrowed` },
  { name: 'Ishikawa', type: 'ishikawa', source: `ishikawa-beta
    Slow response
    Network
      High latency
    Storage
      Slow disk
      Large query` },
  { name: 'Wardley', type: 'wardley', source: `wardley-beta
    title Library services
    anchor Reader [0.9, 0.6]
    component Catalogue [0.7, 0.5]
    component Storage [0.3, 0.8]
    Reader -> Catalogue
    Catalogue -> Storage` },
  { name: 'ZenUML', type: 'zenuml', source: `zenuml
    Reader->Library.borrowBook() {
      return book
    }` },
  { name: 'ZenUML fragments', type: 'zenuml', source: `zenuml
    title Checkout
    @Actor Customer
    @Database Inventory
    Customer->Shop.checkout() {
      if (inStock) {
        Shop->Inventory.reserve() {
          return receipt
        }
      } else {
        Shop.notify()
      }
      while (pending) {
        Shop.poll()
      }
      return confirmation
    }` },
  { name: 'Info', type: 'info', source: 'info' },
  { name: 'Shapes and styles', type: 'flowchart', source: `flowchart LR
    A{选择?} -->|是| B[(数据库)]
    A -->|否| C[[子流程]]
    C --> D([完成])
    classDef warning fill:#ffe0e0,stroke:#dd5555
    class A warning` },
  { name: 'Source config', type: 'flowchart', source: `---
config:
  layout: dagre
  themeVariables:
    primaryColor: '#ffeeaa'
---
flowchart LR
  A[Source color] --> B[Still editable]` },
];
