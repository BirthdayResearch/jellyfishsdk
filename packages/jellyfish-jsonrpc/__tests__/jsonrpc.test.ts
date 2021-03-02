import {JellyfishJsonRpc} from '../src/jsonrpc'
import {RegTestDocker} from '@defichain/testcontainers'

describe('error handling', () => {
  const node = new RegTestDocker()

  beforeAll(async () => {
    await node.start({
      user: 'foo',
      password: 'bar',
    })
    await node.ready()
  })

  afterAll(async () => {
    await node.stop()
  })

  it('should 401 unauthorized', async () => {
    const port = await node.getRpcPort()
    const rpc = new JellyfishJsonRpc(`http://foo:foo@127.0.0.1:${port}`)
    const call = rpc.call('getmintinginfo', [])
    return expect(call).rejects.toThrow(/Unauthorized/)
  })
})

describe('as expected', () => {
  const node = new RegTestDocker()

  beforeAll(async () => {
    await node.start({
      user: 'foo',
      password: 'bar',
    })
    await node.ready()
  })

  afterAll(async () => {
    await node.stop()
  })

  it('should getmintinginfo', async () => {
    const rpc = new JellyfishJsonRpc(await node.getRpcUrl())
    const result: any = await rpc.call('getmintinginfo', [])
    expect(result.blocks).toBe(0)
    expect(result.chain).toBe('regtest')
  })
})
