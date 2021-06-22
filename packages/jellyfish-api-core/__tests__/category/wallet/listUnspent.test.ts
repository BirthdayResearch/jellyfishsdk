import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import waitForExpect from 'wait-for-expect'
import {
  UTXO,
  ListUnspentOptions
} from '../../../src/category/wallet'
import BigNumber from 'bignumber.js'

describe('Unspent', () => {
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
