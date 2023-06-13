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

  it('should getNewAddress', async () => {
    return await waitForExpect(async () => {
      const address = await client.wallet.getNewAddress()

      expect(typeof address).toStrictEqual('string')
    })
  })

  it('should getNewAddress with label', async () => {
    return await waitForExpect(async () => {
      const aliceAddress = await client.wallet.getNewAddress('alice')

      expect(typeof aliceAddress).toStrictEqual('string')
    })
  })

  it('should getNewAddress with address type specified', async () => {
    return await waitForExpect(async () => {
      const legacyAddress = await client.wallet.getNewAddress('', wallet.AddressType.LEGACY)
      const legacyAddressValidateResult = await client.wallet.validateAddress(legacyAddress)

      const p2shSegwitAddress = await client.wallet.getNewAddress('', wallet.AddressType.P2SH_SEGWIT)
      const p2shSegwitAddressValidateResult = await client.wallet.validateAddress(p2shSegwitAddress)

      const bech32Address = await client.wallet.getNewAddress('bob', wallet.AddressType.BECH32)
      const bech32AddressValidateResult = await client.wallet.validateAddress(bech32Address)

      const ethAddress = await client.wallet.getNewAddress('eth', wallet.AddressType.ETH)
      const ethAddressValidateResult = await client.wallet.validateAddress(ethAddress)

      expect(typeof legacyAddress).toStrictEqual('string')
      expect(legacyAddressValidateResult.isvalid).toStrictEqual(true)
      expect(legacyAddressValidateResult.address).toStrictEqual(legacyAddress)
      expect(typeof legacyAddressValidateResult.scriptPubKey).toStrictEqual('string')
      expect(legacyAddressValidateResult.isscript).toStrictEqual(false)
      expect(legacyAddressValidateResult.iswitness).toStrictEqual(false)

      expect(typeof p2shSegwitAddress).toStrictEqual('string')
      expect(p2shSegwitAddressValidateResult.isvalid).toStrictEqual(true)
      expect(p2shSegwitAddressValidateResult.address).toStrictEqual(p2shSegwitAddress)
      expect(typeof p2shSegwitAddressValidateResult.scriptPubKey).toStrictEqual('string')
      expect(p2shSegwitAddressValidateResult.isscript).toStrictEqual(true)
      expect(p2shSegwitAddressValidateResult.iswitness).toStrictEqual(false)

      expect(typeof bech32Address).toStrictEqual('string')
      expect(bech32AddressValidateResult.isvalid).toStrictEqual(true)
      expect(bech32AddressValidateResult.address).toStrictEqual(bech32Address)
      expect(typeof bech32AddressValidateResult.scriptPubKey).toStrictEqual('string')
      expect(bech32AddressValidateResult.isscript).toStrictEqual(false)
      expect(bech32AddressValidateResult.iswitness).toStrictEqual(true)

      expect(typeof ethAddress).toStrictEqual('string')
      expect(ethAddressValidateResult.isvalid).toStrictEqual(true)
      expect(ethAddressValidateResult.address).toStrictEqual(ethAddress)
      expect(typeof ethAddressValidateResult.scriptPubKey).toStrictEqual('string')
      expect(ethAddressValidateResult.isscript).toStrictEqual(false)
      expect(ethAddressValidateResult.iswitness).toStrictEqual(true)
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

  it('should getNewAddress', async () => {
    return await waitForExpect(async () => {
      const address = await client.wallet.getNewAddress()

      expect(typeof address).toStrictEqual('string')
    })
  })

  it('should getNewAddress with label', async () => {
    return await waitForExpect(async () => {
      const aliceAddress = await client.wallet.getNewAddress('alice')

      expect(typeof aliceAddress).toStrictEqual('string')
    })
  })

  it('should getNewAddress with address type specified', async () => {
    return await waitForExpect(async () => {
      const legacyAddress = await client.wallet.getNewAddress('', wallet.AddressType.LEGACY)
      const legacyAddressValidateResult = await client.wallet.validateAddress(legacyAddress)

      const p2shSegwitAddress = await client.wallet.getNewAddress('', wallet.AddressType.P2SH_SEGWIT)
      const p2shSegwitAddressValidateResult = await client.wallet.validateAddress(p2shSegwitAddress)

      const bech32Address = await client.wallet.getNewAddress('bob', wallet.AddressType.BECH32)
      const bech32AddressValidateResult = await client.wallet.validateAddress(bech32Address)

      expect(typeof legacyAddress).toStrictEqual('string')
      expect(legacyAddressValidateResult.isvalid).toStrictEqual(true)
      expect(legacyAddressValidateResult.address).toStrictEqual(legacyAddress)
      expect(typeof legacyAddressValidateResult.scriptPubKey).toStrictEqual('string')
      expect(legacyAddressValidateResult.isscript).toStrictEqual(false)
      expect(legacyAddressValidateResult.iswitness).toStrictEqual(false)

      expect(typeof p2shSegwitAddress).toStrictEqual('string')
      expect(p2shSegwitAddressValidateResult.isvalid).toStrictEqual(true)
      expect(p2shSegwitAddressValidateResult.address).toStrictEqual(p2shSegwitAddress)
      expect(typeof p2shSegwitAddressValidateResult.scriptPubKey).toStrictEqual('string')
      expect(p2shSegwitAddressValidateResult.isscript).toStrictEqual(true)
      expect(p2shSegwitAddressValidateResult.iswitness).toStrictEqual(false)

      expect(typeof bech32Address).toStrictEqual('string')
      expect(bech32AddressValidateResult.isvalid).toStrictEqual(true)
      expect(bech32AddressValidateResult.address).toStrictEqual(bech32Address)
      expect(typeof bech32AddressValidateResult.scriptPubKey).toStrictEqual('string')
      expect(bech32AddressValidateResult.isscript).toStrictEqual(false)
      expect(bech32AddressValidateResult.iswitness).toStrictEqual(true)
    })
  })
})
