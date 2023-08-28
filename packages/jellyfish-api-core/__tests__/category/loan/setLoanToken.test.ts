import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'
import { LoanTokenResult } from '../../../src/category/loan'
import { TokenInfo } from '../../../src/category/token'

describe('Loan setLoanToken', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should setLoanToken', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token1',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token1', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token1',
      fixedIntervalPriceId: 'Token1/USD'
    })
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    expect(data).toStrictEqual([{
      token: {
        1: {
          collateralAddress: expect.any(String),
          creationHeight: await testing.container.getBlockCount(),
          creationTx: loanTokenId,
          decimal: 8,
          destructionHeight: -1,
          destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
          finalized: false,
          isDAT: true,
          isLPS: false,
          isLoanToken: true,
          limit: 0,
          mintable: true,
          minted: 0,
          name: '',
          symbol: 'Token1',
          symbolKey: 'Token1',
          tradeable: true
        }
      },
      fixedIntervalPriceId: 'Token1/USD',
      mintable: true,
      interest: 0
    }])
  })

  it('should setLoanToken if symbol is more than 8 letters', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'x'.repeat(8),
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: `0.5@${'x'.repeat(8)}`, currency: 'USD' }] })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'x'.repeat(9), // 9 letters
      fixedIntervalPriceId: `${'x'.repeat(9)}/USD`
    })
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    const result = data.filter((d: LoanTokenResult) => d.fixedIntervalPriceId === `${'x'.repeat(8)}/USD`)
    const token: TokenInfo = Object.values(result[0].token)[0] as TokenInfo
    expect(token.symbol).toStrictEqual('x'.repeat(8)) // Only remain the first 8 letters
  })

  it('should not setLoanToken if symbol is an empty string', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token2',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token2', currency: 'USD' }] })
    await testing.generate(1)

    const promise = testing.rpc.loan.setLoanToken({
      symbol: '',
      fixedIntervalPriceId: 'Token2/USD'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetLoanTokenTx execution failed:\nInvalid token symbol. Valid: Start with an alphabet, non-empty, not contain # or /\', code: -32600, method: setloantoken')
  })

  it('should not setLoanToken if the symbol is used in other token', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token3',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token3', currency: 'USD' }] })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'Token3',
      fixedIntervalPriceId: 'Token3/USD'
    })
    await testing.generate(1)

    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token3',
      fixedIntervalPriceId: 'Token3/USD'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetLoanTokenTx execution failed:\ntoken \'Token3\' already exists!\', code: -32600, method: setloantoken')
  })

  it('should not setLoanToken if fixedIntervalPriceId does not belong to any oracle', async () => {
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token4',
      fixedIntervalPriceId: 'Token4/USD'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetLoanTokenTx execution failed:\nPrice feed Token4/USD does not belong to any oracle\', code: -32600, method: setloantoken')
  })

  it('should not setLoanToken if fixedIntervalPriceId is not in correct format', async () => {
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token5',
      fixedIntervalPriceId: 'X'// Must be in token/currency format
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'price feed not in valid format - token/currency!\', code: -8, method: setloantoken')
  })

  it('should not setLoanToken if fixedIntervalPriceId is an empty string', async () => {
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token6',
      fixedIntervalPriceId: ''
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid parameters, argument "fixedIntervalPriceId" must be non-null\', code: -8, method: setloantoken')
  })

  it('should not setLoanToken if token/currency of fixedIntervalPriceId contains empty string', async () => {
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token7',
      fixedIntervalPriceId: '/'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'token/currency contains empty string\', code: -8, method: setloantoken')
  })

  it('should setLoanToken with the given name', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token8',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token8', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token8',
      name: '',
      fixedIntervalPriceId: 'Token8/USD'
    })
    await testing.generate(1)

    const data = await testing.container.call('getloantoken', [loanTokenId])
    const tokenInfo = Object.values(data.token)[0] as TokenInfo
    expect(tokenInfo.name).toStrictEqual('')
  })

  it('should setLoanToken if name is more than 128 letters', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token9',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token9', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token9',
      name: 'x'.repeat(129), // 129 letters
      fixedIntervalPriceId: 'Token9/USD'
    })
    await testing.generate(1)

    const data = await testing.container.call('getloantoken', [loanTokenId])
    const tokenInfo = Object.values(data.token)[0] as TokenInfo
    expect(tokenInfo.name).toStrictEqual('x'.repeat(128)) // Only remain the first 128 letters.
  })

  it('should setLoanToken if two loan tokens have the same name', async () => {
    const oracleId1 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token10',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp1 = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId1, timestamp1, { prices: [{ tokenAmount: '0.5@Token10', currency: 'USD' }] })
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'Token10',
      name: 'TokenX',
      fixedIntervalPriceId: 'Token10/USD'
    })
    await testing.generate(1)

    const oracleId2 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token11',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp2 = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId2, timestamp2, { prices: [{ tokenAmount: '0.5@Token11', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token11',
      name: 'TokenX',
      fixedIntervalPriceId: 'Token11/USD'
    })
    await testing.generate(1)

    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)
  })

  it('should setLoanToken if mintable is false', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token12',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token12', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token12',
      fixedIntervalPriceId: 'Token12/USD',
      mintable: false
    })
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)
  })

  it('should setLoanToken if interest number is greater than 0 and has less than 9 digits in the fractional part', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token13',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token13', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token13',
      fixedIntervalPriceId: 'Token13/USD',
      interest: new BigNumber(15.12345678) // 8 digits in the fractional part
    })
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)
  })

  it('should not setLoanToken if interest number is greater than 0 and has more than 8 digits in the fractional part', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token14',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token14', currency: 'USD' }] })
    await testing.generate(1)

    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token14',
      fixedIntervalPriceId: 'Token14/USD',
      interest: new BigNumber(15.123456789) // 9 digits in the fractional part
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid amount\', code: -3, method: setloantoken')
  })

  it('should setLoanToken if interest number is less than 0', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token15',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token15', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token15',
      fixedIntervalPriceId: 'Token15/USD',
      interest: new BigNumber(-15.12345678)
    })
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)
  })

  it.skip('should not setLoanToken if interest number is greater than 1200000000', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token16',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token16', currency: 'USD' }] })
    await testing.generate(1)

    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token16',
      fixedIntervalPriceId: 'Token16/USD',
      interest: new BigNumber('1200000000').plus('0.00000001')
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: setloantoken')
  })

  it('should setLoanToken with utxos', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token17',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token17', currency: 'USD' }] })
    await testing.generate(1)

    const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)
    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token17',
      fixedIntervalPriceId: 'Token17/USD'
    }, [{ txid, vout }])
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [loanTokenId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(txid)
    expect(rawtx.vin[0].vout).toStrictEqual(vout)

    const data = await testing.container.call('getloantoken', [loanTokenId])
    const tokenInfo = Object.values(data.token)[0] as TokenInfo
    expect(tokenInfo.name).toStrictEqual('')
  })

  it('should not setLoanToken with utxos not from foundation member', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token18',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token18', currency: 'USD' }] })
    await testing.generate(1)

    const utxo = await testing.container.fundAddress(await testing.generateAddress(), 10)
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token18',
      fixedIntervalPriceId: 'Token18/USD'
    }, [utxo])
    await expect(promise).rejects.toThrow('RpcApiError: \'Test SetLoanTokenTx execution failed:\ntx not from foundation member!\', code: -32600, method: setloantoken')
  })
})
