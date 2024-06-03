import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Wallet with masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should throw error when number of keys provided =/= nrequired', async () => {
    const n = 3
    const pubKeyA = await client.wallet.getNewAddress()
    const pubKeyB = await client.wallet.getNewAddress()
    const keys = [pubKeyA, pubKeyB]

    const promise = await client.wallet.addMultiSigAddress(n, keys)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -8,
        message: 'not enough keys supplied (got 2 keys, but need at least 3 to redeem)',
        method: 'addmultisigaddress'
      }
    })
  })

  it('should throw error when public key provided is invalid', async () => {
    const n = 3
    const pubKey = ['invalid key']

    const promise = await client.wallet.addMultiSigAddress(n, pubKey)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toMatchObject({
      payload: {
        code: -5,
        message: 'Invalid address: invalid key',
        method: 'addmultisigaddress'
      }
    })
  })
})
