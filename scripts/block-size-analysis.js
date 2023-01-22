// this is a simulation of the time required for various UintArray
// expandable linked-list storage schemes.
//
// When a linked list is implemented using such a data structure, where each
// entry is an index into the data block, the Uint size must be large enough to
// accommodate any indexes in the array. So, longer array, bigger indexes,
// larger pointer size.
//
// An expanding linked list data block implementation can accommodate an
// infinite number of entries in theory, but in practice this means that more
// data blocks must be used when there are more entries than the capacity of a
// single block.  This scenario simulates that behavior.
//
// In each scenario, a Uint8Array, Uint16Array, and Uint32Array are tested.  As
// many blocks are created as would be needed to store the "count" value
// provided.  Then, the "items" amount of items are added to the array.
//
// takeaways:
// - A smaller block size is better when the fill count is smaller.  This makes
//   sense, because there's less to allocate.  It's also less data usage
//   overall, because each entry is 1 byte instead of 2 or 4.  However, the
//   speed impact is pretty minimal, like around 5-10%, and it's an operation
//   that runs on the order of 1000 - 10000 operations PER MS, so saving 10%
//   of that is not *ever* going to be material.
//
// - A larger block size is better if the eventual total fill count is higher
//   than a smaller array can accommodate, as it saves having to do multiple
//   allocation operations.  Again, this makes sense, but the overall impact
//   doesn't start to be significant until the range of at least around 3-4x
//   the maximum block size.  Ie, the 8bit approach falls off around 1000
//   items, and the 16 bit approach falls off around 200k items.
//
// - If the arrays *don't* actually fill to expected capacity, then it's
//   MUCH faster to use a smaller block size, because so much less data is
//   allocated up front.  All this means is that while a bigger block size
//   is better if you *know* you're going to have a lot of data, it's also
//   important to make a reasonable guess the maximum count you're likely to
//   *actually* need to accommodate, and keep the block size no more than
//   that rough range, if possible.
//
//   For example, if you know you're going to have anywhere from 100 to 10k
//   items, it's best to define the maximum block size at around 5000, so
//   that you'll use 16 bit arrays, and only rarely need more than 1 or 2
//   blocks.
//
// - At the very extreme end, if you set your block size to Math.pow(2, 32),
//   which forces using Uint32Array, and then only add a single item to it,
//   you get less than 1 operation per ms, and use a whopping 17_179_869_184
//   (16GiB) of allocation for nothing.  Setting a block size of 256 and then
//   adding a single entry is around 5000 operations per ms, by comparison,
//   and allocates only 256 bytes.
//
// When in doubt, just set the block size to Math.pow(2, 16), which allocs
// super fast, and is reasonably fast up to a million entries or so, and then
// the blocks are only 32kb each.  If you are fairly confident that you'll
// have a much smaller number of items, like 1-1000, set the blockSize to
// 256, so each block only requires 256 bytes and allocates much faster.

const N = Math.pow(10, 2)

// fill up as many arrays as needed, and then read them all
const test = (Cls, word, size, count, items = count) => {
  const arrays = []
  const blockSize = Math.min(size, count)
  let bytes = 0
  for (let n = 0; n < items; n++) {
    const ns = n % size
    if (ns === 0) {
      bytes += blockSize
      arrays.push(new Cls(blockSize))
    }
    const a = arrays[arrays.length - 1]
    a[ns] = ns
  }
  return bytes * word
}

const testSec = (Cls, word, size, count, items = count) => {
  const p = performance.now()
  const end = p + 1000
  let runs = 0
  let time = 0
  let bytes
  for (let q = p; q < end; q = performance.now()) {
    bytes = test(Cls, word, size, count, items)
    runs++
    time = q - p
  }
  return [runs / time, bytes]
}

const bench = (count, items = count) => {
  // need it to be high enough to get some data
  console.log('\nallocation for:', count)
  console.log('filling items: ', items)
  console.log(
    ' 8:',
    testSec(Uint8Array, 1, Math.pow(2, 8), count, items),
    'fills/ms, bytes used'
  )
  console.log(
    '16:',
    testSec(Uint16Array, 2, Math.pow(2, 16), count, items),
    'fills/ms, bytes used'
  )
  console.log(
    '32:',
    testSec(Uint32Array, 4, Math.pow(2, 32), count, items),
    'fills/ms, bytes used'
  )
}

console.log(
  'results is [score, bytes] ' + '(bigger score, smaller bytes = better)'
)

bench(1)
bench(10)
bench(100)
bench(1_000)
bench(10_000)
bench(100_000)
bench(200_000)
bench(1_000_000)
bench(10_000_000)
bench(Math.pow(2, 32) + 1, 10_000_000)
bench(1, 1)
bench(10, 1)
bench(100, 1)
bench(1_000, 1)
bench(10_000, 1)
bench(100_000, 1)
bench(200_000, 1)
bench(1_000_000, 1)
bench(10_000_000, 1)
bench(Math.pow(2, 32) + 1, 1)
