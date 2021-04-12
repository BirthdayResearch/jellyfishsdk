import { ContainerAdapterClient } from '../container_adapter_client'
import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { BigNumber } from '../../src'
import waitForExpect from 'wait-for-expect'
import { UTXO, ListUnspentOptions } from '../../src/category/wallet'

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

  it('should getBalance = 0', async () => {
    const balance: BigNumber = await client.wallet.getBalance()

    expect(balance.toString()).toBe('0')
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
          expect(utxo).toHaveProperty('txid')
          expect(utxo).toHaveProperty('vout')
          expect(utxo).toHaveProperty('address')
          expect(utxo).toHaveProperty('label')
          expect(utxo).toHaveProperty('scriptPubKey')
          expect(utxo).toHaveProperty('amount')
          expect(utxo).toHaveProperty('tokenId')
          expect(utxo).toHaveProperty('confirmations')
          expect(utxo).toHaveProperty('spendable')
          expect(utxo).toHaveProperty('solvable')
          expect(utxo).toHaveProperty('desc')
          expect(utxo).toHaveProperty('safe')
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
        console.log('utxos: ', utxos)
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
})
