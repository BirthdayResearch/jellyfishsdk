import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'
import { GenesisKeys } from '@defichain/testcontainers'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  let priceFeedId: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TOKEN',
      currency: 'CURRENCY'
    }], 1])
    await testing.generate(1)
  })

  it('should setLoanToken', async () => {
    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'TOKENA',
      name: 'TOKENA',
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
            symbol: 'TOKENA',
            symbolKey: 'TOKENA',
            name: 'TOKENA',
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
    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'ABCDEFGHI', // 9 letters
      name: 'TOKEN2',
      priceFeedId
    })
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].symbol).toStrictEqual('ABCDEFGH') // Only remain the first 8 letters
  })

  it('should not setLoanToken if symbol is an empty string', async () => {
    const promise = testing.rpc.loan.setLoanToken({
      symbol: '',
      name: 'TOKEN3',
      priceFeedId
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\ntoken symbol should be non-empty and starts with a letter\', code: -32600, method: setloantoken')
  })

  it('should not setLoanToken if token with same symbol was created before', async () => {
    await testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN4',
      name: 'TOKEN4',
      priceFeedId
    })
    await testing.generate(1)

    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN4',
      name: 'TOKEN4',
      priceFeedId
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\ntoken \'TOKEN4\' already exists!\', code: -32600, method: setloantoken')
  })

  it('should setLoanToken if name is more than 128 letters', async () => {
    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN5',
      name: 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXY', // 129 letters
      priceFeedId
    })
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].name).toStrictEqual('ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWX') // Only remain first 128 letters.
  })

  it('should not setLoanToken if priceFeedId is invalid', async () => {
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN6',
      name: 'TOKEN6',
      priceFeedId: 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b'
    })
    await expect(promise).rejects.toThrow('Test LoanSetLoanTokenTx execution failed:\noracle (e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b) does not exist or not valid oracle!\', code: -32600, method: setloantoken')
  })

  it('should setLoanToken if mintable is false', async () => {
    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN7',
      name: 'TOKEN7',
      priceFeedId,
      mintable: false
    })
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)
  })

  it('should setLoanToken if there is interest', async () => {
    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN8',
      name: 'TOKEN8',
      priceFeedId,
      interest: new BigNumber(0.5)
    })
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)
  })

  it('should not setLoanToken if interest is less than 0', async () => {
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN9',
      name: 'TOKEN9',
      priceFeedId,
      interest: new BigNumber(-0.01)
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: setloantoken')
  })

  it('should setLoanToken with utxos', async () => {
    const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)
    const loanTokenId = await testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN10',
      name: 'TOKEN10',
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
    expect(data[loanTokenId].token[index].symbol).toStrictEqual('TOKEN10')
    expect(data[loanTokenId].token[index].name).toStrictEqual('TOKEN10')
  })

  it('should setLoanToken with utxos not from foundation member', async () => {
    const utxo = await testing.container.fundAddress(await testing.generateAddress(), 10)
    const promise = testing.rpc.loan.setLoanToken({
      symbol: 'TOKEN11',
      name: 'TOKEN11',
      priceFeedId
    }, [utxo])
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanSetLoanTokenTx execution failed:\ntx not from foundation member!\', code: -32600, method: setloantoken')
  })
})
