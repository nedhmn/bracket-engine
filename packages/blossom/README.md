# blossom

Maximum weighted matching in general graphs (Edmonds' blossom algorithm).

## Usage

```typescript
import blossom from "@bracket-engine/blossom";

const edges: [number, number, number][] = [
  [0, 1, 10], // vertex 0 ↔ vertex 1, weight 10
  [1, 2, 5],
  [0, 2, 3],
];

const mate = blossom(edges);
// mate[v] = matched partner, or -1 if unmatched

const mateMaxCard = blossom(edges, true);
// forces maximum number of pairs even at lower total weight
```

## API

| Export    | Description                                                       |
| --------- | ----------------------------------------------------------------- |
| `default` | `(edges, maxCardinality?) => number[]`, maximum weighted matching |

## Provenance

Joris van Rantwijk (Python) → Matt Krick (JS) → this TypeScript port.
