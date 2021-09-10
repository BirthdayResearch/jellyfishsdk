import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'

describe('Loan setCollateralToken', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let priceFeedId: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should setCollateralToken', async () => {
    const collateralTokenId = await testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId
    })
    expect(typeof collateralTokenId).toStrictEqual('string')
    expect(collateralTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.container.call('getcollateraltoken', [{ token: 'AAPL' }])
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 'AAPL',
        factor: 0.5,
        priceFeedId,
        activateAfterBlock: await testing.container.getBlockCount()
      }
    })
  })

  it('should not setCollateralToken if token does not exist', async () => {
    const promise = testing.rpc.loan.setCollateralToken({ token: 'TSLA', factor: new BigNumber(0.5), priceFeedId })
    await expect(promise).rejects.toThrow('RpcApiError: \'Token TSLA does not exist!\', code: -8, method: setcollateraltoken')
  })

  it('should not setCollateralToken if factor is greater than 1', async () => {
    const promise = testing.rpc.loan.setCollateralToken({ token: 'AAPL', factor: new BigNumber(1.01), priceFeedId })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetCollateralTokenTx execution failed:\nsetCollateralToken factor must be lower or equal than 1.00000000!\', code: -32600, method: setcollateraltoken')
  })

  it('should not setCollateralToken if factor is less than 0', async () => {
    const promise = testing.rpc.loan.setCollateralToken({ token: 'AAPL', factor: new BigNumber(-0.01), priceFeedId })
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: setcollateraltoken')
  })

  it('should not setCollateralToken if oracle does not contain USD price', async () => {
    await testing.token.create({ symbol: 'TSLA' })
    await testing.generate(1)

    const priceFeedId: string = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TSLA',
      currency: 'SGD'
    }], 1])
    await testing.generate(1)

    const promise = testing.rpc.loan.setCollateralToken({
      token: 'TSLA',
      factor: new BigNumber(0.5),
      priceFeedId
    })
    await expect(promise).rejects.toThrow(`RpcApiError: 'Test LoanSetCollateralTokenTx execution failed:\noracle (${priceFeedId}) does not contain USD price for this token!', code: -32600, method: setcollateraltoken`)
  })

  it('should not setCollateralToken if oracleId does not exist', async () => {
    const promise = testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId: '944d7ce67a0bd6d18e7ba7cbd3ec12ac81a13aa92876cb697ec0b33bf50652f5'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetCollateralTokenTx execution failed:\noracle (944d7ce67a0bd6d18e7ba7cbd3ec12ac81a13aa92876cb697ec0b33bf50652f5) does not exist!\', code: -32600, method: setcollateraltoken')
  })

  it('should setCollateralToken with utxos', async () => {
    const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)
    const collateralTokenId = await testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId
    }, [{ txid, vout }])
    expect(typeof collateralTokenId).toStrictEqual('string')
    expect(collateralTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [collateralTokenId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(txid)
    expect(rawtx.vin[0].vout).toStrictEqual(vout)

    const data = await testing.container.call('getcollateraltoken', [{ token: 'AAPL' }])
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 'AAPL',
        factor: 0.5,
        priceFeedId,
        activateAfterBlock: await testing.container.getBlockCount()
      }
    })
  })

  it('should not setCollateralToken with utxos not from foundation member', async () => {
    const utxo = await testing.container.fundAddress(await testing.generateAddress(), 10)
    const promise = testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId
    }, [utxo])
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetCollateralTokenTx execution failed:\ntx not from foundation member!\', code: -32600, method: setcollateraltoken')
  })
})

describe('Loan setCollateralToken with activateAfterBlock', () => {
  const container = new LoanMasterNodeRegTestContainer()
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

    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    // Wait for block 110
    await testing.container.waitForBlockHeight(110)

    // To setCollateralToken at block 120
    const collateralTokenId = await testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId,
      activateAfterBlock: 120
    })
    expect(typeof collateralTokenId).toStrictEqual('string')
    expect(collateralTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.container.call('getcollateraltoken', [{ token: 'AAPL', height: 120 }])
    expect(data).toStrictEqual({
      [collateralTokenId]: {
        token: 'AAPL',
        factor: 0.5,
        priceFeedId,
        activateAfterBlock: 120
      }
    })
  })
})

describe('Loan setCollateralToken with activateAfterBlock less than the current block', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should not setCollateralToken', async () => {
    await testing.token.create({ symbol: 'AAPL' })
    await testing.generate(1)

    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    // Wait for block 110
    await testing.container.waitForBlockHeight(110)

    // To setCollateralToken at block 109
    const promise = testing.rpc.loan.setCollateralToken({
      token: 'AAPL',
      factor: new BigNumber(0.5),
      priceFeedId,
      activateAfterBlock: 109
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetCollateralTokenTx execution failed:\nactivateAfterBlock cannot be less than current height!\', code: -32600, method: setcollateraltoken')
  })
})
