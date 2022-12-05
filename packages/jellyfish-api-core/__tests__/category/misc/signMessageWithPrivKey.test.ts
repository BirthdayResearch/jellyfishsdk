import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Verify message', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error if invalid private key', async () => {
    const promise = client.misc.signMessageWithPrivKey('cUp5EVEjuAGpemSuejP36TWWuFKzuCbUJ4QAKJTiSSB2vXzDLsJ', 'test')

    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Invalid private key',
        method: 'signmessagewithprivkey'
      }
    })
  })

  it('should sign with private key', async () => {
    const promise = client.misc.signMessageWithPrivKey('cRiRQ9cHmy5evDqNDdEV8f6zfbK6epi9Fpz4CRZsmLEmkwy54dWz', 'test')
    await expect(promise).toBeTruthy()
  })
})
