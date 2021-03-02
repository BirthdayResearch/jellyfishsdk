import {JellyfishJsonRpc} from '../src/jsonrpc'

describe('JSON-RPC 1.0', () => {
  it('should have different ids', () => {
    // TODO(fuxingloh): AOP; intercept instead of direct testing
    const first = JellyfishJsonRpc.stringify('diffid', [])
    const second = JellyfishJsonRpc.stringify('diffid', [])
    expect(first).not.toBe(second)
  })
})
