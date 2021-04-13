import { ContainerAdapterClient } from '../container_adapter_client'
import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { BigNumber, ValidateAddressResult, AddressType } from '../../src'
import waitForExpect from 'wait-for-expect'

describe.only('non masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)
  let address = ''

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  describe('getBalance', () => {
    it('should getBalance = 0', async () => {
      const balance: BigNumber = await client.wallet.getBalance()

      expect(balance.toString()).toBe('0')
    })
  })

  describe('getNewAddress', () => {
    it('should getNewAddress', async () => {
      return await waitForExpect(async () => {
        address = await client.wallet.getNewAddress()

        expect(typeof address).toBe('string')
      })
    })

    it('should getNewAddress with label', async () => {
      return await waitForExpect(async () => {
        address = await client.wallet.getNewAddress('alice')

        expect(typeof address).toBe('string')
      })
    })

    it('should getNewAddress with address type specified', async () => {
      return await waitForExpect(async () => {
        const legacyAddress = await client.wallet.getNewAddress('', AddressType.LEGACY)
        const legacyAddressValidateResult = await client.wallet.validateAddress(legacyAddress)

        const p2shSegwitAddress = await client.wallet.getNewAddress('', AddressType['P2SH-SEGWIT'])
        const p2shSegwitAddressValidateResult = await client.wallet.validateAddress(p2shSegwitAddress)

        const bech32Address = await client.wallet.getNewAddress('bob', AddressType.BECH32)
        const bech32AddressValidateResult = await client.wallet.validateAddress(bech32Address)

        expect(typeof legacyAddress).toBe('string')
        expect(legacyAddressValidateResult.isvalid).toBe(true)
        expect(legacyAddressValidateResult.address).toBe(legacyAddress)
        expect(typeof legacyAddressValidateResult.scriptPubKey).toBe('string')
        expect(legacyAddressValidateResult.isscript).toBe(false)
        expect(legacyAddressValidateResult.iswitness).toBe(false)

        expect(typeof p2shSegwitAddress).toBe('string')
        expect(p2shSegwitAddressValidateResult.isvalid).toBe(true)
        expect(p2shSegwitAddressValidateResult.address).toBe(p2shSegwitAddress)
        expect(typeof p2shSegwitAddressValidateResult.scriptPubKey).toBe('string')
        expect(p2shSegwitAddressValidateResult.isscript).toBe(true)
        expect(p2shSegwitAddressValidateResult.iswitness).toBe(false)

        expect(typeof bech32Address).toBe('string')
        expect(bech32AddressValidateResult.isvalid).toBe(true)
        expect(bech32AddressValidateResult.address).toBe(bech32Address)
        expect(typeof bech32AddressValidateResult.scriptPubKey).toBe('string')
        expect(bech32AddressValidateResult.isscript).toBe(false)
        expect(bech32AddressValidateResult.iswitness).toBe(true)
      })
    })
  })

  describe('validateAddress', () => {
    it('should validateAddress', async () => {
      return await waitForExpect(async () => {
        const result: ValidateAddressResult = await client.wallet.validateAddress(address)

        expect(result.isvalid).toBe(true)
        expect(result.address).toBe(address)
        expect(typeof result.scriptPubKey).toBe('string')
        expect(result.isscript).toBe(true)
        expect(result.iswitness).toBe(false)
      })
    })
  })
})

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)
  let address = ''

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  describe('getBalance', () => {
    it('should getBalance >= 100', async () => {
      return await waitForExpect(async () => {
        const balance: BigNumber = await client.wallet.getBalance()
        expect(balance.isGreaterThan(new BigNumber('100'))).toBe(true)
      })
    })
  })

  describe('getNewAddress', () => {
    it('should getNewAddress', async () => {
      return await waitForExpect(async () => {
        address = await client.wallet.getNewAddress()

        expect(typeof address).toBe('string')
      })
    })

    it('should getNewAddress with label', async () => {
      return await waitForExpect(async () => {
        address = await client.wallet.getNewAddress('alice')

        expect(typeof address).toBe('string')
      })
    })

    it('should getNewAddress with address type specified', async () => {
      return await waitForExpect(async () => {
        const legacyAddress = await client.wallet.getNewAddress('', AddressType.LEGACY)
        const legacyAddressValidateResult = await client.wallet.validateAddress(legacyAddress)

        const p2shSegwitAddress = await client.wallet.getNewAddress('', AddressType['P2SH-SEGWIT'])
        const p2shSegwitAddressValidateResult = await client.wallet.validateAddress(p2shSegwitAddress)

        const bech32Address = await client.wallet.getNewAddress('bob', AddressType.BECH32)
        const bech32AddressValidateResult = await client.wallet.validateAddress(bech32Address)

        expect(typeof legacyAddress).toBe('string')
        expect(legacyAddressValidateResult.isvalid).toBe(true)
        expect(legacyAddressValidateResult.address).toBe(legacyAddress)
        expect(typeof legacyAddressValidateResult.scriptPubKey).toBe('string')
        expect(legacyAddressValidateResult.isscript).toBe(false)
        expect(legacyAddressValidateResult.iswitness).toBe(false)

        expect(typeof p2shSegwitAddress).toBe('string')
        expect(p2shSegwitAddressValidateResult.isvalid).toBe(true)
        expect(p2shSegwitAddressValidateResult.address).toBe(p2shSegwitAddress)
        expect(typeof p2shSegwitAddressValidateResult.scriptPubKey).toBe('string')
        expect(p2shSegwitAddressValidateResult.isscript).toBe(true)
        expect(p2shSegwitAddressValidateResult.iswitness).toBe(false)

        expect(typeof bech32Address).toBe('string')
        expect(bech32AddressValidateResult.isvalid).toBe(true)
        expect(bech32AddressValidateResult.address).toBe(bech32Address)
        expect(typeof bech32AddressValidateResult.scriptPubKey).toBe('string')
        expect(bech32AddressValidateResult.isscript).toBe(false)
        expect(bech32AddressValidateResult.iswitness).toBe(true)
      })
    })
  })

  describe('validateAddress', () => {
    it('should validateAddress', async () => {
      return await waitForExpect(async () => {
        const result: ValidateAddressResult = await client.wallet.validateAddress(address)

        expect(result.isvalid).toBe(true)
        expect(result.address).toBe(address)
        expect(typeof result.scriptPubKey).toBe('string')
        expect(result.isscript).toBe(true)
        expect(result.iswitness).toBe(false)
      })
    })
  })

  // describe('sendToAddress', () => {
  //   it('should sendToAddress', async () => {
  //     return await waitForExpect(async () => {
  //       // const transactionId = await client.wallet.sendToAddress()
  //       // console.log('transactionId: ', transactionId)
  //     })
  //   })
  // })
})
