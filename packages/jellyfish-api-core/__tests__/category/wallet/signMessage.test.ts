import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Sign Message', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if private key is not available', async () => {
    const promise = client.wallet.signMessage('mpLQjfK79b7CCV4VMJWEWAj5Mpx8Up5zxB', 'This is a test message')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -4,
        message: 'Private key not available',
        method: 'signmessage'
      }
    })
  })

  it('should throw error if address is invalid', async () => {
    const promise = client.wallet.signMessage('test', 'This is a test message')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -3,
        message: 'Invalid address',
        method: 'signmessage'
      }
    })
  })
})
