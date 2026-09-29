import type { PaletteName } from '../../src/settings';
import type { Fixture } from './fixtures';

export interface ReadmeExample extends Fixture { palette: PaletteName; }

export const readmeExamples: ReadmeExample[] = [
  { name: 'Order fulfillment', type: 'flowchart', palette: 'mint', source: `flowchart LR
  Order[Place an order] --> Payment{Payment approved?}
  Payment -->|Yes| Stock{In stock?}
  Payment -->|No| Retry[Choose another card]
  Retry --> Payment
  Stock -->|Available| Pack[Pack the order]
  Stock -->|Sold out| Notify[Notify the customer]
  Notify --> Choice{Wait or cancel?}
  Choice -->|Wait| Stock
  Choice -->|Cancel| Refund[Issue a refund]
  Pack --> Ship[Ship the parcel]
  Ship --> Done[Enjoy your purchase]` },
];
