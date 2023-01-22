/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/index.ts TAP basic usage > format dag entry 1`] = `
<ref *2> DAGEntry {
  data: <ref *1> DAGData {
    dags: [ [Circular *1], [DAGData] ],
    entries: [ [DAGEntry], [Circular *2], [DAGEntry] ],
    values: [ 5, 6, 6 ],
    parent: Uint8Array(5) [ 3, 3, 3, 0, 0 ],
    parentDAG: Uint8Array(5) [ 1, 1, 1, 0, 0 ],
    blockSize: 5,
    nextFree: 3,
    nextBlock: undefined
  },
  index: 1
}
`
