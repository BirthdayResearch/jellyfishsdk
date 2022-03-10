import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { RawTransaction } from '@defichain/jellyfish-api-core/src/category/rawtx'
import { PoolRemoveLiquidityParser } from '../../../../src/controller/AddressParser/dftx/poolRemoveLiquidity'
import { AddressParserTest } from '../../../../test/AddressParserTest'

describe('PoolRemoveLiquidityParser', () => {
  const container = new MasterNodeRegTestContainer()
  let apiClient!: JsonRpcClient

  let sender!: string
  let shareAddress!: string
  let rawTx!: RawTransaction

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    apiClient = new JsonRpcClient(await container.getCachedRpcUrl())
    sender = await container.getNewAddress()
    shareAddress = await container.getNewAddress()

    // Address is funded at this point.
    // convert 100 DFI UTXO -> DFI Token
    await apiClient.account.utxosToAccount({ [sender]: '100@DFI' })
    await container.generate(1)

    // Mint wrapped tokens
    await apiClient.token.createToken({
      symbol: 'DDAI',
      name: 'DDAI',
      mintable: true,
      isDAT: true,
      tradeable: true,
      collateralAddress: sender
    })
    await container.generate(1)
    await apiClient.token.mintTokens('2000@DDAI')
    await container.generate(1)

    // create poolpair and add liquidity
    const poolAddress = await container.getNewAddress()
    await apiClient.poolpair.createPoolPair({
      tokenA: 'DFI',
      tokenB: 'DDAI',
      commission: 0,
      status: true,
      ownerAddress: poolAddress
    })
    await container.generate(1)

    await apiClient.poolpair.addPoolLiquidity({
      [sender]: ['20@DFI', '100@DDAI']
    }, shareAddress)
    await container.generate(1)

    const txn = await apiClient.poolpair.removePoolLiquidity(shareAddress, '10@DFI-DDAI')
    // test subject
    rawTx = await apiClient.rawtx.getRawTransaction(txn, true)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should extract all addresses involved in poolRemoveLiquidity tx', async () => {
    const parser = AddressParserTest(apiClient, [new PoolRemoveLiquidityParser('regtest')])
    const addresses = await parser.parse(rawTx)

    expect(addresses.length).toStrictEqual(1)
    expect(addresses).toContain(shareAddress)
  })
})
