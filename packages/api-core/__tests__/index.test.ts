import { MintingInfo, ApiClient, JellyfishClientError } from '../src'
import { ContainerAdapterClient } from './container_adapter_client'
import { RegTestContainer } from '@defichain/testcontainers'

class TestClient extends ApiClient {
  async call<T> (method: string, payload: any[]): Promise<T> {
    throw new JellyfishClientError('error from client')
  }
}

it('should export client', async () => {
  const client = new TestClient()
  await expect(client.call('fail', []))
    .rejects.toThrowError(JellyfishClientError)
})

it('should export categories', async () => {
  const client = new TestClient()
  await expect(async () => {
    const info: MintingInfo = await client.mining.getMintingInfo()
    console.log(info)
  }).rejects.toThrowError(JellyfishClientError)
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
    await expect(client.call('invalid', [], 'lossless'))
      .rejects.toThrowError(/JellyfishRPCError: 'Method not found', code: -32601/)
  })

  it('importprivkey should throw -5 with message as structured', async () => {
    await expect(client.call('importprivkey', ['invalid-key'], 'lossless'))
      .rejects.toThrowError(/JellyfishRPCError: 'Invalid private key encoding', code: -5/)
  })
})
