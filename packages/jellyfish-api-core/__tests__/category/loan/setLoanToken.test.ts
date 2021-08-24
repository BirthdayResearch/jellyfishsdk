import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  it('should setLoanToken', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'AAPL',
      name: 'APPLE',
      priceFeedId
    })

    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    expect(data).toStrictEqual({
      [loanTokenId]: {
        token: {
          1: {
            symbol: 'AAPL',
            symbolKey: 'AAPL',
            name: 'APPLE',
            decimal: 8,
            limit: 0,
            mintable: false,
            tradeable: true,
            isDAT: true,
            isLPS: false,
            finalized: false,
            isLoanToken: true,
            minted: 0,
            creationTx: loanTokenId,
            creationHeight: expect.any(Number),
            destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
            destructionHeight: -1,
            collateralAddress: expect.any(String)
          }
        },
        priceFeedId,
        interest: 0
      }
    })
  })

  it('should setLoanToken if symbol is more than 8 letters', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TOKEN2',
      currency: 'CURRENCY2'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'ABCDEFGHI',
      name: 'TOKEN2',
      priceFeedId
    })
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].symbol).toStrictEqual('ABCDEFGH') // Only remain the first 8 letters
  })

  it('should not setLoanToken if token with same symbol was created before', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TOKEN1',
      currency: 'CURRENCY1'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN1',
      name: 'TOKEN1',
      priceFeedId
    })

    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN1',
      name: 'XXX',
      priceFeedId
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\ntoken \'TOKEN1\' already exists!\', code: -32600, method: setloantoken')
  })

  it('should setLoanToken if name is more than 128 letters', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TOKEN3',
      currency: 'CURRENCY3'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN3',
      name: 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXY',
      priceFeedId
    })
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].name).toStrictEqual('ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWX') // Only take first 128 letters.
  })

  it('should not setLoanToken if priceFeedId is invalid', async () => {
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN5',
      name: 'TOKEN5',
      priceFeedId: 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b'
    })
    await expect(promise).rejects.toThrow('Test LoanSetLoanTokenTx execution failed:\noracle (e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b) does not exist or not valid oracle!\', code: -32600, method: setloantoken')
  })

  it('should setLoanToken if mintable is false', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TOKEN6',
      currency: 'CURRENCY6'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN6',
      name: 'TOKEN6',
      priceFeedId,
      mintable: false
    })
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)
  })

  it('should not setLoanToken if interest is less than 0', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TOKEN7',
      currency: 'CURRENCY7'
    }], 1])
    await testing.generate(1)

    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN7',
      name: 'TOKEN7',
      priceFeedId,
      interest: -0.01
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: setloantoken')
  })

  it('should create loan scheme with utxos', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TSLA',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)
    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      name: 'TESLA',
      priceFeedId
    }, [{ txid, vout }])
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [loanTokenId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(txid)
    expect(rawtx.vin[0].vout).toStrictEqual(vout)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].symbol).toStrictEqual('TSLA')
    expect(data[loanTokenId].token[index].name).toStrictEqual('TESLA')
  })

  it('should create loan scheme with utxos not from foundation member', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'FB',
      currency: 'USD'
    }], 1])
    await testing.generate(1)
    const utxo = await testing.container.fundAddress(await testing.generateAddress(), 10)
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'FB',
      name: 'FACEBOOK',
      priceFeedId
    }, [utxo])
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\ntx not from foundation member!\', code: -32600, method: setloantoken')
  })
})
