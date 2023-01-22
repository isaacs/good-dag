# good-dag

Expandable append-only immutable directed acyclic graph using
linked lists.

There's no<sup>[1]</sup> way to get at the data if you throw away
the reference to the entry. Once every entry is garbage collected
the underlying data store will be as well, but until then, they
all stay in memory.

The references are one-way. Parents can't reference children, so
you can only walk _up_ the DAG towards the root, not down it to
the leaves.

This is a lowlevel fast implementation, suitable for storing
immutable data that is intended to stick around for the lifetime
of a task, and really not much else.

It's a tool for that one specific type of job.

_"Who's a good dag! YOU ARE!!"_

<small>[1]: _Technically_ that's not _exactly_ true, you could
poke around in `entry.data.entries[]`, but that's very "sticking
your fingers into the beast's mouth", and I do not recommend
it.</small>

## USAGE

```ts
// hybrid module, either works
import { GoodDAG } from 'good-dag'
// or
const { GoodDAG } = require('good-dag')

// default type is string, but you can store anything
const root = new GoodDAG<string>('root value')

// now the root value is set to 'root value'

// get is the root entry
assert.equal(root.value, 'root value')
assert.equal(root.parent(), undefined)

const child = root.append('child')
const otherChild = root.append('other child')

assert.equal(child.parent(), root)
assert.equal(otherChild.parent(), root)
```

## Class: `GoodDAG`

Represents a directed acyclic graph.

Note that child elements are actually instances of the `DAGEntry`
class, which `GoodDAG` implements. The two can be used
interchangeably, but this may confound `instanceof` checks, as
the two do not inherit from one another classically.

### `dag = new GoodDAG<T = string>(rootValue: T, blockSize:number = 65536)`

Initial root value is set to `rootValue`.

Block size is set by `blockSize`, and must be less than or equal
to `Math.pow(2, 32)`.

If less than or equal to `256`, then the internal linked lists
will use a `Uint8Array`. If less than or equal to `Math.pow(2,
16)`, then it will use a `Uint16Array`. Otherwise, it will use a
`Uint32Array`.

Keep in mind that using a larger block size will not _always_
improve performance, and can dramatically increase memory
footprint! See **Performance, Memory, and `blockSize` Tuning**
below for guidance on setting this value appropriately.

### `readonly dag.data: DAGData`

A reference to the underlying data store where this DAGEntry
lives.

### `readonly index: number`

The index of this entry in the underlying data store.

### `dag.parent() => DAGEntry | undefined`

Get the parent entry for the dag entry. Will return `undefined`
for the root entry.

### `dag.value() => T`

Return the value set for this entry in the DAG.

### `dag.isRoot() => boolean`

Return true if this is the root entry in the DAG.

### `dag.root() => DAGEntry<T>`

Return the root entry in the DAG.

### `dag.size() => number`

Return count of total number of items stored in the DAG.

### `dag.append(value: T) => DAGEntry<T>`

Adds a value into the DAG with `dag` as the parent, returning the
newly created entry.

Note that values are _not_ unique. Appending the same value
multiple times will result in the value appearing in the DAG
multiple times.

Also, the links are one-way, meaning that there is no way to get
to the children from the parent, only the other direction.

(It's very directed!)

## Performance, Memory, and `blockSize` Tuning

Tuning the `blockSize` requires some consideration. The default
is set to a reasonable middle-ground, suitable for purposes where
you expect to have no more than around 50-100k entries in the
DAG.

The larger the `blockSize`, the more memory will be used for each
DAG entry. If using a `Uint8Array`, then `blockSize * 2` bytes
must be pre-allocated. If using `Uint16Array`, then `blockSize *
4`, and if `Uint32Array`, then `blockSize * 8`. This allocation
is usually quite fast, but if done repeatedly, the time will add
up, and a smaller block size will go faster.

However, when adding items to the DAG, once it goes beyond the
initial `blockSize` of items, a new data block must be allocated,
and parent lookups in that data block are ever so slightly
slower, because they may need to hop between blocks.

Some good rules of thumb: use the following block values based on
your best estimate of the most number of items will end up in the
DAG in your use case:

- 2000 items or less, or if you're at all memory constrained: set
  `blockSize` to `256`, so that each block only has to allocate
  512 bytes of memory. (1 byte word size, 2 words per block entry.)
- between 1000 and 10,000 items: set `blockSize` to `4096`. Each
  block will allocate 16kb. (2 byte word size, 2 words per
  entry.)
- between 10,000 and 50,000 items: set `blockSize` to `8192`.
  Each block will allocate 32kb.
- more than 50,000 items, especially if the DAG object isn't likely to
  stick around for a long time, or if you just don't want to blow
  more than 64kb per block: set `blockSize` to `65536`. Each
  block will allocate 64kb.
- way more than 10m items (like billions), _and_ the DAG object
  is going to stick around for a long time (like a long-lived
  module-local variable, for example), so you won't hit the
  allocation operation very often, _and_ you have plenty of
  memory to burn, _and_ you really want to optimize lookup speed,
  _and_ you have a very confident limit on how many items you're
  ever going to need to store: set the limit to about a quarter
  of the total count of items you need to support. The total
  bytes allocated for each block will be this number times 8.
  For example, setting `blockSize` to 100,096 will require 782kb
  per block.

See
[`scripts/block-size-analysis.js`](scripts/block-size-analysis.js)
in this repo for a script to help understand these trade-offs.

## Things You Should Never Do With This Library

Don't pick a `blockSize` that is bigger than you need, especially
if you are creating brand new `GoodDAG` objects repeatedly.

Don't use this as a cache.  There's
[many](https://www.npmjs.com/package/mnemonist)
[other](http://npm.im/lru-cache)
[caches](http://npm.im/@isaacs/ttl-cache) that are actually
caches and quite good at what they do, so use one of those.

Don't use this as a key-value store, or get frustrated when it's
not that.

If your problem is DAG-shaped, this is a DAG-shaped tool.  It's a
good DAG, it's not a caravan.

## That is the joke.

[![dags, d'ya like dags?](./dags-do-you-like-dags.gif "dags, d'ya like dags?")](https://www.youtube.com/watch?v=zH64dlgyydM)
