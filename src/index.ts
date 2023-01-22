// a directed acyclic graph using a linked list
// when capacity is maxed, a new GoodDAG is created,
// and the link value is a reference to that other
// object and the index within it.

const inspectSymbol = Symbol.for('nodejs.util.inspect.custom')

import { format } from 'util'

// exported class is a DAGEntry that creates its data storage
// and is the root entry.
export class GoodDAG<T = string> implements DAGEntry<T> {
  readonly data: DAGData<T>
  readonly index: number = 0

  constructor(rootValue: T, blockSize: number = max16) {
    this.data = new DAGData<T>(blockSize, rootValue)
    this.data.entries[0] = this
  }

  [inspectSymbol](): string {
    return formatEntry(this)
  }

  /**
   * get the parent entry to this one (returns undefined, this is the root)
   */
  parent() {
    return undefined
  }

  /**
   * get the value that this DAG entry stores
   */
  value(): T {
    return this.data.values[0]
  }

  /**
   * return true if this is the root entry (it is)
   */
  isRoot() {
    return true
  }

  /**
   * add a new entry into the DAG with the supplied value,
   * with this entry as its parent.
   */
  append(value: T) {
    return this.data.append(value, this.index, this.data)
  }

  /**
   * get the count of items stored in the DAG
   */
  size():number {
    return this.data.size()
  }

  /**
   * get the root entry in the DAG (it's this object, this is the root)
   */
  root(): DAGEntry<T> {
    return this
  }
}

export class DAGEntry<T> {
  readonly data: DAGData<T>
  readonly index: number

  constructor(dag: DAGData<T>, index: number) {
    this.data = dag
    this.index = index
  }

  [inspectSymbol](): string {
    return formatEntry(this)
  }

  /**
   * get the value that this DAG entry stores
   */
  value(): T {
    return this.data.values[this.index]
  }

  /**
   * get the parent entry to this one
   */
  parent(): DAGEntry<T> | undefined {
    return this.data.getParent(this.index)
  }

  /**
   * return true if this is the root entry (it isn't)
   */
  isRoot(): boolean {
    return false
  }

  /**
   * add a new entry into the DAG with the supplied value,
   * with this entry as its parent.
   */
  append(value: T) {
    return this.data.append(value, this.index, this.data)
  }

  /**
   * get the count of items stored in the DAG
   */
  size():number {
    return this.data.rootData().size()
  }

  /**
   * get the root entry in the DAG
   */
  root(): DAGEntry<T> {
    return this.data.rootData().entries[0]
  }
}

// double bitwise negation floors and casts to overflow 4-byte signed
const isLongInt = (i: number) => {
  const n:number = ~~i
  return n === i || (n <= 0 && max32 + n === i)
}
const isPosLongInt = (i: number) => i && isLongInt(i)

const formatEntry = (entry: DAGEntry<any>) => {
  const p = entry.parent()
  return (
    `GoodDAG ` +
    format({
      'value()': entry.value(),
      ...(p ? { 'parent()': entry.parent() } : {}),
      index: entry.index,
      data: entry.data,
    })
  )
}

const max32 = Math.pow(2, 32)
const max16 = Math.pow(2, 16)
const max8 = Math.pow(2, 8)
const getUintArray = (max: number): UintArrayClass => {
  return max <= max8
    ? Uint8Array
    : max <= max16
    ? Uint16Array
    : Uint32Array
}
type UintArray = Uint8Array | Uint16Array | Uint32Array
type UintArrayClass = { new (n: number): UintArray }

const dataInspectMap: Map<DAGData<any>, { [k: string]: any }> = new Map()
let blockIndex = 0

class DAGData<T> {
  // these can grow up to blockSize
  dags: DAGData<T>[]
  entries: DAGEntry<T>[]
  values: T[]

  // these are initialized to blockSize at the start
  parent: UintArray
  parentDAG: UintArray
  blockSize: number
  // we always have a root entry, so nextFree starts at 1
  nextFree: number = 1
  nextBlock?: DAGData<T>

  constructor(
    blockSize: number,
    rootValue: T,
    parentDAG?: DAGData<T>,
    parentIndex: number = 0
  ) {
    if (!isPosLongInt(blockSize)) {
      throw new TypeError(
        'invalid block size, must be number less than 2**32'
      )
    }
    this.blockSize = blockSize
    const Arr: UintArrayClass = getUintArray(blockSize)

    // the zero-index value is rootValue, in parent or locally
    this.dags = [this]
    this.parent = new Arr(blockSize)
    this.parentDAG = new Arr(blockSize)
    this.values = [rootValue]

    const rootEntry = new DAGEntry<T>(this, 0)
    this.entries = [rootEntry]

    if (parentDAG) {
      // first entry has remote parent
      this.parent[0] = parentIndex
      this.dags.push(parentDAG)
      this.parentDAG[0] = 1
    }
  }

  [inspectSymbol](): string {
    const i = dataInspectMap.get(this) || {
      block: blockIndex++,
    }
    i.nextFree = this.nextFree
    dataInspectMap.set(this, i)
    return `DAGData ${this.blockSize} ${format(i)}`
  }

  rootData(): DAGData<T> {
    let d:DAGData<T> = this
    while (d.parentDAG[0] !== 0) {
      d = d.dags[d.parentDAG[0]]
    }
    return d
  }

  size(): number {
    return this.nextFree + (this.nextBlock?.size() || 0)
  }

  append(
    value: T,
    parentIndex: number,
    dag: DAGData<T> = this
  ): DAGEntry<T> {
    if (this.nextFree >= this.blockSize) {
      // ran out of space, add to next block
      if (!this.nextBlock) {
        // create next block with parent entry as root entry
        this.nextBlock = new DAGData<T>(
          this.blockSize,
          value,
          dag,
          parentIndex
        )
        return this.nextBlock.entries[0]
      } else {
        return this.nextBlock.append(value, parentIndex, dag)
      }
    } else {
      const index = this.nextFree++
      const entry = new DAGEntry<T>(this, index)
      this.entries[index] = entry
      this.parent[index] = parentIndex
      this.values[index] = value
      if (dag !== this) {
        // XXX: maybe faster to just always push and have dupes?
        // Benchmark this.
        const i = this.dags.indexOf(dag)
        const dagIndex = i === -1 ? this.dags.push(dag) : i
        this.parentDAG[index] = dagIndex
      }
      return entry
    }
  }

  getParent(index: number): DAGEntry<T> | undefined {
    if (index === 0 && this.parentDAG[index] === 0) {
      // root entry
      return undefined
    }
    const parentDAG = this.dags[this.parentDAG[index]]
    const parentIndex = this.parent[index]
    return parentDAG.entries[parentIndex]
  }
}
