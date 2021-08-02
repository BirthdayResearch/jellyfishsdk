import { ContainerAdapterClient } from '../../container_adapter_client'
import { LoanMasterNodeRegTestContainer } from './loan_container'
import { UTXO } from '@defichain/jellyfish-api-core/category/loan'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    await createToken(await container.getNewAddress(), 'AAPL', 1)
  })

  afterAll(async () => {
    await container.stop()
  })

  async function createToken (address: string, symbol: string, amount: number): Promise<void> {
    const metadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await container.waitForWalletBalanceGTE(101)
    await container.call('createtoken', [metadata])
    await container.generate(1)

    await container.call('minttokens', [`${amount.toString()}@${symbol}`])
    await container.generate(1)
  }

  it('should set colleteralToken', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    await container.generate(1)

    const txId = await client.loan.setColleteralToken('AAPL', 1, { priceFeedId: oracleId })

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)

    await container.generate(1)
  })

  it('should not setColleteralToken if token does not exist', async () => {
    const priceFeeds = [
      { token: 'TSLA', currency: 'USD' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    await container.generate(1)

    const promise = client.loan.setColleteralToken('TSLA', 1, { priceFeedId: oracleId })
    await expect(promise).rejects.toThrow('RpcApiError: \'Token TSLA does not exist!\', code: -8, method: setcollateraltoken')
  })

  it('should not setColleteralToken if factor is greater than 1', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    await container.generate(1)

    const promise = client.loan.setColleteralToken('AAPL', 2, { priceFeedId: oracleId })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetCollateralTokenTx execution failed:\nsetCollateralToken factor must be lower or equal than 1!\', code: -32600, method: setcollateraltoken')
  })

  it('should not setColleteralToken if factor is lesser than 0', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    await container.generate(1)

    const promise = client.loan.setColleteralToken('AAPL', -1, { priceFeedId: oracleId })
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: setcollateraltoken')
  })

  it('should not setColleteralToken if oracleId is not exists', async () => {
    const promise = client.loan.setColleteralToken('AAPL', 1, { priceFeedId: '944d7ce67a0bd6d18e7ba7cbd3ec12ac81a13aa92876cb697ec0b33bf50652f5' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetCollateralTokenTx execution failed:\noracle (944d7ce67a0bd6d18e7ba7cbd3ec12ac81a13aa92876cb697ec0b33bf50652f5) does not exist!\', code: -32600, method: setcollateraltoken')
  })

  it('should setColleteralToken after block 200 only', async () => {
    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    await container.generate(1)

    // NOTE(jingyi2811): Wait for block 100
    await container.waitForBlockHeight(100)

    // NOTE(jingyi2811): To setColleteralToken at block 200
    const txId = await client.loan.setColleteralToken('AAPL', 1, { priceFeedId: oracleId, activateAfterBlock: 200 })

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)

    await container.generate(1)

    // NOTE(jingyi2811): shouldn't setColleteralToken at block 101
    let result = await container.call('getcollateraltoken', [{ token: 'AAPL', height: 101 }])
    console.log(result)

    await container.waitForBlockHeight(200)

    // NOTE(jingyi2811): should setColleteralToken at block 200
    result = await container.call('getcollateraltoken', [{ token: 'AAPL', height: 200 }])
    console.log(result)
  })

  it('should setColleteralToken with utxos', async () => {
    const address = await container.call('getnewaddress')
    const utxos = await container.call('listunspent', [1, 9999999, [address], true])
    const inputs: UTXO[] = utxos.map((utxo: UTXO) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    await container.generate(1)

    const txId = await client.loan.setColleteralToken('AAPL', 1, { priceFeedId: oracleId, utxos: inputs })

    expect(typeof txId).toStrictEqual('string')
    expect(txId.length).toStrictEqual(64)

    await container.generate(1)
  })

  it('should not setColleteralToken with utxos', async () => {
    const { txid, vout } = await container.fundAddress(await container.call('getnewaddress'), 10)

    const priceFeeds = [
      { token: 'AAPL', currency: 'EUR' }
    ]

    const oracleId = await container.call('appointoracle', [await container.getNewAddress(), priceFeeds, 1])
    await container.generate(1)

    const promise = client.loan.setColleteralToken('AAPL', 1, { priceFeedId: oracleId, utxos: [{ txid, vout }] })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetCollateralTokenTx execution failed:\ntx not from foundation member!\', code: -32600, method: setcollateraltoken')
  })
})
