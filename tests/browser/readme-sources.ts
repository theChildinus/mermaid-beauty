import type { Fixture } from './fixtures';

export const readmeExamples: Fixture[] = [
  { name: 'Online shopping', type: 'flowchart', source: `flowchart LR
  Browse[Browse products] -->|Choose an item| Cart[Shopping cart]
  Cart -->|Check out| Payment{Payment accepted?}
  Payment -->|Yes| Delivery[Ship the order]
  Payment -->|No| Retry[Try another card]
  Delivery -->|Parcel arrives| Home[Enjoy your purchase]` },
  { name: 'Ordering coffee', type: 'sequence', source: `sequenceDiagram
  participant Customer
  participant Cashier
  participant Barista
  Customer->>Cashier: Order a latte
  Cashier->>Customer: Ask for payment
  Customer->>Cashier: Pay
  Cashier->>Barista: Make a latte
  activate Barista
  Note right of Barista: Brew fresh coffee
  Barista-->>Customer: Hand over the latte
  deactivate Barista` },
  { name: 'Library books', type: 'class', source: `classDiagram
  class Library {
    +String name
    +findBook()
  }
  class Book {
    +String title
    +Boolean available
  }
  class Member {
    +String name
    +borrowBook()
    +returnBook()
  }
  Library "1" --> "many" Book : has
  Member --> Book : borrows` },
];
