import t from 'tap'

import { DAGEntry, GoodDAG } from '../'

t.type(DAGEntry, 'function', 'DAGEntry class exported')

t.test('typechecks', t => {
  //@ts-expect-error
  new GoodDAG<string>(5, 5)
  //@ts-expect-error
  new GoodDAG()

  t.throws(() => new GoodDAG(true, -1))
  t.throws(() => new GoodDAG(true, 2.5))
  // if this fails it'll allocate 32gb of ram lol
  t.throws(() => new GoodDAG('hello', Math.pow(2, 32) + 1))
  t.throws(() => new GoodDAG(true, Math.pow(2, 32) - 1.5))
  t.end()
})

t.test('basic usage', t => {
  const root = new GoodDAG<number>(0, 5)
  t.type(root.data.parent, Uint8Array)
  t.equal(root.isRoot(), true)
  t.equal(root.parent(), undefined)
  t.equal(root.data.getParent(root.index), undefined)
  t.equal(root.root(), root)
  t.equal(root.value(), 0)
  const one = root.append(1)
  t.equal(one.root(), root)
  t.equal(one.isRoot(), false)
  const two = one.append(2)
  t.equal(two.root(), root)
  const tre = one.append(3)
  t.equal(tre.data, root.data, 'still on first block')
  const fur = two.append(4)
  t.equal(fur.value(), 4)
  const fiv = tre.append(5)
  t.equal(fiv.value(), 5)
  t.not(fiv.data, root.data, 'data overflowed to next block')
  t.equal(fiv.data, root.data.nextBlock, 'fiv on second block')
  const six = tre.append(6)
  t.equal(six.root(), root)
  t.equal(six.value(), 6)
  t.equal(root.size(), 7)
  t.equal(six.size(), 7)
  const otherSix = tre.append(6)
  t.equal(root.size(), 8)
  t.equal(six.size(), 8)
  t.equal(otherSix.value(), 6)
  t.equal(otherSix.parent(), tre)
  t.equal(six.parent(), tre)
  root.append(8)
  root.append(9)
  const ten = root.append(10)
  //@ts-ignore
  t.equal(ten.data, root.data.nextBlock.nextBlock, 'ten on third block')
  const lvn = six.append(11)
  t.equal(lvn.data.dags.length, 3, 'third block has refs to both others')
  t.equal(
    six.data.dags.length,
    2,
    'second block only refs first and itself'
  )
  t.end()
})

t.test('big dag', t => {
  const root = new GoodDAG('hello', Math.pow(2, 16) + 1)
  t.type(root.data.parent, Uint32Array)
  t.end()
})

t.test('make sure it does not run in circles chasing its tail', t => {
  // this is a really aggressive test.
  // Get into a situation where we have 256 external block
  // references in a single block.
  // Append the DAG with 255 entries all from the root,
  // filling the first block entirely.
  // Then, for each of those 256 entries, append another
  // 256 entries, completely filling a block for each one's children.
  // Then, go through each of the first 256 blocks, appending
  // one more entry, resulting in a final block with a completely
  // full parentDAG block.
  // Finally, go through every entry and ensure that we have not
  // corrupted any data, and that the total DAG size is 256*256+256,
  // proving that we are not limited by block count * word range in
  // the number of entries that can be stored.
  const root = new GoodDAG<string>('root', 256)
  // fill the first block entirely.
  for (let i = 0; i < 255; i++) {
    root.append(`gen-0 ${i}`)
  }
  t.equal(root.value(), 'root')
  t.equal(root.size(), 256)

  // add 256 entries for each
  for (const entry of root.data.entries) {
    for (let i = 0; i < 256; i++) {
      entry.append(`gen-1 ${i} parent=${entry.value()}`)
    }
  }
  t.equal(root.size(), 256 * 256 + 256)

  // now max out the parentDAG list in a final block.
  let data: DAGEntry<string>['data'] | undefined = root.data
  for (let i = 0; i < 256; i++) {
    const entry = data.entries[data.entries.length - 1]
    if (!data.nextBlock) {
      throw new Error('did not create 256 blocks!')
    } else {
      data = data.nextBlock
    }
    entry.append(`gen-2 ${i} parent=${entry.value()}`)
  }
  t.equal(root.value(), 'root')
  t.equal(root.size(), 256 * 256 + 256 + 256)

  data = root.data
  let block = 0
  do {
    // only snapshot the first and last blocks, the others are just
    // super repetitive and it blows up the fixture
    if (block === 0 || block === 257) {
      t.matchSnapshot(
        data.entries.map(e => e.value()),
        `block ${block}`
      )
    }
    block++
    data = data.nextBlock
  } while (data)
  t.equal(block, 258, 'have 258 blocks total')

  t.end()
})
