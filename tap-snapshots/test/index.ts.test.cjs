/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts TAP basic usage > format dag entry 1`] = `
GoodDAG {
  'value()': 6,
  'parent()': GoodDAG {
    'value()': 3,
    'parent()': GoodDAG {
      'value()': 1,
      'parent()': GoodDAG { 'value()': 0, index: 0, data: DAGData 5 { block: 0, nextFree: 5 } },
      index: 1,
      data: DAGData 5 { block: 0, nextFree: 5 }
    },
    index: 3,
    data: DAGData 5 { block: 0, nextFree: 5 }
  },
  index: 1,
  data: DAGData 5 { block: 1, nextFree: 3 }
}
`
