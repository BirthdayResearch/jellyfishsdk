import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'
import { TokenInfo } from '../../../src/category/token'

describe('Loan updateLoanToken', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let loanTokenId: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()

    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token1',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token1', currency: 'USD' }] })
    await testing.generate(1)

    loanTokenId = await testing.container.call('setloantoken', [{
      symbol: 'Token1',
      name: 'Token1',
      fixedIntervalPriceId: 'Token1/USD',
      mintable: true,
      interest: new BigNumber(0.01)
    }, []])
    await testing.generate(1)
  })

  afterEach(async () => {
    const data = await testing.container.call('getloantoken', [loanTokenId])
    const tokenInfo = Object.values(data.token)[0] as TokenInfo
    if (tokenInfo.symbol === 'Token1') { // If Token1, always update its name, fixedIntervalPriceId, mintable and interest values back to their original values
      await testing.rpc.loan.updateLoanToken('Token1', {
        name: 'Token1',
        fixedIntervalPriceId: 'Token1/USD',
        mintable: true,
        interest: new BigNumber(0.01)
      })
    } else if (tokenInfo.symbol === 'Token2') { // If Token2, always update it back to Token1
      await testing.rpc.loan.updateLoanToken('Token2', {
        symbol: 'Token1',
        name: 'Token1',
        fixedIntervalPriceId: 'Token1/USD',
        mintable: true,
        interest: new BigNumber(0.01)
      })
    }
    await testing.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should updateLoanToken by symbol as token', async () => {
    await testing.rpc.loan.updateLoanToken('Token1', { symbol: 'Token2' }) // Update by symbol
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    expect(data).toStrictEqual([{
      token: {
        1: {
          symbol: 'Token2',
          symbolKey: 'Token2',
          name: 'Token1',
          decimal: 8,
          limit: 0,
          mintable: true,
          tradeable: true,
          isDAT: true,
          isLPS: false,
          finalized: false,
          isLoanToken: true,
          minted: 0,
          creationTx: loanTokenId,
          creationHeight: await testing.container.getBlockCount() - 1,
          destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
          destructionHeight: -1,
          collateralAddress: expect.any(String)
        }
      },
      fixedIntervalPriceId: 'Token1/USD',
      mintable: true,
      interest: 0.01
    }])
  })

  it('should updateLoanToken by id as token', async () => {
    await testing.rpc.loan.updateLoanToken('1', { symbol: 'Token2' }) // Update by id
    await testing.generate(1)

    const data = await testing.container.call('getloantoken', [loanTokenId])
    const tokenInfo = Object.values(data.token)[0] as TokenInfo
    expect(tokenInfo.symbol).toStrictEqual('Token2')
  })

  it('should updateLoanToken by creationTx as token', async () => {
    await testing.rpc.loan.updateLoanToken(loanTokenId, { symbol: 'Token2' }) // Update by creationTx
    await testing.generate(1)

    const data = await testing.container.call('getloantoken', [loanTokenId])
    const tokenInfo = Object.values(data.token)[0] as TokenInfo
    expect(tokenInfo.symbol).toStrictEqual('Token2')
  })

  it('should not updateLoanToken if token does not exist', async () => {
    const promise = testing.rpc.loan.updateLoanToken('Token2', { symbol: 'Token2' }) // Does not exist
    await expect(promise).rejects.toThrow('RpcApiError: \'Token Token2 does not exist!\', code: -8, method: updateloantoken')
  })

  it('should updateLoanToken if symbol is more than 8 letters', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token3',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token3', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenId = await testing.container.call('setloantoken', [{
      symbol: 'Token3',
      fixedIntervalPriceId: 'Token3/USD'
    }, []])
    await testing.generate(1)

    await testing.rpc.loan.updateLoanToken('Token3', { symbol: 'x'.repeat(9) }) // 9 letters
    await testing.generate(1)

    const data = await testing.container.call('getloantoken', [loanTokenId])
    const tokenInfo = Object.values(data.token)[0] as TokenInfo
    expect(tokenInfo.symbol).toStrictEqual('x'.repeat(8)) // Only remain the first 8 letters
  })

  it('should not updateLoanToken if symbol is an empty string', async () => {
    const promise = testing.rpc.loan.updateLoanToken('Token1', { symbol: '' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateLoanTokenTx execution failed:\nInvalid token symbol. Valid: Start with an alphabet, non-empty, not contain # or /\', code: -32600, method: updateloantoken')
  })

  it('should not updateLoanToken if the symbol is used in other token', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token4',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token4', currency: 'USD' }] })
    await testing.generate(1)

    await testing.container.call('setloantoken', [{
      symbol: 'Token4',
      name: 'Token4',
      fixedIntervalPriceId: 'Token4/USD'
    }, []])
    await testing.generate(1)

    const promise = testing.rpc.loan.updateLoanToken('Token4', { symbol: 'Token1' }) // Same as Token1's symbol
    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateLoanTokenTx execution failed:\ntoken with key \'Token1\' already exists!\', code: -32600, method: updateloantoken')
  })

  it('should updateLoanToken with the given name', async () => {
    await testing.rpc.loan.updateLoanToken('Token1', { name: 'Token2' })
    await testing.generate(1)

    const data = await testing.container.call('getloantoken', [loanTokenId])
    const tokenInfo = Object.values(data.token)[0] as TokenInfo
    expect(tokenInfo.name).toStrictEqual('Token2')
  })

  it('should updateLoanToken if name is more than 128 letters', async () => {
    await testing.rpc.loan.updateLoanToken('Token1', { name: 'x'.repeat(129) }) // 129 letters
    await testing.generate(1)

    const data = await testing.container.call('getloantoken', [loanTokenId])
    const tokenInfo = Object.values(data.token)[0] as TokenInfo
    expect(tokenInfo.name).toStrictEqual('x'.repeat(128))
  })

  it('should updateLoanToken if two loan tokens have the same name', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token5',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token5', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token5',
      fixedIntervalPriceId: 'Token5/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.updateLoanToken('Token5', { name: 'Token1' }) // Same name as Token1's name
    await testing.generate(1)

    const data = await testing.container.call('getloantoken', [loanTokenId])
    const tokenInfo = Object.values(data.token)[0] as TokenInfo
    expect(tokenInfo.name).toStrictEqual('Token1')
  })

  it('should updateLoanToken with given fixedIntervalPriceId', async () => {
    const oracleId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token6',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '0.5@Token6', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token6',
      fixedIntervalPriceId: 'Token6/USD'
    })
    await testing.generate(1)

    await testing.rpc.loan.updateLoanToken('Token6', { fixedIntervalPriceId: 'Token1/USD' })
    await testing.generate(1)

    const data = await testing.container.call('getloantoken', [loanTokenId])
    expect(data.fixedIntervalPriceId).toStrictEqual('Token1/USD')
  })

  it('should not updateLoanToken if fixedIntervalPriceId does not belong to any oracle', async () => {
    const promise = testing.rpc.loan.updateLoanToken('Token1', { symbol: 'Token2', fixedIntervalPriceId: 'X/USD' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateLoanTokenTx execution failed:\nPrice feed X/USD does not belong to any oracle\', code: -32600, method: updateloantoken')
  })

  it('should not updateLoanToken if fixedIntervalPriceId is not in correct format', async () => {
    const promise = testing.rpc.loan.updateLoanToken('Token1', { symbol: 'Token2', fixedIntervalPriceId: 'X' }) // Must be in token/currency format
    await expect(promise).rejects.toThrow('RpcApiError: \'price feed not in valid format - token/currency!\', code: -8, method: updateloantoken')
  })

  it('should not updateLoanToken if fixedIntervalPriceId is an empty string', async () => {
    const promise = testing.rpc.loan.updateLoanToken('Token1', { symbol: 'Token2', fixedIntervalPriceId: '' })
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid parameters, argument "fixedIntervalPriceId" must be non-null\', code: -8, method: updateloantoken')
  })

  it('should not updateLoanToken if token/currency of fixedIntervalPriceId contains empty string', async () => {
    const promise = testing.rpc.loan.updateLoanToken('Token1', { symbol: 'Token2', fixedIntervalPriceId: '/' })
    await expect(promise).rejects.toThrow('RpcApiError: \'token/currency contains empty string\', code: -8, method: updateloantoken')
  })

  it('should updateLoanToken with given mintable flag', async () => {
    {
      await testing.rpc.loan.updateLoanToken('Token1', { mintable: false })
      await testing.generate(1)

      const data = await testing.container.call('getloantoken', [loanTokenId])
      const tokenInfo = Object.values(data.token)[0] as TokenInfo
      expect(tokenInfo.mintable).toStrictEqual(false)
    }

    {
      await testing.rpc.loan.updateLoanToken('Token1', { mintable: true })
      await testing.generate(1)

      const data = await testing.container.call('getloantoken', [loanTokenId])
      const tokenInfo = Object.values(data.token)[0] as TokenInfo
      expect(tokenInfo.mintable).toStrictEqual(true)
    }
  })

  it('should updateLoanToken if interest number is greater than 0 and has less than 9 digits in the fractional part', async () => {
    await testing.rpc.loan.updateLoanToken('Token1', { interest: new BigNumber(15.12345678) }) // 8 digits in the fractional part
    await testing.generate(1)

    const data = await testing.container.call('getloantoken', [loanTokenId])
    expect(data.interest).toStrictEqual(15.12345678)
  })

  it('should not updateLoanToken if interest number is greater than 0 and has more than 8 digits in the fractional part', async () => {
    const promise = testing.rpc.loan.updateLoanToken('Token1', { interest: new BigNumber(15.123456789) }) // 9 digits in the fractional part
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid amount\', code: -3, method: updateloantoken')
  })

  it('should updateLoanToken if interest number is less than 0', async () => {
    await testing.rpc.loan.updateLoanToken('Token1', { interest: new BigNumber(-15.12345678) }) // 8 digits in the fractional part
    await testing.generate(1)

    const data = await testing.container.call('getloantoken', [loanTokenId])
    expect(data.interest).toStrictEqual(-15.12345678)
  })

  it.skip('should not updateLoanToken if interest number is greater than 1200000000', async () => {
    const promise = testing.rpc.loan.updateLoanToken('Token1', { interest: new BigNumber('1200000000').plus('0.00000001') })
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: updateloantoken')
  })

  it('should updateLoanToken with utxos', async () => {
    const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)
    const loanTokenId2 = await testing.rpc.loan.updateLoanToken('Token1', {
      symbol: 'Token2'
    }, [{ txid, vout }])
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [loanTokenId2, true])
    expect(rawtx.vin[0].txid).toStrictEqual(txid)
    expect(rawtx.vin[0].vout).toStrictEqual(vout)

    const data = await testing.container.call('getloantoken', [loanTokenId])
    const tokenInfo = Object.values(data.token)[0] as TokenInfo
    expect(tokenInfo.symbol).toStrictEqual('Token2')
  })

  it('should updateLoanToken with utxos not from foundation member', async () => {
    const utxo = await testing.container.fundAddress(await testing.generateAddress(), 10)
    const promise = testing.rpc.loan.updateLoanToken('Token1', { symbol: 'Token2' }, [utxo])
    await expect(promise).rejects.toThrow('RpcApiError: \'Test UpdateLoanTokenTx execution failed:\ntx not from foundation member!\', code: -32600, method: updateloantoken')
  })
})
