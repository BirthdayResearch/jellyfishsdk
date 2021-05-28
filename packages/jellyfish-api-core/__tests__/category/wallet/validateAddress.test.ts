import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import { wallet } from '../../../src'

describe('Address without masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should validateAddress', async () => {
    return await waitForExpect(async () => {
      const aliceAddress = await client.wallet.getNewAddress('alice')
      const result: wallet.ValidateAddressResult = await client.wallet.validateAddress(aliceAddress)

      expect(result.isvalid).toStrictEqual(true)
      expect(result.address).toStrictEqual(aliceAddress)
      expect(typeof result.scriptPubKey).toStrictEqual('string')
      expect(result.isscript).toStrictEqual(false)
      expect(result.iswitness).toStrictEqual(true)
    })
  })
})

describe('Address on masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should validateAddress', async () => {
    return await waitForExpect(async () => {
      const aliceAddress = await client.wallet.getNewAddress('alice')
      const result: wallet.ValidateAddressResult = await client.wallet.validateAddress(aliceAddress)

      expect(result.isvalid).toStrictEqual(true)
      expect(result.address).toStrictEqual(aliceAddress)
      expect(typeof result.scriptPubKey).toStrictEqual('string')
      expect(result.isscript).toStrictEqual(false)
      expect(result.iswitness).toStrictEqual(true)
    })
  })
})
