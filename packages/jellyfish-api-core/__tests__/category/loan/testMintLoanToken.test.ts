import { TestingGroup } from '@defichain/jellyfish-testing'
import { GenesisKeys, LoanMasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'

describe('mint loan token', () => {
  const tGroup = TestingGroup.create(3, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  beforeAll(async () => {
    await tGroup.start()
    await tGroup.get(0).container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  function now (): number {
    return Math.floor(new Date().getTime() / 1000)
  }

  async function setup (): Promise<void> {
    // loan token minter setup
    const loanTokenMinterGroup = tGroup.get(0)
    const loanTokenMinterAddress = await loanTokenMinterGroup.generateAddress()
    // mint some dfi which will be used to pay collateral to mint loan tokens
    // await loanTokenMinterGroup.token.dfi({ address: loanTokenMinterAddress, amount: 1000 })
    // await loanTokenMinterGroup.container.generate(1)
    // const loanMinterBalance = await loanTokenMinterGroup.rpc.account.getTokenBalances()
    // console.log(loanMinterBalance)

    // create oracle
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' }
    ]

    const oracleAddr = await loanTokenMinterGroup.generateAddress()
    const oracleId = await loanTokenMinterGroup.rpc.oracle.appointOracle(oracleAddr, priceFeeds, { weightage: 1 })
    await loanTokenMinterGroup.container.generate(1)
    await loanTokenMinterGroup.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '1000@DFI', currency: 'USD' }] })
    await loanTokenMinterGroup.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '0.01@TSLA', currency: 'USD' }] })
    await loanTokenMinterGroup.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '1@DUSD', currency: 'USD' }] })
    await loanTokenMinterGroup.container.generate(1)

    const oracleData = await loanTokenMinterGroup.rpc.oracle.getOracleData(oracleId)
    console.log(oracleData)
    // set collateral token and loan token
    //  const collateralAddress = await tGroup.get(0).container.getNewAddress()
    // await tGroup.get(0).token.create({ symbol: 'TSLA', collateralAddress })
    await loanTokenMinterGroup.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await tGroup.get(0).container.generate(1)

    await loanTokenMinterGroup.rpc.loan.setCollateralToken({
      token: 'TSLA',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'TSLA/USD'
    })

    await loanTokenMinterGroup.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })

    await tGroup.get(0).container.generate(1)

    const yy = await loanTokenMinterGroup.rpc.loan.listLoanTokens()
    console.log(yy)

    await loanTokenMinterGroup.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })

    await loanTokenMinterGroup.generate(1)

    // create a fake loan scheme just to mint TSLA
    const loanSchemeId = 'fakeLoan'
    await loanTokenMinterGroup.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(0.01),
      id: loanSchemeId
    })

    await loanTokenMinterGroup.generate(1)

    // create vault for loanTokenMinter
    const vaultAddress = await loanTokenMinterGroup.generateAddress()
    const vaultId = await loanTokenMinterGroup.rpc.loan.createVault({
      ownerAddress: vaultAddress,
      loanSchemeId: loanSchemeId
    })
    await loanTokenMinterGroup.container.generate(1)

    const utxos = await loanTokenMinterGroup.container.call('listunspent')
    const inputs = utxos.map((utxo: { txid: string, vout: number }) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    // const tokenBalanceResBefore = await loanTokenMinterGroup.rpc.account.getTokenBalances()
    // console.log(tokenBalanceResBefore)

    await loanTokenMinterGroup.rpc.account.utxosToAccount({ [loanTokenMinterAddress]: '200@DFI' }, inputs)
    // need alot of blocks to allow spending
    await loanTokenMinterGroup.generate(100)

    const tokenBalanceResAfter = await loanTokenMinterGroup.rpc.wallet.getBalance()
    console.log(tokenBalanceResAfter)

    // deposit collateral to vault
    await loanTokenMinterGroup.rpc.loan.depositToVault({
      vaultId: vaultId,
      from: loanTokenMinterAddress,
      amount: '100@DFI'
    })

    await loanTokenMinterGroup.generate(1)

    const loanMinterBalanceAfterDepositToVault = await loanTokenMinterGroup.rpc.account.getTokenBalances()
    console.log(loanMinterBalanceAfterDepositToVault)

    // const zz = await loanTokenMinterGroup.rpc.loan.getLoanToken('TSLA')
    // console.log(zz)

    await loanTokenMinterGroup.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '1000@TSLA',
      to: loanTokenMinterAddress
    })

    let loanMinterBalanceAfterLoan = await loanTokenMinterGroup.rpc.account.getTokenBalances()
    console.log(loanMinterBalanceAfterLoan)

    await loanTokenMinterGroup.rpc.oracle.setOracleData(oracleId, now(), { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await loanTokenMinterGroup.generate(20)
    await loanTokenMinterGroup.rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '1@DUSD',
      to: loanTokenMinterAddress
    })

    await loanTokenMinterGroup.generate(1)

    loanMinterBalanceAfterLoan = await loanTokenMinterGroup.rpc.account.getTokenBalances()
    console.log(loanMinterBalanceAfterLoan)

    const recepientGroup = tGroup.get(1)
    const recepientGroupAddr = await recepientGroup.generateAddress()
    await recepientGroup.generate(1)

    let recepientBalance = await recepientGroup.rpc.account.getTokenBalances()
    console.log(recepientBalance)

    await loanTokenMinterGroup.rpc.account.accountToAccount(loanTokenMinterAddress, { [recepientGroupAddr]: '10@TSLA' })
    await loanTokenMinterGroup.generate(1)

    recepientBalance = await recepientGroup.rpc.account.getTokenBalances()
    console.log(recepientBalance)
  }

  it('test', async () => {
    console.log('testing 123')
  }, 580000)
})
