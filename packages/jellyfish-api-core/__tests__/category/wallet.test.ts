import { ContainerAdapterClient } from '../container_adapter_client'
import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { BigNumber, wallet } from '../../src'
import waitForExpect from 'wait-for-expect'
import { UTXO, ListUnspentOptions, WalletFlag, SendToAddressOptions, Mode } from '../../src/category/wallet'

describe('non masternode', () => {
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

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
        const address = await client.wallet.getNewAddress()

        expect(typeof address).toBe('string')
      })
    })

    it('should getNewAddress with label', async () => {
      return await waitForExpect(async () => {
        const aliceAddress = await client.wallet.getNewAddress('alice')

        expect(typeof aliceAddress).toBe('string')
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

  describe('getAddressInfo', () => {
    it('should getAddressInfo', async () => {
      return await waitForExpect(async () => {
        const aliceAddress = await client.wallet.getNewAddress('alice')
        const addressInfo: wallet.AddressInfo = await client.wallet.getAddressInfo(aliceAddress)

        expect(addressInfo.address).toBe(aliceAddress)
        expect(typeof addressInfo.scriptPubKey).toBe('string')
        expect(addressInfo.ismine).toBe(true)
        expect(addressInfo.solvable).toBe(true)
        expect(typeof addressInfo.desc).toBe('string')
        expect(addressInfo.iswatchonly).toBe(false)
        expect(addressInfo.isscript).toBe(false)
        expect(addressInfo.iswitness).toBe(true)
        expect(typeof addressInfo.pubkey).toBe('string')
        expect(addressInfo.label).toBe('alice')
        expect(addressInfo.ischange).toBe(false)
        expect(typeof addressInfo.timestamp).toBe('number')
        expect(typeof addressInfo.hdkeypath).toBe('string')
        expect(typeof addressInfo.hdseedid).toBe('string')
        expect(addressInfo.labels.length).toBeGreaterThanOrEqual(1)
        expect(addressInfo.labels[0].name).toBe('alice')
        expect(addressInfo.labels[0].purpose).toBe('receive')
      })
    })
  })

  describe('validateAddress', () => {
    it('should validateAddress', async () => {
      return await waitForExpect(async () => {
        const aliceAddress = await client.wallet.getNewAddress('alice')
        const result: wallet.ValidateAddressResult = await client.wallet.validateAddress(aliceAddress)

        expect(result.isvalid).toBe(true)
        expect(result.address).toBe(aliceAddress)
        expect(typeof result.scriptPubKey).toBe('string')
        expect(result.isscript).toBe(false)
        expect(result.iswitness).toBe(true)
      })
    })
  })

  describe('listAddressGroupings', () => {
    it('should listAddressGroupings', async () => {
      return await waitForExpect(async () => {
        const data = await client.wallet.listAddressGroupings()

        expect(data.length === 0).toBe(true)
      })
    })
  })

  describe('getWalletInfo', () => {
    it('should getWalletInfo', async () => {
      return await waitForExpect(async () => {
        const walletInfo = await client.wallet.getWalletInfo()

        expect(walletInfo.walletname).toBe('')
        expect(walletInfo.walletversion).toBe(169900)
        expect(walletInfo.balance instanceof BigNumber).toBe(true)
        expect(walletInfo.balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toBe(true)
        expect(walletInfo.unconfirmed_balance instanceof BigNumber).toBe(true)
        expect(walletInfo.unconfirmed_balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toBe(true)
        expect(walletInfo.immature_balance instanceof BigNumber).toBe(true)
        expect(walletInfo.immature_balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toBe(true)
        expect(walletInfo.txcount).toBeGreaterThanOrEqual(0)
        expect(typeof walletInfo.keypoololdest).toBe('number')
        expect(typeof walletInfo.keypoolsize).toBe('number')
        expect(typeof walletInfo.keypoolsize_hd_internal).toBe('number')
        expect(walletInfo.paytxfee instanceof BigNumber).toBe(true)
        expect(walletInfo.paytxfee.isGreaterThanOrEqualTo(new BigNumber('0'))).toBe(true)
        expect(typeof walletInfo.hdseedid).toBe('string')
        expect(walletInfo.private_keys_enabled).toBe(true)
        expect(walletInfo.avoid_reuse).toBe(false)
        expect(walletInfo.scanning).toBe(false)
      })
    })
  })

  describe('setWalletFlag', () => {
    it('should setWalletFlag', async () => {
      return await waitForExpect(async () => {
        const walletInfoBefore = await client.wallet.getWalletInfo()
        expect(walletInfoBefore.avoid_reuse).toBe(false)

        const result = await client.wallet.setWalletFlag(WalletFlag.AVOID_REUSE)
        expect(result.flag_name).toBe('avoid_reuse')
        expect(result.flag_state).toBe(true)
        expect(result.warnings).toBe('You need to rescan the blockchain in order to correctly mark used destinations in the past. Until this is done, some destinations may be considered unused, even if the opposite is the case.')

        const walletInfoAfter = await client.wallet.getWalletInfo()
        expect(walletInfoAfter.avoid_reuse).toBe(true)
      })
    })
  })

  describe('createWallet', () => {
    it('should createWallet', async () => {
      return await waitForExpect(async () => {
        const wallet = await client.wallet.createWallet('alice')

        expect(wallet.name).toBe('alice')
        expect(wallet.warning).toBe('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })

    it('should createWallet with disablePrivateKeys true', async () => {
      return await waitForExpect(async () => {
        const wallet = await client.wallet.createWallet('bob', true)

        expect(wallet.name).toBe('bob')
        expect(wallet.warning).toBe('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })

    it('should createWallet with blank true', async () => {
      return await waitForExpect(async () => {
        const options = { blank: true }
        const wallet = await client.wallet.createWallet('charlie', false, options)

        expect(wallet.name).toBe('charlie')
        expect(wallet.warning).toBe('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })

    it('should createWallet with passphrase', async () => {
      return await waitForExpect(async () => {
        const options = { passphrase: 'shhh...' }
        const wallet = await client.wallet.createWallet('david', false, options)

        expect(wallet.name).toBe('david')
        expect(wallet.warning).toBe('')
      })
    })

    it('should createWallet with avoidReuse true', async () => {
      return await waitForExpect(async () => {
        const options = { avoidReuse: true }
        const wallet = await client.wallet.createWallet('eve', false, options)

        expect(wallet.name).toBe('eve')
        expect(wallet.warning).toBe('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })
  })
})

describe('masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

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

  describe('listUnspent', () => {
    it('should listUnspent', async () => {
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent()
        expect(utxos.length).toBeGreaterThan(0)
        for (let i = 0; i < utxos.length; i += 1) {
          const utxo = utxos[i]
          expect(typeof utxo.txid).toBe('string')
          expect(typeof utxo.vout).toBe('number')
          expect(typeof utxo.address).toBe('string')
          expect(typeof utxo.label).toBe('string')
          expect(typeof utxo.scriptPubKey).toBe('string')
          expect(utxo.amount instanceof BigNumber).toBe(true)
          expect(typeof utxo.tokenId).toBe('string')
          expect(typeof utxo.confirmations).toBe('number')
          expect(typeof utxo.spendable).toBe('boolean')
          expect(typeof utxo.solvable).toBe('boolean')
          expect(typeof utxo.desc).toBe('string')
          expect(typeof utxo.safe).toBe('boolean')
        }
      })
    })

    it('test listUnspent minimumConfirmation filter', async () => {
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(99)
        utxos.forEach(utxo => {
          expect(utxo.confirmations).toBeGreaterThanOrEqual(99)
        })
      })
    })

    it('test listUnspent maximumConfirmation filter', async () => {
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(1, 300)
        utxos.forEach(utxo => {
          expect(utxo.confirmations).toBeLessThanOrEqual(300)
        })
      })
    })

    it('test listUnspent addresses filter', async () => {
      const options: ListUnspentOptions = {
        addresses: ['mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU']
      }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(1, 9999999, options)
        utxos.forEach(utxo => {
          expect(utxo.address).toBe('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
        })
      })
    })

    it('test listUnspent includeUnsafe filter', async () => {
      const options: ListUnspentOptions = { includeUnsafe: false }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(1, 9999999, options)
        utxos.forEach(utxo => {
          expect(utxo.safe).toBe(true)
        })
      })
    })

    it('test listUnspent queryOptions minimumAmount filter', async () => {
      const options: ListUnspentOptions = { queryOptions: { minimumAmount: 5 } }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(1, 9999999, options)
        utxos.forEach(utxo => {
          expect(utxo.amount.isGreaterThanOrEqualTo(new BigNumber('5'))).toBe(true)
        })
      })
    })

    it('test listUnspent queryOptions maximumAmount filter', async () => {
      const options: ListUnspentOptions = { queryOptions: { maximumAmount: 100 } }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(1, 9999999, options)
        utxos.forEach(utxo => {
          expect(utxo.amount.isLessThanOrEqualTo(new BigNumber('100'))).toBe(true)
        })
      })
    })

    it('test listUnspent queryOptions maximumCount filter', async () => {
      const options: ListUnspentOptions = { queryOptions: { maximumCount: 100 } }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(1, 9999999, options)
        expect(utxos.length).toBeLessThanOrEqual(100)
      })
    })

    it('test listUnspent queryOptions minimumSumAmount filter', async () => {
      const options: ListUnspentOptions = { queryOptions: { minimumSumAmount: 100 } }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(1, 9999999, options)
        const sum: BigNumber = utxos.map(utxo => utxo.amount).reduce((acc, val) => acc.plus(val))
        expect(sum.isGreaterThanOrEqualTo(new BigNumber('100'))).toBe(true)
      })
    })

    it('test listUnspent queryOptions tokenId filter', async () => {
      const options: ListUnspentOptions = { queryOptions: { tokenId: '0' } }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(1, 9999999, options)
        utxos.forEach(utxo => {
          expect(utxo.tokenId).toBe('0')
        })
      })
    })
  })

  describe('getNewAddress', () => {
    it('should getNewAddress', async () => {
      return await waitForExpect(async () => {
        const address = await client.wallet.getNewAddress()

        expect(typeof address).toBe('string')
      })
    })

    it('should getNewAddress with label', async () => {
      return await waitForExpect(async () => {
        const aliceAddress = await client.wallet.getNewAddress('alice')

        expect(typeof aliceAddress).toBe('string')
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

  describe('getAddressInfo', () => {
    it('should getAddressInfo', async () => {
      return await waitForExpect(async () => {
        const aliceAddress = await client.wallet.getNewAddress('alice')
        const addressInfo: wallet.AddressInfo = await client.wallet.getAddressInfo(aliceAddress)

        expect(addressInfo.address).toBe(aliceAddress)
        expect(typeof addressInfo.scriptPubKey).toBe('string')
        expect(addressInfo.ismine).toBe(true)
        expect(addressInfo.solvable).toBe(true)
        expect(typeof addressInfo.desc).toBe('string')
        expect(addressInfo.iswatchonly).toBe(false)
        expect(addressInfo.isscript).toBe(false)
        expect(addressInfo.iswitness).toBe(true)
        expect(typeof addressInfo.pubkey).toBe('string')
        expect(addressInfo.label).toBe('alice')
        expect(addressInfo.ischange).toBe(false)
        expect(typeof addressInfo.timestamp).toBe('number')
        expect(typeof addressInfo.hdkeypath).toBe('string')
        expect(typeof addressInfo.hdseedid).toBe('string')
        expect(addressInfo.labels.length).toBeGreaterThanOrEqual(1)
        expect(addressInfo.labels[0].name).toBe('alice')
        expect(addressInfo.labels[0].purpose).toBe('receive')
      })
    })
  })

  describe('validateAddress', () => {
    it('should validateAddress', async () => {
      return await waitForExpect(async () => {
        const aliceAddress = await client.wallet.getNewAddress('alice')
        const result: wallet.ValidateAddressResult = await client.wallet.validateAddress(aliceAddress)

        expect(result.isvalid).toBe(true)
        expect(result.address).toBe(aliceAddress)
        expect(typeof result.scriptPubKey).toBe('string')
        expect(result.isscript).toBe(false)
        expect(result.iswitness).toBe(true)
      })
    })
  })

  describe('listAddressGroupings', () => {
    it('should listAddressGroupings', async () => {
      return await waitForExpect(async () => {
        const data = await client.wallet.listAddressGroupings()

        expect(data[0][0][0]).toBe('mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy')
        expect(data[0][0][1] instanceof BigNumber).toBe(true)
        expect(data[0][0][1].isGreaterThanOrEqualTo(new BigNumber('0'))).toBe(true)
        expect(data[0][0][2]).toBe('coinbase')

        expect(data[1][0][0]).toBe('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
        expect(data[1][0][1] instanceof BigNumber).toBe(true)
        expect(data[1][0][1].isGreaterThanOrEqualTo(new BigNumber('0'))).toBe(true)
        expect(data[1][0][2]).toBe('coinbase')
      })
    })
  })

  describe('getWalletInfo', () => {
    it('should getWalletInfo', async () => {
      return await waitForExpect(async () => {
        const walletInfo = await client.wallet.getWalletInfo()

        expect(walletInfo.walletname).toBe('')
        expect(walletInfo.walletversion).toBe(169900)
        expect(walletInfo.balance instanceof BigNumber).toBe(true)
        expect(walletInfo.balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toBe(true)
        expect(walletInfo.unconfirmed_balance instanceof BigNumber).toBe(true)
        expect(walletInfo.unconfirmed_balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toBe(true)
        expect(walletInfo.immature_balance instanceof BigNumber).toBe(true)
        expect(walletInfo.immature_balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toBe(true)
        expect(walletInfo.txcount).toBeGreaterThanOrEqual(100)
        expect(typeof walletInfo.keypoololdest).toBe('number')
        expect(typeof walletInfo.keypoolsize).toBe('number')
        expect(typeof walletInfo.keypoolsize_hd_internal).toBe('number')
        expect(walletInfo.paytxfee instanceof BigNumber).toBe(true)
        expect(walletInfo.paytxfee.isGreaterThanOrEqualTo(new BigNumber('0'))).toBe(true)
        expect(typeof walletInfo.hdseedid).toBe('string')
        expect(walletInfo.private_keys_enabled).toBe(true)
        expect(walletInfo.avoid_reuse).toBe(false)
        expect(walletInfo.scanning).toBe(false)
      })
    })
  })

  describe('setWalletFlag', () => {
    it('should setWalletFlag', async () => {
      return await waitForExpect(async () => {
        const walletInfoBefore = await client.wallet.getWalletInfo()
        expect(walletInfoBefore.avoid_reuse).toBe(false)

        const result = await client.wallet.setWalletFlag(WalletFlag.AVOID_REUSE)
        expect(result.flag_name).toBe('avoid_reuse')
        expect(result.flag_state).toBe(true)
        expect(result.warnings).toBe('You need to rescan the blockchain in order to correctly mark used destinations in the past. Until this is done, some destinations may be considered unused, even if the opposite is the case.')

        const walletInfoAfter = await client.wallet.getWalletInfo()
        expect(walletInfoAfter.avoid_reuse).toBe(true)
      })
    })
  })

  describe('sendToAddress', () => {
    const address = 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU'

    it('should sendToAddress', async () => {
      return await waitForExpect(async () => {
        const transactionId = await client.wallet.sendToAddress(address, 0.00001)

        expect(typeof transactionId).toBe('string')
      })
    })

    it('should sendToAddress with comment and commentTo', async () => {
      return await waitForExpect(async () => {
        const options: SendToAddressOptions = {
          comment: 'pizza',
          commentTo: 'domino'
        }
        const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

        expect(typeof transactionId).toBe('string')
      })
    })

    it('should sendToAddress with replaceable', async () => {
      return await waitForExpect(async () => {
        const options: SendToAddressOptions = {
          replaceable: true
        }
        const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

        expect(typeof transactionId).toBe('string')
      })
    })

    it('should sendToAddress with confTarget', async () => {
      return await waitForExpect(async () => {
        const options: SendToAddressOptions = {
          confTarget: 60
        }
        const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

        expect(typeof transactionId).toBe('string')
      })
    })

    it('should sendToAddress with estimateMode', async () => {
      return await waitForExpect(async () => {
        const options: SendToAddressOptions = {
          estimateMode: Mode.ECONOMICAL
        }
        const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

        expect(typeof transactionId).toBe('string')
      })
    })

    it('should sendToAddress with avoidReuse', async () => {
      return await waitForExpect(async () => {
        const options: SendToAddressOptions = {
          avoidReuse: false
        }
        const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

        expect(typeof transactionId).toBe('string')
      })
    })
  })

  describe('createWallet', () => {
    it('should createWallet', async () => {
      return await waitForExpect(async () => {
        const wallet = await client.wallet.createWallet('alice')

        expect(wallet.name).toBe('alice')
        expect(wallet.warning).toBe('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })

    it('should createWallet with disablePrivateKeys true', async () => {
      return await waitForExpect(async () => {
        const wallet = await client.wallet.createWallet('bob', true)

        expect(wallet.name).toBe('bob')
        expect(wallet.warning).toBe('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })

    it('should createWallet with blank true', async () => {
      return await waitForExpect(async () => {
        const options = { blank: true }
        const wallet = await client.wallet.createWallet('charlie', false, options)

        expect(wallet.name).toBe('charlie')
        expect(wallet.warning).toBe('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })

    it('should createWallet with passphrase', async () => {
      return await waitForExpect(async () => {
        const options = { passphrase: 'shhh...' }
        const wallet = await client.wallet.createWallet('david', false, options)

        expect(wallet.name).toBe('david')
        expect(wallet.warning).toBe('')
      })
    })

    it('should createWallet with avoidReuse true', async () => {
      return await waitForExpect(async () => {
        const options = { avoidReuse: true }
        const wallet = await client.wallet.createWallet('eve', false, options)

        expect(wallet.name).toBe('eve')
        expect(wallet.warning).toBe('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })
  })
})
