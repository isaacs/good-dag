import t from 'tap'
import {format} from 'util'

import {GoodDAG, DAGEntry} from '../'

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
  t.equal(root.data.getParent(root.index), undefined)
  t.equal(root.root(), root)
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
  t.matchSnapshot(format(six), 'format dag entry')
  root.append(8)
  root.append(9)
  const ten = root.append(10)
  //@ts-ignore
  t.equal(ten.data, root.data.nextBlock.nextBlock, 'ten on third block')
  const lvn = six.append(11)
  t.equal(lvn.data.dags.length, 3, 'third block has refs to both others')
  t.equal(six.data.dags.length, 2, 'second block only refs first and itself')
  t.end()
})

t.test('big dag', t => {
  const root = new GoodDAG('hello', Math.pow(2, 16) + 1)
  t.type(root.data.parent, Uint32Array)
  t.end()
})
