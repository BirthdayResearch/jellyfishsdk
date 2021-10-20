import { LoanMasterNodeRegTestContainer } from './loan_container'
import BigNumber from 'bignumber.js'
import { Testing } from '@defichain/jellyfish-testing'

describe('Loan getLoanToken', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should getLoanToken', async () => {
    const oracleIdAAPL = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'AAPL',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp1 = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleIdAAPL, timestamp1, { prices: [{ tokenAmount: '0.5@AAPL', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenIdAAPL = await testing.rpc.loan.setLoanToken({
      symbol: 'AAPL',
      name: 'APPLE',
      fixedIntervalPriceId: 'AAPL/USD',
      mintable: true,
      interest: new BigNumber(0.01)
    })
    await testing.generate(1)
    const heightAAPL = new BigNumber(await testing.container.getBlockCount())

    const oracleIdTSLA = await testing.container.call('appointoracle', [await testing.generateAddress(), [{
      token: 'TSLA',
      currency: 'USD'
    }], 1])
    await testing.generate(1)

    const timestamp2 = Math.floor(new Date().getTime() / 1000)
    await testing.rpc.oracle.setOracleData(oracleIdTSLA, timestamp2, { prices: [{ tokenAmount: '0.5@TSLA', currency: 'USD' }] })
    await testing.generate(1)

    const loanTokenIdTSLA = await testing.container.call('setloantoken', [{
      symbol: 'TSLA',
      name: 'TESLA',
      fixedIntervalPriceId: 'TSLA/USD',
      mintable: false,
      interest: new BigNumber(0.02)
    }])
    await testing.generate(1)
    const heightTSLA = new BigNumber(await testing.container.getBlockCount())

    {
      const data1 = await testing.rpc.loan.getLoanToken('AAPL')
      const data2 = await testing.rpc.loan.getLoanToken('1')
      expect(data1).toStrictEqual(data2)
      expect(data1).toStrictEqual(
        {
          token: {
            1: {
              collateralAddress: expect.any(String),
              creationHeight: heightAAPL,
              creationTx: loanTokenIdAAPL,
              decimal: new BigNumber(8),
              destructionHeight: new BigNumber(-1),
              destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
              finalized: false,
              isDAT: true,
              isLPS: false,
              isLoanToken: true,
              limit: new BigNumber(0),
              mintable: true,
              minted: new BigNumber(0),
              name: 'APPLE',
              symbol: 'AAPL',
              symbolKey: 'AAPL',
              tradeable: true
            }
          },
          fixedIntervalPriceId: 'AAPL/USD',
          interest: new BigNumber(0.01)
        }
      )
    }

    {
      const data1 = await testing.rpc.loan.getLoanToken('TSLA')
      const data2 = await testing.rpc.loan.getLoanToken('2')
      expect(data1).toStrictEqual(data2)
      expect(data1).toStrictEqual(
        {
          token: {
            2: {
              collateralAddress: expect.any(String),
              creationHeight: heightTSLA,
              creationTx: loanTokenIdTSLA,
              decimal: new BigNumber(8),
              destructionHeight: new BigNumber(-1),
              destructionTx: '0000000000000000000000000000000000000000000000000000000000000000',
              finalized: false,
              isDAT: true,
              isLPS: false,
              isLoanToken: true,
              limit: new BigNumber(0),
              mintable: false,
              minted: new BigNumber(0),
              name: 'TESLA',
              symbol: 'TSLA',
              symbolKey: 'TSLA',
              tradeable: true
            }
          },
          fixedIntervalPriceId: 'TSLA/USD',
          interest: new BigNumber(0.02)
        }
      )
    }
  })

  it('should not getLoanToken if token does not exists', async () => {
    const promise1 = testing.rpc.loan.getLoanToken('UBER')
    await expect(promise1).rejects.toThrow('RpcApiError: \'Token UBER does not exist!\', code: -8, method: getloantoken')

    const promise2 = testing.rpc.loan.getLoanToken('3')
    await expect(promise2).rejects.toThrow('RpcApiError: \'Token 3 does not exist!\', code: -8, method: getloantoken')
  })

  it('should not getLoanToken if the token exists but not a loan token', async () => {
    const promise1 = testing.rpc.loan.getLoanToken('DFI')
    await expect(promise1).rejects.toThrow('RpcApiError: \'<DFI> is not a valid loan token!\', code: -20, method: getloantoken')

    const promise2 = testing.rpc.loan.getLoanToken('0')
    await expect(promise2).rejects.toThrow('RpcApiError: \'<0> is not a valid loan token!\', code: -20, method: getloantoken')
  })
})
