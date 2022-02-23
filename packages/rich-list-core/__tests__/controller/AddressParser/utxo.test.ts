import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RawTransaction } from '@defichain/jellyfish-api-core/src/category/rawtx'
import { AddressParser } from '../../../src/controller/AddressParser'

describe('UtxoAddressParser', () => {
  const container = new MasterNodeRegTestContainer()
  let apiClient!: JsonRpcClient

  let sender1!: string
  let sender2!: string
  let rec1!: string
  let rec2!: string
  let rec3!: string
  let rawTx!: RawTransaction

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    apiClient = new JsonRpcClient(await container.getCachedRpcUrl())

    sender1 = await container.getNewAddress()
    sender2 = await container.getNewAddress()
    rec1 = await container.getNewAddress()
    rec2 = await container.getNewAddress()
    rec3 = await container.getNewAddress()

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
    expect(addresses).toContain(sender1)
    expect(addresses).toContain(sender2)
    expect(addresses).toContain(rec1)
    expect(addresses).toContain(rec2)
    expect(addresses).toContain(rec3)
  })
})
