import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'

describe('Loan setCollateralToken', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@AAPL', currency: 'USD' }] })
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should setCollateralToken', async () => {
    const collateralTokenId = await testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'AAPL/USD'
    })
    expect(typeof collateralTokenId).toStrictEqual('string')
    expect(collateralTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.container.call('listcollateraltokens', [])
    expect(data).toStrictEqual([{
      token: 'AAPL',
      factor: 0.5,
      fixedIntervalPriceId: 'AAPL/USD',
      tokenId: expect.stringMatching(/[0-f]{64}/)
    }])
  })

  it('should not setCollateralToken if token does not exist', async () => {
    const promise = testing.rpc.loan.setCollateralToken({ token: 'TSLA', factor: new BigNumber(0.5), fixedIntervalPriceId: 'AAPL/USD' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Token TSLA does not exist!\', code: -8, method: setcollateraltoken')
  })

  it('should setCollateralToken if factor is greater than 1', async () => {
    const txid = await testing.rpc.loan.setCollateralToken({ token: 'AAPL', factor: new BigNumber(1.01), fixedIntervalPriceId: 'AAPL/USD' })
    expect(txid.length).toStrictEqual(64)
  })

  it('should not setCollateralToken if factor is less than 0', async () => {
    const promise = testing.rpc.loan.setCollateralToken({ token: 'AAPL', factor: new BigNumber(-0.01), fixedIntervalPriceId: 'AAPL/USD' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: setcollateraltoken')
  })

  it('should not setCollateralToken if fixedIntervalPriceId does not belong to any oracle', async () => {
    const promise = testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'MFST/USD'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetLoanCollateralTokenTx execution failed:\nPrice feed MFST/USD does not belong to any oracle\', code: -32600, method: setcollateraltoken')
  })

  it('should not setLoanToken if fixedIntervalPriceId is not in correct format', async () => {
    const promise = testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'X'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'price feed not in valid format - token/currency!\', code: -8, method: setcollateraltoken')
  })

  it('should not setLoanToken if fixedIntervalPriceId is an empty string', async () => {
    const promise = testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: ''
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid parameters, argument "fixedIntervalPriceId" must be non-null\', code: -8, method: setcollateraltoken')
  })

  it('should not setLoanToken if token/currency of fixedIntervalPriceId contains empty string', async () => {
    const promise = testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: '/'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'token/currency contains empty string\', code: -8, method: setcollateraltoken')
  })

  it('should setCollateralToken with utxos', async () => {
    const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)
    const collateralTokenId = await testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'AAPL/USD'
    }, [{ txid, vout }])
    expect(typeof collateralTokenId).toStrictEqual('string')
    expect(collateralTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [collateralTokenId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(txid)
    expect(rawtx.vin[0].vout).toStrictEqual(vout)

    const data = await testing.container.call('getcollateraltoken', ['AAPL'])
    expect(data).toStrictEqual({
      token: 'AAPL',
      factor: 0.5,
      tokenId: expect.stringMatching(/[0-f]{64}/),
      fixedIntervalPriceId: 'AAPL/USD'
    })
  })

  it('should not setCollateralToken with utxos not from foundation member', async () => {
    const utxo = await testing.container.fundAddress(await testing.generateAddress(), 10)
    const promise = testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'AAPL/USD'
    }, [utxo])
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetLoanCollateralTokenTx execution failed:\ntx not from foundation member!\', code: -32600, method: setcollateraltoken')
  })
})

describe('Loan setCollateralToken with activateAfterBlock', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should setCollateralToken', async () => {
    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@AAPL', currency: 'USD' }] })
    await testing.generate(1)

    // Wait for block 110
    await testing.container.waitForBlockHeight(110)

    // To setCollateralToken at block 120
    const collateralTokenId = await testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'AAPL/USD',
      activateAfterBlock: 120
    })
    expect(typeof collateralTokenId).toStrictEqual('string')
    expect(collateralTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    // Wait for block 120
    await testing.container.waitForBlockHeight(120)

    const data = await testing.container.call('getcollateraltoken', ['AAPL'])
    expect(data).toStrictEqual({
      token: 'AAPL',
      factor: 0.5,
      fixedIntervalPriceId: 'AAPL/USD',
      tokenId: expect.stringMatching(/[0-f]{64}/)
    })
  })
})
