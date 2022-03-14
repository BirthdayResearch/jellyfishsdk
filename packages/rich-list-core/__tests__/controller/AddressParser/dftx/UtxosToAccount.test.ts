import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RawTransaction } from '@defichain/jellyfish-api-core/src/category/rawtx'
import { AddressParserTest } from '../../../../test/AddressParserTest'
import { UtxosToAccountParser } from '../../../../src/controller/AddressParser/dftx/UtxosToAccount'

describe('UtxosToAccountParser', () => {
  const container = new MasterNodeRegTestContainer()
  let apiClient!: JsonRpcClient

  let rec1!: string
  let rec2!: string
  let rec3!: string
  let rawTx!: RawTransaction

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    apiClient = new JsonRpcClient(await container.getCachedRpcUrl())

    rec1 = await container.getNewAddress()
    rec2 = await container.getNewAddress()
    rec3 = await container.getNewAddress()

    const txn = await apiClient.account.utxosToAccount({
      [rec1]: '5@DFI',
      [rec2]: '10@DFI',
      [rec3]: '15@DFI'
    })

    rawTx = await apiClient.rawtx.getRawTransaction(txn, true)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should extract all addresses receiving from utxo in a transaction', async () => {
    const parser = AddressParserTest(apiClient, [new UtxosToAccountParser('regtest')])
    const addresses = await parser.parse(rawTx)

    expect(addresses.length).toStrictEqual(3)
    expect(addresses).toContain(rec1)
    expect(addresses).toContain(rec2)
    expect(addresses).toContain(rec3)
  })
})
