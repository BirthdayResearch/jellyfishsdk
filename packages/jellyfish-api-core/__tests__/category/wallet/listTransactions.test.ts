import { BIP125, InWalletTransactionCategory } from '@defichain/jellyfish-api-core/dist/category/wallet'
import { BigNumber } from '@defichain/jellyfish-json'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('listTransactions', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  const address = 'mwsZw8nF7pKxWH8eoKL9tPxTpaFkz7QeLU'

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should listTransactions', async () => {
    await client.wallet.sendToAddress(address, 0.0001)
    await container.generate(1, address)

    const inWalletTransactions = await client.wallet.listTransactions({})

    expect(inWalletTransactions.length).toBeGreaterThanOrEqual(1)

    for (const inWalletTransaction of inWalletTransactions) {
      expect(typeof inWalletTransaction.address).toStrictEqual('string')
      expect(typeof inWalletTransaction.txid).toStrictEqual('string')
      expect(inWalletTransaction.amount).toBeInstanceOf(BigNumber)

      expect(typeof inWalletTransaction.confirmations).toStrictEqual('number')
      expect(typeof inWalletTransaction.blockhash).toStrictEqual('string')
      expect(typeof inWalletTransaction.blocktime).toStrictEqual('number')
      expect(typeof inWalletTransaction.blockindex).toStrictEqual('number')
      expect(typeof inWalletTransaction.time).toStrictEqual('number')
      expect(typeof inWalletTransaction.timereceived).toStrictEqual('number')
      expect(Object.values(BIP125).includes(inWalletTransaction['bip125-replaceable'])).toStrictEqual(true)

      expect(Object.values(InWalletTransactionCategory).includes(inWalletTransaction.category)).toStrictEqual(true)
      expect(typeof inWalletTransaction.label).toStrictEqual('string')
      expect(typeof inWalletTransaction.vout).toStrictEqual('number')
    }
  })

  it('should listTransactions with label set', async () => {
    await client.wallet.sendToAddress(address, 0.0001)
    await container.generate(1, address)

    const inWalletTransactions = await client.wallet.listTransactions({ label: 'owner' })

    inWalletTransactions.forEach((inWalletTransaction) => {
      expect(inWalletTransaction.label).toStrictEqual('owner')
    })

    expect(inWalletTransactions.length).toBeGreaterThanOrEqual(1)

    for (const inWalletTransaction of inWalletTransactions) {
      expect(typeof inWalletTransaction.address).toStrictEqual('string')
      expect(typeof inWalletTransaction.txid).toStrictEqual('string')
      expect(inWalletTransaction.amount).toBeInstanceOf(BigNumber)

      expect(typeof inWalletTransaction.confirmations).toStrictEqual('number')
      expect(typeof inWalletTransaction.blockhash).toStrictEqual('string')
      expect(typeof inWalletTransaction.blocktime).toStrictEqual('number')
      expect(typeof inWalletTransaction.blockindex).toStrictEqual('number')
      expect(typeof inWalletTransaction.time).toStrictEqual('number')
      expect(typeof inWalletTransaction.timereceived).toStrictEqual('number')
      expect(Object.values(BIP125).includes(inWalletTransaction['bip125-replaceable'])).toStrictEqual(true)

      expect(Object.values(InWalletTransactionCategory).includes(inWalletTransaction.category)).toStrictEqual(true)
      expect(typeof inWalletTransaction.label).toStrictEqual('string')
      expect(typeof inWalletTransaction.vout).toStrictEqual('number')
    }
  })

  it('should listTransactions with label set', async () => {
    await client.wallet.sendToAddress(address, 0.0001)
    await container.generate(1, address)

    const inWalletTransactions = await client.wallet.listTransactions({ label: 'owner' })

    inWalletTransactions.forEach((inWalletTransaction) => {
      expect(inWalletTransaction.label).toStrictEqual('owner')
    })

    expect(inWalletTransactions.length).toBeGreaterThanOrEqual(1)

    for (const inWalletTransaction of inWalletTransactions) {
      expect(typeof inWalletTransaction.address).toStrictEqual('string')
      expect(typeof inWalletTransaction.txid).toStrictEqual('string')
      expect(inWalletTransaction.amount).toBeInstanceOf(BigNumber)

      expect(typeof inWalletTransaction.confirmations).toStrictEqual('number')
      expect(typeof inWalletTransaction.blockhash).toStrictEqual('string')
      expect(typeof inWalletTransaction.blocktime).toStrictEqual('number')
      expect(typeof inWalletTransaction.blockindex).toStrictEqual('number')
      expect(typeof inWalletTransaction.time).toStrictEqual('number')
      expect(typeof inWalletTransaction.timereceived).toStrictEqual('number')
      expect(Object.values(BIP125).includes(inWalletTransaction['bip125-replaceable'])).toStrictEqual(true)

      expect(Object.values(InWalletTransactionCategory).includes(inWalletTransaction.category)).toStrictEqual(true)
      expect(typeof inWalletTransaction.label).toStrictEqual('string')
      expect(typeof inWalletTransaction.vout).toStrictEqual('number')
    }
  })

  it('should listTransactions with count = 5', async () => {
    await client.wallet.sendToAddress(address, 0.0001)
    await container.generate(1, address)

    const inWalletTransactions = await client.wallet.listTransactions({ count: 5 })

    expect(inWalletTransactions.length).toStrictEqual(5)

    for (const inWalletTransaction of inWalletTransactions) {
      expect(typeof inWalletTransaction.address).toStrictEqual('string')
      expect(typeof inWalletTransaction.txid).toStrictEqual('string')
      expect(inWalletTransaction.amount).toBeInstanceOf(BigNumber)

      expect(typeof inWalletTransaction.confirmations).toStrictEqual('number')
      expect(typeof inWalletTransaction.blockhash).toStrictEqual('string')
      expect(typeof inWalletTransaction.blocktime).toStrictEqual('number')
      expect(typeof inWalletTransaction.blockindex).toStrictEqual('number')
      expect(typeof inWalletTransaction.time).toStrictEqual('number')
      expect(typeof inWalletTransaction.timereceived).toStrictEqual('number')
      expect(Object.values(BIP125).includes(inWalletTransaction['bip125-replaceable'])).toStrictEqual(true)

      expect(Object.values(InWalletTransactionCategory).includes(inWalletTransaction.category)).toStrictEqual(true)
      expect(typeof inWalletTransaction.label).toStrictEqual('string')
      expect(typeof inWalletTransaction.vout).toStrictEqual('number')
    }
  })

  it('should not listTransactions with count = -1', async () => {
    await expect(client.wallet.listTransactions({ count: -1 })).rejects.toThrow('RpcApiError: \'Negative count\', code: -8, method: listtransactions')
  })

  it('should listTransactions with count = 0', async () => {
    const inWalletTransactions = await client.wallet.listTransactions({ count: 0 })
    expect(inWalletTransactions.length).toStrictEqual(0)
  })

  it('should listTransactions with includeWatchOnly false', async () => {
    const inWalletTransactions = await client.wallet.listTransactions({ includeWatchOnly: false })

    inWalletTransactions.forEach((inWalletTransaction) => {
      expect(inWalletTransaction.address).toStrictEqual(address)
    })

    expect(inWalletTransactions.length).toBeGreaterThanOrEqual(1)

    for (const inWalletTransaction of inWalletTransactions) {
      expect(typeof inWalletTransaction.address).toStrictEqual('string')
      expect(typeof inWalletTransaction.txid).toStrictEqual('string')
      expect(inWalletTransaction.amount).toBeInstanceOf(BigNumber)

      expect(typeof inWalletTransaction.confirmations).toStrictEqual('number')
      expect(typeof inWalletTransaction.blockhash).toStrictEqual('string')
      expect(typeof inWalletTransaction.blocktime).toStrictEqual('number')
      expect(typeof inWalletTransaction.blockindex).toStrictEqual('number')
      expect(typeof inWalletTransaction.time).toStrictEqual('number')
      expect(typeof inWalletTransaction.timereceived).toStrictEqual('number')
      expect(Object.values(BIP125).includes(inWalletTransaction['bip125-replaceable'])).toStrictEqual(true)

      expect(Object.values(InWalletTransactionCategory).includes(inWalletTransaction.category)).toStrictEqual(true)
      expect(typeof inWalletTransaction.label).toStrictEqual('string')
      expect(typeof inWalletTransaction.vout).toStrictEqual('number')
    }
  })

  it('should listTransactions with excludeCustomTx = true', async () => {
    const inWalletTransactions = await client.wallet.listTransactions({ excludeCustomTx: true })

    inWalletTransactions.forEach((inWalletTransaction) => {
      expect(inWalletTransaction.address).toStrictEqual(address)
    })

    expect(inWalletTransactions.length).toBeGreaterThanOrEqual(1)

    for (const inWalletTransaction of inWalletTransactions) {
      expect(typeof inWalletTransaction.address).toStrictEqual('string')
      expect(typeof inWalletTransaction.txid).toStrictEqual('string')
      expect(inWalletTransaction.amount).toBeInstanceOf(BigNumber)

      expect(typeof inWalletTransaction.confirmations).toStrictEqual('number')
      expect(typeof inWalletTransaction.blockhash).toStrictEqual('string')
      expect(typeof inWalletTransaction.blocktime).toStrictEqual('number')
      expect(typeof inWalletTransaction.blockindex).toStrictEqual('number')
      expect(typeof inWalletTransaction.time).toStrictEqual('number')
      expect(typeof inWalletTransaction.timereceived).toStrictEqual('number')
      expect(Object.values(BIP125).includes(inWalletTransaction['bip125-replaceable'])).toStrictEqual(true)

      expect(Object.values(InWalletTransactionCategory).includes(inWalletTransaction.category)).toStrictEqual(true)
      expect(typeof inWalletTransaction.label).toStrictEqual('string')
      expect(typeof inWalletTransaction.vout).toStrictEqual('number')
    }
  })
})
