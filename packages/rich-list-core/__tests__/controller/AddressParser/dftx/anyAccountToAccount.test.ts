import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RawTransaction } from '@defichain/jellyfish-api-core/src/category/rawtx'
import { AnyAccountToAccountParser } from '../../../../src/controller/AddressParser/dftx/anyAccountToAccount'
import { AddressParserTest } from '../../../../test/AddressParserTest'

describe('AnyAccountToAccountParser', () => {
  const container = new MasterNodeRegTestContainer()
  let apiClient!: JsonRpcClient

  let sender1!: string
  let sender2!: string
  let rec1!: string
  let rec2!: string
  let rawTx!: RawTransaction

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    apiClient = new JsonRpcClient(await container.getCachedRpcUrl())
    sender1 = await container.getNewAddress()
    sender2 = await container.getNewAddress()
    rec1 = await container.getNewAddress()
    rec2 = await container.getNewAddress()

    // Sender1 address is funded at this point.
    // Send DFI UTXO -> DFI Token to sender1 and sender2
    await apiClient.account.utxosToAccount({
      [sender1]: '8@DFI',
      [sender2]: '12@DFI'
    })
    await container.generate(1)

    // Mint wrapped tokens
    await apiClient.token.createToken({
      symbol: 'DBTC',
      name: 'DBTC',
      mintable: true,
      isDAT: true,
      tradeable: true,
      collateralAddress: sender1
    })
    await container.generate(1)
    await apiClient.token.mintTokens('20@DBTC')
    await container.generate(1)

    const txn = await apiClient.account.sendTokensToAddress({
      [sender1]: ['8@DFI', '20@DBTC'],
      [sender2]: ['7@DFI']
    }, {
      [rec1]: ['10@DFI', '10@DBTC'],
      [rec2]: ['5@DFI', '10@DBTC']
    })

    // test subject
    rawTx = await apiClient.rawtx.getRawTransaction(txn, true)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should extract all addresses involved in anyAccountToAccount tx', async () => {
    const parser = AddressParserTest(apiClient, [new AnyAccountToAccountParser('regtest')])
    const addresses = await parser.parse(rawTx)

    expect(addresses.length).toStrictEqual(4)
    expect(addresses).toContain(sender1)
    expect(addresses).toContain(sender2)
    expect(addresses).toContain(rec1)
    expect(addresses).toContain(rec2)
  })
})
