import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RawTransaction } from '@defichain/jellyfish-api-core/src/category/rawtx'
import { AddressParser } from '../../../src/saga/AddressParser'
import { Testing } from '@defichain/jellyfish-testing'

describe('UtxoAddressParser', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)
  let apiClient!: JsonRpcClient

  let rawTx!: RawTransaction

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    apiClient = new JsonRpcClient(await container.getCachedRpcUrl())

    const sender1 = await testing.address('sender1')
    const sender2 = await testing.address('sender2')
    const rec1 = await testing.address('rec1')
    const rec2 = await testing.address('rec2')
    const rec3 = await testing.address('rec3')

    // fund addresses
    await apiClient.wallet.sendMany({
      [sender1]: 3.5,
      [sender2]: 3.5
    })
    await container.generate(1)

    const txn = await apiClient.wallet.sendMany({
      [rec1]: 1,
      [rec2]: 2,
      [rec3]: 3
    }, [sender1, sender2])

    // test subject
    rawTx = await apiClient.rawtx.getRawTransaction(txn, true)
  })

  it('Should extract all addresses spent and receive utxo in a transaction', async () => {
    const parser = new AddressParser(apiClient, 'regtest')
    const addresses = await parser.parse(rawTx)

    expect(addresses.length).toBeGreaterThanOrEqual(5)
    expect(addresses).toContain(await testing.address('sender1'))
    expect(addresses).toContain(await testing.address('sender2'))
    expect(addresses).toContain(await testing.address('rec1'))
    expect(addresses).toContain(await testing.address('rec2'))
    expect(addresses).toContain(await testing.address('rec3'))
  })
})
