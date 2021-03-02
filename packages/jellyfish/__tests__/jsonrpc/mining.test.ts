import Jellyfish from '../../src/jellyfish'
import {RegTestDocker} from "@defichain/testcontainers";

describe('Mining', () => {
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

  it('getMintingInfo', async () => {
    const client = Jellyfish.jsonrpc(await node.getRpcUrl())
    const result = await client.mining.getMintingInfo()
    expect(result.chain).toBe('regtest')
  })
})
