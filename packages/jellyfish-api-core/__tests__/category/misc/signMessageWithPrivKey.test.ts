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
    const privkey = await client.wallet.dumpPrivKey(await client.wallet.getNewAddress())
    const promise = client.misc.signMessageWithPrivKey(privkey.substr(1, 7), 'test')

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
    const privkey = await client.wallet.dumpPrivKey(await client.wallet.getNewAddress())
    const promise = client.misc.signMessageWithPrivKey(privkey, 'test')
    await expect(promise).toBeTruthy()
  })
})
