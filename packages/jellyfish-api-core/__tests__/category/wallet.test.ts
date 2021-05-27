import { ContainerAdapterClient } from '../container_adapter_client'
import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { BigNumber, wallet } from '../../src'
import waitForExpect from 'wait-for-expect'
import {
  UTXO,
  ListUnspentOptions,
  WalletFlag,
  SendToAddressOptions,
  Mode,
  SendManyOptions
} from '../../src/category/wallet'

describe('getBalance', () => {
  describe('regtest', () => {
    const container = new RegTestContainer()
    const client = new ContainerAdapterClient(container)

    beforeAll(async () => {
      await container.start()
      await container.waitForReady()
    })

    afterAll(async () => {
      await container.stop()
    })

    it('should getBalance = 0', async () => {
      const balance: BigNumber = await client.wallet.getBalance()
      expect(balance.toString()).toStrictEqual('0')
    })
  })

  describe('masternode', () => {
    const container = new MasterNodeRegTestContainer()
    const client = new ContainerAdapterClient(container)

    beforeAll(async () => {
      await container.start()
      await container.waitForReady()
      await container.waitForWalletCoinbaseMaturity()
      await container.waitForWalletBalanceGTE(100)
    })

    afterAll(async () => {
      await container.stop()
    })

    it('should getBalance >= 100', async () => {
      const balance: BigNumber = await client.wallet.getBalance()
      expect(balance.isGreaterThan(new BigNumber('100'))).toStrictEqual(true)
    })
  })
})

describe('setWalletFlag', () => {
  describe('regtest', () => {
    const container = new RegTestContainer()
    const client = new ContainerAdapterClient(container)

    beforeAll(async () => {
      await container.start()
      await container.waitForReady()
    })

    afterAll(async () => {
      await container.stop()
    })

    it('should setWalletFlag', async () => {
      return await waitForExpect(async () => {
        const walletInfoBefore = await client.wallet.getWalletInfo()
        expect(walletInfoBefore.avoid_reuse).toStrictEqual(false)

        const result = await client.wallet.setWalletFlag(WalletFlag.AVOID_REUSE)
        expect(result.flag_name).toStrictEqual('avoid_reuse')
        expect(result.flag_state).toStrictEqual(true)
        expect(result.warnings).toStrictEqual('You need to rescan the blockchain in order to correctly mark used destinations in the past. Until this is done, some destinations may be considered unused, even if the opposite is the case.')

        const walletInfoAfter = await client.wallet.getWalletInfo()
        expect(walletInfoAfter.avoid_reuse).toStrictEqual(true)
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

    it('should setWalletFlag', async () => {
      return await waitForExpect(async () => {
        const walletInfoBefore = await client.wallet.getWalletInfo()
        expect(walletInfoBefore.avoid_reuse).toStrictEqual(false)

        const result = await client.wallet.setWalletFlag(WalletFlag.AVOID_REUSE)
        expect(result.flag_name).toStrictEqual('avoid_reuse')
        expect(result.flag_state).toStrictEqual(true)
        expect(result.warnings).toStrictEqual('You need to rescan the blockchain in order to correctly mark used destinations in the past. Until this is done, some destinations may be considered unused, even if the opposite is the case.')

        const walletInfoAfter = await client.wallet.getWalletInfo()
        expect(walletInfoAfter.avoid_reuse).toStrictEqual(true)
      })
    })
  })
})

describe('createWallet', () => {
  describe('regtest', () => {
    const container = new RegTestContainer()
    const client = new ContainerAdapterClient(container)

    beforeAll(async () => {
      await container.start()
      await container.waitForReady()
    })

    afterAll(async () => {
      await container.stop()
    })

    it('should createWallet', async () => {
      return await waitForExpect(async () => {
        const wallet = await client.wallet.createWallet('alice')

        expect(wallet.name).toStrictEqual('alice')
        expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })

    it('should createWallet with disablePrivateKeys true', async () => {
      return await waitForExpect(async () => {
        const wallet = await client.wallet.createWallet('bob', true)

        expect(wallet.name).toStrictEqual('bob')
        expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })

    it('should createWallet with blank true', async () => {
      return await waitForExpect(async () => {
        const options = { blank: true }
        const wallet = await client.wallet.createWallet('charlie', false, options)

        expect(wallet.name).toStrictEqual('charlie')
        expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })

    it('should createWallet with passphrase', async () => {
      return await waitForExpect(async () => {
        const options = { passphrase: 'shhh...' }
        const wallet = await client.wallet.createWallet('david', false, options)

        expect(wallet.name).toStrictEqual('david')
        expect(wallet.warning).toStrictEqual('')
      })
    })

    it('should createWallet with avoidReuse true', async () => {
      return await waitForExpect(async () => {
        const options = { avoidReuse: true }
        const wallet = await client.wallet.createWallet('eve', false, options)

        expect(wallet.name).toStrictEqual('eve')
        expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
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

    it('should createWallet', async () => {
      return await waitForExpect(async () => {
        const wallet = await client.wallet.createWallet('alice')

        expect(wallet.name).toStrictEqual('alice')
        expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })

    it('should createWallet with disablePrivateKeys true', async () => {
      return await waitForExpect(async () => {
        const wallet = await client.wallet.createWallet('bob', true)

        expect(wallet.name).toStrictEqual('bob')
        expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })

    it('should createWallet with blank true', async () => {
      return await waitForExpect(async () => {
        const options = { blank: true }
        const wallet = await client.wallet.createWallet('charlie', false, options)

        expect(wallet.name).toStrictEqual('charlie')
        expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })

    it('should createWallet with passphrase', async () => {
      return await waitForExpect(async () => {
        const options = { passphrase: 'shhh...' }
        const wallet = await client.wallet.createWallet('david', false, options)

        expect(wallet.name).toStrictEqual('david')
        expect(wallet.warning).toStrictEqual('')
      })
    })

    it('should createWallet with avoidReuse true', async () => {
      return await waitForExpect(async () => {
        const options = { avoidReuse: true }
        const wallet = await client.wallet.createWallet('eve', false, options)

        expect(wallet.name).toStrictEqual('eve')
        expect(wallet.warning).toStrictEqual('Empty string given as passphrase, wallet will not be encrypted.')
      })
    })
  })
})

describe('sendMany', () => {
  // NOTE(surangap): defid side(c++) does not have much tests for sendmany RPC atm.
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

  // Returns matching utxos for given transaction id and address.
  const getMatchingUTXO = async (txId: string, address: string): Promise<UTXO[]> => {
    const options: ListUnspentOptions = {
      addresses: [address]
    }

    const utxos: UTXO[] = await client.wallet.listUnspent(1, 9999999, options)
    return utxos.filter((utxo) => {
      return (utxo.address === address) && (utxo.txid === txId)
    })
  }

  it('should send one address using sendMany', async () => {
    const amounts: Record<string, number> = { mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001 }
    const transactionId = await client.wallet.sendMany(amounts)
    expect(typeof transactionId).toStrictEqual('string')

    // generate one block
    await container.generate(1)

    // check the corresponding UTXO
    const utxos = await getMatchingUTXO(transactionId, 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
    // In this case the we should only have one matching utxo
    expect(utxos.length).toStrictEqual(1)
    utxos.forEach(utxo => {
      expect(utxo.address).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
      expect(utxo.amount).toStrictEqual(new BigNumber(0.00001))
    })
  })

  it('should send multiple address using sendMany', async () => {
    const amounts: Record<string, number> = {
      mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001,
      mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy: 0.00002
    }
    const transactionId = await client.wallet.sendMany(amounts)
    expect(typeof transactionId).toStrictEqual('string')

    // generate one block
    await container.generate(1)

    // check the corresponding UTXOs
    const utxos = await getMatchingUTXO(transactionId, 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
    // In this case the we should only have one matching utxo
    expect(utxos.length).toStrictEqual(1)
    utxos.forEach(utxo => {
      expect(utxo.address).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
      expect(utxo.amount).toStrictEqual(new BigNumber(0.00001))
    })

    const utxos2 = await getMatchingUTXO(transactionId, 'mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy')
    // In this case the we should only have one matching utxo
    expect(utxos2.length).toStrictEqual(1)
    utxos2.forEach(utxo => {
      expect(utxo.address).toStrictEqual('mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy')
      expect(utxo.amount).toStrictEqual(new BigNumber(0.00002))
    })
  })

  it('should sendMany with comment', async () => {
    const amounts: Record<string, number> = {
      mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001,
      mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy: 0.00002
    }
    const options: SendManyOptions = {
      comment: 'test comment'
    }
    const transactionId = await client.wallet.sendMany(amounts, [], options)
    expect(typeof transactionId).toStrictEqual('string')
  })

  it('should sendMany with replaceable', async () => {
    const amounts: Record<string, number> = {
      mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001,
      mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy: 0.00002
    }
    const options: SendManyOptions = {
      replaceable: true
    }
    const transactionId = await client.wallet.sendMany(amounts, [], options)
    expect(typeof transactionId).toStrictEqual('string')
  })

  it('should sendMany with confTarget', async () => {
    const amounts: Record<string, number> = {
      mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001,
      mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy: 0.00002
    }
    const options: SendManyOptions = {
      confTarget: 60
    }
    const transactionId = await client.wallet.sendMany(amounts, [], options)
    expect(typeof transactionId).toStrictEqual('string')
  })

  it('should sendMany with estimateMode', async () => {
    const amounts: Record<string, number> = {
      mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001,
      mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy: 0.00002
    }
    const options: SendManyOptions = {
      estimateMode: Mode.ECONOMICAL
    }
    const transactionId = await client.wallet.sendMany(amounts, [], options)
    expect(typeof transactionId).toStrictEqual('string')
  })

  it('should sendMany with fee substracted from mentioned recipients', async () => {
    const amounts: Record<string, number> = {
      mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU: 0.00001,
      mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy: 10.5
    }
    const subtractFeeFrom: string [] = ['mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy']
    const transactionId = await client.wallet.sendMany(amounts, subtractFeeFrom)
    expect(typeof transactionId).toStrictEqual('string')

    // generate one block
    await container.generate(1)

    // check the corresponding UTXOs
    const utxos = await getMatchingUTXO(transactionId, 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
    // In this case the we should only have one matching utxo
    expect(utxos.length).toStrictEqual(1)
    utxos.forEach(utxo => {
      expect(utxo.address).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
      // amount should be equal to 0.00001
      expect(utxo.amount).toStrictEqual(new BigNumber(0.00001))
    })

    const utxos2 = await getMatchingUTXO(transactionId, 'mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy')
    // In this case the we should only have one matching utxo
    expect(utxos2.length).toStrictEqual(1)
    utxos2.forEach(utxo => {
      expect(utxo.address).toStrictEqual('mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy')
      // amount should be less than 10.5
      expect(utxo.amount.isLessThan(10.5)).toStrictEqual(true)
    })
  })
})

describe('regtest (non-mn)', () => {
  // TODO(jellyfish): refactor test to be stand alone without using same container
  const container = new RegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
  })

  afterAll(async () => {
    await container.stop()
  })

  describe('getNewAddress', () => {
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

  describe('getAddressInfo', () => {
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

  describe('validateAddress', () => {
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

  describe('listAddressGroupings', () => {
    it('should listAddressGroupings', async () => {
      return await waitForExpect(async () => {
        const data = await client.wallet.listAddressGroupings()

        expect(data.length === 0).toStrictEqual(true)
      })
    })
  })

  describe('getWalletInfo', () => {
    it('should getWalletInfo', async () => {
      return await waitForExpect(async () => {
        const walletInfo = await client.wallet.getWalletInfo()

        expect(walletInfo.walletname).toStrictEqual('')
        expect(walletInfo.walletversion).toStrictEqual(169900)
        expect(walletInfo.balance instanceof BigNumber).toStrictEqual(true)
        expect(walletInfo.balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
        expect(walletInfo.unconfirmed_balance instanceof BigNumber).toStrictEqual(true)
        expect(walletInfo.unconfirmed_balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
        expect(walletInfo.immature_balance instanceof BigNumber).toStrictEqual(true)
        expect(walletInfo.immature_balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
        expect(walletInfo.txcount).toBeGreaterThanOrEqual(0)
        expect(typeof walletInfo.keypoololdest).toStrictEqual('number')
        expect(typeof walletInfo.keypoolsize).toStrictEqual('number')
        expect(typeof walletInfo.keypoolsize_hd_internal).toStrictEqual('number')
        expect(walletInfo.paytxfee instanceof BigNumber).toStrictEqual(true)
        expect(walletInfo.paytxfee.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
        expect(typeof walletInfo.hdseedid).toStrictEqual('string')
        expect(walletInfo.private_keys_enabled).toStrictEqual(true)
        expect(walletInfo.avoid_reuse).toStrictEqual(false)
        expect(walletInfo.scanning).toStrictEqual(false)
      })
    })
  })
})

describe('masternode', () => {
  // TODO(jellyfish): refactor test to be stand alone without using same container
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

  describe('listUnspent', () => {
    it('should listUnspent', async () => {
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent()
        expect(utxos.length).toBeGreaterThan(0)
        for (let i = 0; i < utxos.length; i += 1) {
          const utxo = utxos[i]
          expect(typeof utxo.txid).toStrictEqual('string')
          expect(typeof utxo.vout).toStrictEqual('number')
          expect(typeof utxo.address).toStrictEqual('string')
          expect(typeof utxo.label).toStrictEqual('string')
          expect(typeof utxo.scriptPubKey).toStrictEqual('string')
          expect(utxo.amount instanceof BigNumber).toStrictEqual(true)
          expect(typeof utxo.tokenId).toStrictEqual('string')
          expect(typeof utxo.confirmations).toStrictEqual('number')
          expect(typeof utxo.spendable).toStrictEqual('boolean')
          expect(typeof utxo.solvable).toStrictEqual('boolean')
          expect(typeof utxo.desc).toStrictEqual('string')
          expect(typeof utxo.safe).toStrictEqual('boolean')
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
          expect(utxo.address).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
        })
      })
    })

    it('test listUnspent includeUnsafe filter', async () => {
      const options: ListUnspentOptions = { includeUnsafe: false }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(1, 9999999, options)
        utxos.forEach(utxo => {
          expect(utxo.safe).toStrictEqual(true)
        })
      })
    })

    it('test listUnspent queryOptions minimumAmount filter', async () => {
      const options: ListUnspentOptions = { queryOptions: { minimumAmount: 5 } }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(1, 9999999, options)
        utxos.forEach(utxo => {
          expect(utxo.amount.isGreaterThanOrEqualTo(new BigNumber('5'))).toStrictEqual(true)
        })
      })
    })

    it('test listUnspent queryOptions maximumAmount filter', async () => {
      const options: ListUnspentOptions = { queryOptions: { maximumAmount: 100 } }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(1, 9999999, options)
        utxos.forEach(utxo => {
          expect(utxo.amount.isLessThanOrEqualTo(new BigNumber('100'))).toStrictEqual(true)
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
        expect(sum.isGreaterThanOrEqualTo(new BigNumber('100'))).toStrictEqual(true)
      })
    })

    it('test listUnspent queryOptions tokenId filter', async () => {
      const options: ListUnspentOptions = { queryOptions: { tokenId: '0' } }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(1, 9999999, options)
        utxos.forEach(utxo => {
          expect(utxo.tokenId).toStrictEqual('0')
        })
      })
    })
  })

  describe('getNewAddress', () => {
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

  describe('getAddressInfo', () => {
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

  describe('validateAddress', () => {
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

  describe('listAddressGroupings', () => {
    it('should listAddressGroupings', async () => {
      return await waitForExpect(async () => {
        const data = await client.wallet.listAddressGroupings()

        expect(data[0][0][0]).toStrictEqual('mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy')
        expect(data[0][0][1] instanceof BigNumber).toStrictEqual(true)
        expect(data[0][0][1].isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
        expect(data[0][0][2]).toStrictEqual('coinbase')

        expect(data[1][0][0]).toStrictEqual('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
        expect(data[1][0][1] instanceof BigNumber).toStrictEqual(true)
        expect(data[1][0][1].isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
        expect(data[1][0][2]).toStrictEqual('coinbase')
      })
    })
  })

  describe('getWalletInfo', () => {
    it('should getWalletInfo', async () => {
      return await waitForExpect(async () => {
        const walletInfo = await client.wallet.getWalletInfo()

        expect(walletInfo.walletname).toStrictEqual('')
        expect(walletInfo.walletversion).toStrictEqual(169900)
        expect(walletInfo.balance instanceof BigNumber).toStrictEqual(true)
        expect(walletInfo.balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
        expect(walletInfo.unconfirmed_balance instanceof BigNumber).toStrictEqual(true)
        expect(walletInfo.unconfirmed_balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
        expect(walletInfo.immature_balance instanceof BigNumber).toStrictEqual(true)
        expect(walletInfo.immature_balance.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
        expect(walletInfo.txcount).toBeGreaterThanOrEqual(100)
        expect(typeof walletInfo.keypoololdest).toStrictEqual('number')
        expect(typeof walletInfo.keypoolsize).toStrictEqual('number')
        expect(typeof walletInfo.keypoolsize_hd_internal).toStrictEqual('number')
        expect(walletInfo.paytxfee instanceof BigNumber).toStrictEqual(true)
        expect(walletInfo.paytxfee.isGreaterThanOrEqualTo(new BigNumber('0'))).toStrictEqual(true)
        expect(typeof walletInfo.hdseedid).toStrictEqual('string')
        expect(walletInfo.private_keys_enabled).toStrictEqual(true)
        expect(walletInfo.avoid_reuse).toStrictEqual(false)
        expect(walletInfo.scanning).toStrictEqual(false)
      })
    })
  })

  describe('sendToAddress', () => {
    const address = 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU'

    it('should sendToAddress', async () => {
      return await waitForExpect(async () => {
        const transactionId = await client.wallet.sendToAddress(address, 0.00001)

        expect(typeof transactionId).toStrictEqual('string')
      })
    })

    it('should sendToAddress with comment and commentTo', async () => {
      return await waitForExpect(async () => {
        const options: SendToAddressOptions = {
          comment: 'pizza',
          commentTo: 'domino'
        }
        const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

        expect(typeof transactionId).toStrictEqual('string')
      })
    })

    it('should sendToAddress with replaceable', async () => {
      return await waitForExpect(async () => {
        const options: SendToAddressOptions = {
          replaceable: true
        }
        const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

        expect(typeof transactionId).toStrictEqual('string')
      })
    })

    it('should sendToAddress with confTarget', async () => {
      return await waitForExpect(async () => {
        const options: SendToAddressOptions = {
          confTarget: 60
        }
        const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

        expect(typeof transactionId).toStrictEqual('string')
      })
    })

    it('should sendToAddress with estimateMode', async () => {
      return await waitForExpect(async () => {
        const options: SendToAddressOptions = {
          estimateMode: Mode.ECONOMICAL
        }
        const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

        expect(typeof transactionId).toStrictEqual('string')
      })
    })

    it('should sendToAddress with avoidReuse', async () => {
      return await waitForExpect(async () => {
        const options: SendToAddressOptions = {
          avoidReuse: false
        }
        const transactionId = await client.wallet.sendToAddress(address, 0.00001, options)

        expect(typeof transactionId).toStrictEqual('string')
      })
    })
  })
})
