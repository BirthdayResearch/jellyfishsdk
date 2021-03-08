import { MintingInfo, JellyfishError, JellyfishClient } from '../src/core'
import { ContainerAdapterClient } from './category/container_adapter_client'
import { RegTestContainer } from '@defichain/testcontainers'

class TestClient extends JellyfishClient {
  async call<T> (method: string, payload: any[]): Promise<T> {
    throw new JellyfishError({
      code: 1, message: 'error message from node'
    })
  }
}

it('should export client', async () => {
  const client = new TestClient()
  return await expect(client.call('fail', []))
    .rejects.toThrowError(JellyfishError)
})

it('should export categories', async () => {
  const client = new TestClient()
  return await expect(async () => {
    const info: MintingInfo = await client.mining.getMintingInfo()
    console.log(info)
  }).rejects.toThrowError(JellyfishError)
})

describe('JellyfishError handling', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('invalid method should throw -32601 with message as structured', async () => {
    return await expect(client.call('invalid', []))
      .rejects.toThrowError(/JellyfishError from RPC: 'Method not found', code: -32601/)
  })

  it('importprivkey should throw -5 with message as structured', async () => {
    return await expect(client.call('importprivkey', ['invalid-key']))
      .rejects.toThrowError(/JellyfishError from RPC: 'Invalid private key encoding', code: -5/)
  })
})
