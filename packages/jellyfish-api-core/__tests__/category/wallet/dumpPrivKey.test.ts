import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'

describe('DumpPrivKey', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(101)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should reveal private key of given address', async () => {
    await waitForExpect(async () => {
      const address = 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU'
      const privateKey = await client.wallet.dumpPrivKey(address)

      expect(typeof privateKey).toStrictEqual('string')
      expect(privateKey).toStrictEqual('cRiRQ9cHmy5evDqNDdEV8f6zfbK6epi9Fpz4CRZsmLEmkwy54dWz')
    })
  })

  it('should throw and error when invalid DFI address is provided', async () => {
    await waitForExpect(async () => {
      const invalidAddress = 'invalidAddress'

      await expect(client.wallet.dumpPrivKey(invalidAddress)).rejects.toThrow('Invalid Defi address')
    })
  })
})
