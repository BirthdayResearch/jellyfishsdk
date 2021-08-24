import { LoanMasterNodeRegTestContainer } from './loan_container'
import { Testing } from '@defichain/jellyfish-testing'
import BigNumber from 'bignumber.js'
import { GenesisKeys } from '@defichain/testcontainers'

describe('Loan', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  it('should updateLoanToken', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await container.getNewAddress('', 'legacy'), [{
      token: 'AAPL',
      currency: 'EUR'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.container.call('setloantoken', [
      {
        symbol: 'AAPL',
        name: 'APPLE',
        priceFeedId,
        mintable: true,
        interest: new BigNumber(0.01)
      }, []])
    await testing.generate(1)

    await testing.rpc.loan.updateLoanToken({
      token: 'AAPL',
      symbol: 'AAPL',
      name: 'APPLE',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.01)
    })
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
        interest: 0.01
      }
    })
  })

  it('should updateLoanToken if symbol is more than 8 letters', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TOKEN2',
      currency: 'CURRENCY2'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.container.call('setloantoken', [
      {
        symbol: 'TOKEN2',
        name: 'TOKEN2',
        priceFeedId,
        mintable: true,
        interest: new BigNumber(0.01)
      }, []])
    await testing.generate(1)

    await testing.rpc.loan.updateLoanToken({
      token: 'TOKEN2',
      symbol: 'ABCDEFGHI',
      name: 'TOKEN2',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.01)
    })
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].symbol).toStrictEqual('ABCDEFGH') // Only remain the first 8 letters
  })

  it('should not updateLoanToken if token with same symbol was created before', async () => {
    const priceFeedId1 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TOKEN3',
      currency: 'CURRENCY3'
    }], 1])
    await testing.generate(1)

    await testing.container.call('setloantoken', [
      {
        symbol: 'TOKEN3',
        name: 'TOKEN3',
        priceFeedId: priceFeedId1,
        mintable: true,
        interest: new BigNumber(0.01)
      }, []])
    await testing.generate(1)

    const priceFeedId2 = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TOKEN4',
      currency: 'CURRENCY4'
    }], 1])
    await testing.generate(1)

    await testing.container.call('setloantoken', [
      {
        symbol: 'TOKEN4',
        name: 'TOKEN4',
        priceFeedId: priceFeedId2,
        mintable: true,
        interest: new BigNumber(0.01)
      }, []])
    await testing.generate(1)

    const promise = testing.rpc.loan.updateLoanToken({
      token: 'TOKEN4',
      symbol: 'TOKEN3',
      name: 'TOKEN4',
      priceFeedId: priceFeedId2,
      mintable: true,
      interest: new BigNumber(0.01)
    })

    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanUpdateLoanTokenTx execution failed:\ntoken with key \'TOKEN3\' already exists!\', code: -32600, method: updateloantoken')
  })

  it('should updateLoanToken if name is more than 128 letters', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TOKEN5',
      currency: 'CURRENCY5'
    }], 1])
    await testing.generate(1)

    const loanTokenId = await testing.container.call('setloantoken', [
      {
        symbol: 'TOKEN5',
        name: 'TOKEN5',
        priceFeedId,
        mintable: true,
        interest: new BigNumber(0.01)
      }, []])
    await testing.generate(1)

    await testing.rpc.loan.updateLoanToken({
      token: 'TOKEN5',
      symbol: 'TOKEN5',
      name: 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXY', // 129 letters
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.01)
    })
    await testing.generate(1)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId) + 1
    expect(data[loanTokenId].token[index].name).toStrictEqual('ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWX') // Only take first 128 letters.
  })

  it('should not updateLoanToken if token does not exist', async () => {
    const promise = testing.rpc.loan.updateLoanToken({
      token: 'TOKEN6',
      symbol: 'TOKEN6',
      name: 'TOKEN6',
      priceFeedId: 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b',
      mintable: true,
      interest: new BigNumber(0.01)
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Token TOKEN6 does not exist!\', code: -8, method: updateloantoken')
  })

  it('should not updateLoanToken if priceFeed id is invalid', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TOKEN7',
      currency: 'CURRENCY7'
    }], 1])
    await testing.generate(1)

    await testing.container.call('setloantoken', [
      {
        symbol: 'TOKEN7',
        name: 'TOKEN7',
        priceFeedId,
        mintable: true,
        interest: new BigNumber(0.01)
      }, []])
    await testing.generate(1)

    const promise = testing.rpc.loan.updateLoanToken({
      token: 'TOKEN7',
      symbol: 'TOKEN7',
      name: 'TOKEN7',
      priceFeedId: 'e40775f8bb396cd3d94429843453e66e68b1c7625d99b0b4c505ab004506697b',
      mintable: true,
      interest: new BigNumber(0.01)
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanUpdateLoanTokenTx execution failed:\noracle (63b4c16d95d68ba65f1317cdcf79e03ef2a64b7e6479bda3801a24084c071693) does not exist!\', code: -32600, method: updateloantoken')
  })

  it('should updateLoanToken if mintable is false', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TOKEN8',
      currency: 'CURRENCY8'
    }], 1])
    await testing.generate(1)

    await testing.container.call('setloantoken', [
      {
        symbol: 'TOKEN8',
        name: 'TOKEN8',
        priceFeedId,
        mintable: true,
        interest: new BigNumber(0.01)
      }, []])
    await testing.generate(1)

    const loanTokenId = await testing.rpc.loan.updateLoanToken({
      token: 'TOKEN8',
      symbol: 'TOKEN8',
      name: 'TOKEN8',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.01)
    })
    expect(typeof loanTokenId).toStrictEqual('string')
    expect(loanTokenId.length).toStrictEqual(64)
    await testing.generate(1)
  })

  it('should not updateLoanToken if interest is less than 0', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TOKEN9',
      currency: 'CURRENCY9'
    }], 1])
    await testing.generate(1)

    await testing.container.call('setloantoken', [
      {
        symbol: 'TOKEN9',
        name: 'TOKEN9',
        priceFeedId,
        mintable: true,
        interest: new BigNumber(0.01)
      }, []])
    await testing.generate(1)

    const promise = testing.rpc.loan.updateLoanToken({
      token: 'TOKEN9',
      symbol: 'TOKEN9',
      name: 'TOKEN9',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(-0.01)
    })
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: updateloantoken')
  })

  it('should updateLoanToken with utxos', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await container.getNewAddress('', 'legacy'), [{
      token: 'TSLA',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const loanTokenId1 = await testing.container.call('setloantoken', [
      {
        symbol: 'TSLA',
        name: 'USD',
        priceFeedId,
        mintable: true,
        interest: new BigNumber(0.01)
      }, []])
    await testing.generate(1)

    const { txid, vout } = await testing.container.fundAddress(GenesisKeys[0].owner.address, 10)
    const loanTokenId2 = await testing.rpc.loan.updateLoanToken({
      token: 'TSLA',
      symbol: 'TSLA',
      name: 'TESLA',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.01)
    }, [{ txid, vout }])
    await testing.generate(1)

    const rawtx = await testing.container.call('getrawtransaction', [loanTokenId2, true])
    expect(rawtx.vin[0].txid).toStrictEqual(txid)
    expect(rawtx.vin[0].vout).toStrictEqual(vout)

    const data = await testing.container.call('listloantokens', [])
    const index = Object.keys(data).indexOf(loanTokenId1) + 1
    expect(data[loanTokenId1].token[index].symbol).toStrictEqual('TSLA')
    expect(data[loanTokenId1].token[index].name).toStrictEqual('TESLA')
  })

  it('should create loan scheme with utxos not from foundation member', async () => {
    const priceFeedId = await testing.container.call('appointoracle', [await container.getNewAddress('', 'legacy'), [{
      token: 'TOKEN10',
      currency: 'TOKEN10'
    }], 1])
    await testing.generate(1)

    await testing.container.call('setloantoken', [
      {
        symbol: 'TOKEN10',
        name: 'TOKEN10',
        priceFeedId,
        mintable: true,
        interest: new BigNumber(0.01)
      }, []])
    await testing.generate(1)

    const utxo = await testing.container.fundAddress(await testing.generateAddress(), 10)
    const promise = testing.rpc.loan.updateLoanToken({
      token: 'TSLA',
      symbol: 'TSLA',
      name: 'TESLA',
      priceFeedId,
      mintable: true,
      interest: new BigNumber(0.01)
    }, [utxo])
    await expect(promise).rejects.toThrow('RpcApiError: \'Test LoanUpdateLoanTokenTx execution failed:\ntx not from foundation member!\', code: -32600, method: updateloantoken')
  })
})
