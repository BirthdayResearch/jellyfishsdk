import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'

describe('Loan', () => {
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
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token1',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token1',
      priceFeedId: 'Token1/USD'
    })
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    expect(data).toStrictEqual({
      [loanTokenId]: {
        token: {
          1: {
            symbol: 'Token1',
            symbolKey: 'Token1',
            name: '',
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
            creationHeight: await testing.container.getBlockCount(),
            destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
            destructionHeight: -1,
            collateralAddress: expect.any(String)
          }
        },
        priceFeedId: 'Token1/USD',
        interest: 0
      }
    })
  })

  it('should setLoanToken if symbol is more than 8 letters', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'x'.repeat(8),
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'x'.repeat(9), // 9 letters
      priceFeedId: 'Token1/USD'
    })
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].symbol).toStrictEqual('x'.repeat(8)) // Only remain the first 8 letters
  })

  it('should not setLoanToken if symbol is an empty string', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token2',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const promise = testing.rpc.loan.setLoanToken({
      symbol: '',
      priceFeedId: 'Token2/USD'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\ntoken symbol should be non-empty and starts with a letter\', code: -32600, method: setloantoken')
  })

  it('should not setLoanToken if token with same symbol was created before', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token3',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'Token3',
      priceFeedId: 'Token3/USD'
    })
    await testing.generate(1)

    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token3',
      priceFeedId: 'Token3/USD'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\ntoken \'Token3\' already exists!\', code: -32600, method: setloantoken')
  })

  it('should not setLoanToken if priceFeedId does not belong to any oracle', async () => {
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token4',
      priceFeedId: 'Token4/USD'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\nPrice feed Token4/USD does not belong to any oracle\', code: -32600, method: setloantoken')
  })

  it('should not setLoanToken if priceFeedId is not in correct format', async () => {
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token5',
      priceFeedId: 'X'// Must be in token/currency format
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'price feed not in valid format - token/currency!\', code: -8, method: setloantoken')
  })

  it('should not setLoanToken if priceFeedId is an empty string', async () => {
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token6',
      priceFeedId: ''
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid parameters, argument "priceFeedId" must be non-null\', code: -8, method: setloantoken')
  })

  it('should not setLoanToken if token/currency of priceFeedId contains empty string', async () => {
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token7',
      priceFeedId: '/'
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'token/currency contains empty string\', code: -8, method: setloantoken')
  })

  it('should setLoanToken with the given name', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token8',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token8',
      name: '',
      priceFeedId: 'Token8/USD'
    })
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].name).toStrictEqual('')
  })

  it('should setLoanToken if name is more than 128 letters', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token9',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token9',
      name: 'x'.repeat(129), // 129 letters
      priceFeedId: 'Token9/USD'
    })
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].name).toStrictEqual('x'.repeat(128)) // Only remain the first 128 letters.
  })

  it('should setLoanToken if two loan tokens have the same name', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token10',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'Token10',
      name: 'TokenX',
      priceFeedId: 'Token10/USD'
    })
    await testing.generate(1)

    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token11',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token11',
      name: 'TokenX',
      priceFeedId: 'Token11/USD'
    })
    await testing.generate(1)

    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)
  })

  it('should setLoanToken if mintable is false', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token12',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token12',
      priceFeedId: 'Token12/USD',
      mintable: false
    })
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)
  })

  it('should setLoanToken if interest number is greater than 0 and has less than 9 digits in the fractional part', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token13',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token13',
      priceFeedId: 'Token13/USD',
      interest: new BigNumber(15.12345678) // 8 digits in the fractional part
    })
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)
  })

  it('should not setLoanToken if interest number is greater than 0 and has more than 8 digits in the fractional part', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token14',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token14',
      priceFeedId: 'Token14/USD',
      interest: new BigNumber(15.123456789) // 9 digits in the fractional part
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid amount\', code: -3, method: setloantoken')
  })

  it('should not setLoanToken if interest number is less than 0', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token15',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token15',
      priceFeedId: 'Token15/USD',
      interest: new BigNumber(-15.12345678)
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: setloantoken')
  })

  it('should not setLoanToken if interest number is greater than 1200000000', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token16',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token16',
      priceFeedId: 'Token16/USD',
      interest: new BigNumber('1200000000').plus('0.00000001')
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: setloantoken')
  })

  it('should setLoanToken with utxos', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token17',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)
    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'Token17',
      priceFeedId: 'Token17/USD'
    }, [{ txid, vout }])
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [loanTokenId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(txid)
    expect(rawtx.vin[0].vout).toStrictEqual(vout)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].symbol).toStrictEqual('Token17')
    expect(data[loanTokenId].token[index].name).toStrictEqual('')
  })

  it('should not setLoanToken with utxos not from foundation member', async () => {
    await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'Token18',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const utxo = await testing.container.fundAddress(await testing.generateAddress(), 10)
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'Token18',
      priceFeedId: 'Token18/USD'
    }, [utxo])
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\ntx not from foundation member!\', code: -32600, method: setloantoken')
  })
})
