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
    await Promise.all(Array.from({ length: 10 }).map(async (_, i) => {
      return await client.wallet.sendToAddress(address, 0.0001)
    }))
    await container.generate(1, address)

    const inWalletTransactions = await client.wallet.listTransactions({})

    expect(inWalletTransactions.length).toStrictEqual(10)

    for (const inWalletTransaction of inWalletTransactions) {
      expect(inWalletTransaction).toMatchObject({
        address: expect.any(String),
        txid: expect.any(String),
        amount: expect.any(BigNumber),
        confirmations: expect.any(Number),
        blockhash: expect.any(String),
        blocktime: expect.any(Number),
        blockindex: expect.any(Number),
        time: expect.any(Number),
        timereceived: expect.any(Number),
        // "bip125-replaceable" is "BIP125" enum but we test with "string" here
        'bip125-replaceable': expect.any(String),
        // "category" is "InWalletTransactionCategory" enum but we test with "string" here
        category: expect.any(String),
        label: expect.any(String),
        vout: expect.any(Number)
      })
    }
  })

  it('should listTransactions with label set', async () => {
    await Promise.all(Array.from({ length: 10 }).map(async (_, i) => {
      return await client.wallet.sendToAddress(address, 0.0001)
    }))
    await container.generate(1, address)

    const inWalletTransactions = await client.wallet.listTransactions({ label: 'owner' })

    inWalletTransactions.forEach((inWalletTransaction) => {
      expect(inWalletTransaction.label).toStrictEqual('owner')
    })

    expect(inWalletTransactions.length).toStrictEqual(10)

    for (const inWalletTransaction of inWalletTransactions) {
      expect(inWalletTransaction).toMatchObject({
        address: expect.any(String),
        txid: expect.any(String),
        amount: expect.any(BigNumber),
        confirmations: expect.any(Number),
        blockhash: expect.any(String),
        blocktime: expect.any(Number),
        blockindex: expect.any(Number),
        time: expect.any(Number),
        timereceived: expect.any(Number),
        // "bip125-replaceable" is "BIP125" enum but we test with "string" here
        'bip125-replaceable': expect.any(String),
        // "category" is "InWalletTransactionCategory" enum but we test with "string" here
        category: expect.any(String),
        label: expect.any(String),
        vout: expect.any(Number)
      })
    }
  })

  it('should listTransactions with label set', async () => {
    await Promise.all(Array.from({ length: 10 }).map(async (_, i) => {
      return await client.wallet.sendToAddress(address, 0.0001)
    }))
    await container.generate(1, address)

    const inWalletTransactions = await client.wallet.listTransactions({ label: 'owner' })

    inWalletTransactions.forEach((inWalletTransaction) => {
      expect(inWalletTransaction.label).toStrictEqual('owner')
    })

    expect(inWalletTransactions.length).toStrictEqual(10)

    for (const inWalletTransaction of inWalletTransactions) {
      expect(inWalletTransaction).toMatchObject({
        address: expect.any(String),
        txid: expect.any(String),
        amount: expect.any(BigNumber),
        confirmations: expect.any(Number),
        blockhash: expect.any(String),
        blocktime: expect.any(Number),
        blockindex: expect.any(Number),
        time: expect.any(Number),
        timereceived: expect.any(Number),
        // "bip125-replaceable" is "BIP125" enum but we test with "string" here
        'bip125-replaceable': expect.any(String),
        // "category" is "InWalletTransactionCategory" enum but we test with "string" here
        category: expect.any(String),
        label: expect.any(String),
        vout: expect.any(Number)
      })
    }
  })

  it('should listTransactions with count = 5', async () => {
    await Promise.all(Array.from({ length: 5 }).map(async (_, i) => {
      return await client.wallet.sendToAddress(address, 0.0001)
    }))
    await container.generate(1, address)

    const inWalletTransactions = await client.wallet.listTransactions({ count: 5 })

    expect(inWalletTransactions.length).toStrictEqual(5)

    for (const inWalletTransaction of inWalletTransactions) {
      expect(inWalletTransaction).toMatchObject({
        address: expect.any(String),
        txid: expect.any(String),
        amount: expect.any(BigNumber),
        confirmations: expect.any(Number),
        blockhash: expect.any(String),
        blocktime: expect.any(Number),
        blockindex: expect.any(Number),
        time: expect.any(Number),
        timereceived: expect.any(Number),
        // "bip125-replaceable" is "BIP125" enum but we test with "string" here
        'bip125-replaceable': expect.any(String),
        // "category" is "InWalletTransactionCategory" enum but we test with "string" here
        category: expect.any(String),
        label: expect.any(String),
        vout: expect.any(Number)
      })
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
    await Promise.all(Array.from({ length: 10 }).map(async (_, i) => {
      return await client.wallet.sendToAddress(address, 0.0001)
    }))
    await container.generate(1, address)

    const inWalletTransactions = await client.wallet.listTransactions({ includeWatchOnly: false })

    inWalletTransactions.forEach((inWalletTransaction) => {
      expect(inWalletTransaction.address).toStrictEqual(address)
    })

    expect(inWalletTransactions.length).toStrictEqual(10)

    for (const inWalletTransaction of inWalletTransactions) {
      expect(inWalletTransaction).toMatchObject({
        address: expect.any(String),
        txid: expect.any(String),
        amount: expect.any(BigNumber),
        confirmations: expect.any(Number),
        blockhash: expect.any(String),
        blocktime: expect.any(Number),
        blockindex: expect.any(Number),
        time: expect.any(Number),
        timereceived: expect.any(Number),
        // "bip125-replaceable" is "BIP125" enum but we test with "string" here
        'bip125-replaceable': expect.any(String),
        // "category" is "InWalletTransactionCategory" enum but we test with "string" here
        category: expect.any(String),
        label: expect.any(String),
        vout: expect.any(Number)
      })
    }
  })

  it('should listTransactions with excludeCustomTx = true', async () => {
    await Promise.all(Array.from({ length: 10 }).map(async (_, i) => {
      return await client.wallet.sendToAddress(address, 0.0001)
    }))
    await container.generate(1, address)

    const inWalletTransactions = await client.wallet.listTransactions({ excludeCustomTx: true })

    inWalletTransactions.forEach((inWalletTransaction) => {
      expect(inWalletTransaction.address).toStrictEqual(address)
    })

    expect(inWalletTransactions.length).toStrictEqual(10)

    for (const inWalletTransaction of inWalletTransactions) {
      expect(inWalletTransaction).toMatchObject({
        address: expect.any(String),
        txid: expect.any(String),
        amount: expect.any(BigNumber),
        confirmations: expect.any(Number),
        blockhash: expect.any(String),
        blocktime: expect.any(Number),
        blockindex: expect.any(Number),
        time: expect.any(Number),
        timereceived: expect.any(Number),
        // "bip125-replaceable" is "BIP125" enum but we test with "string" here
        'bip125-replaceable': expect.any(String),
        // "category" is "InWalletTransactionCategory" enum but we test with "string" here
        category: expect.any(String),
        label: expect.any(String),
        vout: expect.any(Number)
      })
    }
  })
})
