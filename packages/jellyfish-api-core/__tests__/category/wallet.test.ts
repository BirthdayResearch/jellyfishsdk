import { ContainerAdapterClient } from '../container_adapter_client'
import { MasterNodeRegTestContainer, RegTestContainer } from '@defichain/testcontainers'
import { BigNumber } from '../../src'
import waitForExpect from 'wait-for-expect'
import { UTXO } from '../../src/category/wallet'

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
      const listUnspentPayload = { minimumConfirmation: 99 }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(listUnspentPayload)
        utxos.forEach(utxo => {
          expect(utxo.confirmations).toBeGreaterThanOrEqual(99)
        })
      })
    })

    it('test listUnspent maximumConfirmation filter', async () => {
      const listUnspentPayload = { maximumConfirmation: 300 }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(listUnspentPayload)
        utxos.forEach(utxo => {
          expect(utxo.confirmations).toBeLessThanOrEqual(300)
        })
      })
    })

    it('test listUnspent addresses filter', async () => {
      const listUnspentPayload = { addresses: ['mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU'] }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(listUnspentPayload)
        utxos.forEach(utxo => {
          expect(utxo.address).toBe('mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU')
        })
      })
    })

    it('test listUnspent includeUnsafe filter', async () => {
      const listUnspentPayload = { includeUnsafe: false }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(listUnspentPayload)
        utxos.forEach(utxo => {
          expect(utxo.safe).toBe(true)
        })
      })
    })

    it('test listUnspent queryOptions minimumAmount filter', async () => {
      const listUnspentPayload = { queryOptions: { minimumAmount: 5 } }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(listUnspentPayload)
        utxos.forEach(utxo => {
          expect(utxo.amount.isGreaterThanOrEqualTo(new BigNumber('5'))).toBe(true)
        })
      })
    })

    it('test listUnspent queryOptions maximumAmount filter', async () => {
      const listUnspentPayload = { queryOptions: { maximumAmount: 100 } }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(listUnspentPayload)
        utxos.forEach(utxo => {
          expect(utxo.amount.isLessThanOrEqualTo(new BigNumber('100'))).toBe(true)
        })
      })
    })

    it('test listUnspent queryOptions maximumCount filter', async () => {
      const listUnspentPayload = { queryOptions: { maximumCount: 100 } }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(listUnspentPayload)
        expect(utxos.length).toBeLessThanOrEqual(100)
      })
    })

    it('test listUnspent queryOptions minimumSumAmount filter', async () => {
      const listUnspentPayload = { queryOptions: { minimumSumAmount: 100 } }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(listUnspentPayload)
        const sum: BigNumber = utxos.map(utxo => utxo.amount).reduce((acc, val) => acc.plus(val))
        expect(sum.isLessThanOrEqualTo(new BigNumber('100'))).toBe(true)
      })
    })

    it('test listUnspent queryOptions tokenId filter', async () => {
      const listUnspentPayload = { queryOptions: { tokenId: '0' } }
      await waitForExpect(async () => {
        const utxos: UTXO[] = await client.wallet.listUnspent(listUnspentPayload)
        utxos.forEach(utxo => {
          expect(utxo.tokenId).toBe('0')
        })
      })
    })
  })
})
