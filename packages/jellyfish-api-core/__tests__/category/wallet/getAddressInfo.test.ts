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

  it('should getAddressInfo', async () => {
    return await waitForExpect(async () => {
      const aliceAddress = await client.wallet.getNewAddress('alice')
      const addressInfo: wallet.AddressInfo = await client.wallet.getAddressInfo(aliceAddress)

      expect(addressInfo.address).toStrictEqual(aliceAddress)
      expect(typeof addressInfo.scriptPubKey).toStrictEqual('string')
      expect(addressInfo.ismine).toStrictEqual(true)
      expect(addressInfo.solvable).toStrictEqual(true)
      expect(typeof addressInfo.desc).toStrictEqual('string')
      expect(addressInfo.iswatchonly).toStrictEqual(false)
      expect(addressInfo.isscript).toStrictEqual(false)
      expect(addressInfo.iswitness).toStrictEqual(true)
      expect(typeof addressInfo.pubkey).toStrictEqual('string')
      expect(addressInfo.label).toStrictEqual('alice')
      expect(addressInfo.ischange).toStrictEqual(false)
      expect(typeof addressInfo.timestamp).toStrictEqual('number')
      expect(typeof addressInfo.hdkeypath).toStrictEqual('string')
      expect(typeof addressInfo.hdseedid).toStrictEqual('string')
      expect(addressInfo.labels.length).toBeGreaterThanOrEqual(1)
      expect(addressInfo.labels[0].name).toStrictEqual('alice')
      expect(addressInfo.labels[0].purpose).toStrictEqual('receive')
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

  it('should getAddressInfo', async () => {
    return await waitForExpect(async () => {
      const aliceAddress = await client.wallet.getNewAddress('alice')
      const addressInfo: wallet.AddressInfo = await client.wallet.getAddressInfo(aliceAddress)

      expect(addressInfo.address).toStrictEqual(aliceAddress)
      expect(typeof addressInfo.scriptPubKey).toStrictEqual('string')
      expect(addressInfo.ismine).toStrictEqual(true)
      expect(addressInfo.solvable).toStrictEqual(true)
      expect(typeof addressInfo.desc).toStrictEqual('string')
      expect(addressInfo.iswatchonly).toStrictEqual(false)
      expect(addressInfo.isscript).toStrictEqual(false)
      expect(addressInfo.iswitness).toStrictEqual(true)
      expect(typeof addressInfo.pubkey).toStrictEqual('string')
      expect(addressInfo.label).toStrictEqual('alice')
      expect(addressInfo.ischange).toStrictEqual(false)
      expect(typeof addressInfo.timestamp).toStrictEqual('number')
      expect(typeof addressInfo.hdkeypath).toStrictEqual('string')
      expect(typeof addressInfo.hdseedid).toStrictEqual('string')
      expect(addressInfo.labels.length).toBeGreaterThanOrEqual(1)
      expect(addressInfo.labels[0].name).toStrictEqual('alice')
      expect(addressInfo.labels[0].purpose).toStrictEqual('receive')
    })
  })
})
