import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Loan depositToVault', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  let vaultId: string
  let vaultId1: string
  let liqVaultId: string
  let collateralAddress: string
  let vaultAddress: string

  beforeAll(async () => {
    await tGroup.start()
    await tGroup.get(0).container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function setup (): Promise<void> {
    // oracle setup
    const addr = await tGroup.get(0).generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'CAT', currency: 'USD' }
    ]
    const oracleId = await tGroup.get(0).rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await tGroup.get(0).generate(1)
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '10000@CAT', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    // token setup
    collateralAddress = await tGroup.get(0).container.getNewAddress()
    await tGroup.get(0).token.dfi({ address: collateralAddress, amount: 30000 })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).token.create({ symbol: 'BTC', collateralAddress })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).token.mint({ symbol: 'BTC', amount: 20000 })
    await tGroup.get(0).generate(1)

    // set loan token here to also create it at the same time so that we can set it as collateral later
    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'CAT',
      fixedIntervalPriceId: 'CAT/USD'
    })
    await tGroup.get(0).generate(1)
    // await tGroup.get(0).token.create({ symbol: 'CAT', collateralAddress })
    // await tGroup.get(0).generate(1)
    // await tGroup.get(0).token.mint({ symbol: 'CAT', amount: 10000 })
    // await tGroup.get(0).generate(1)

    // collateral token
    await tGroup.get(0).rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.setCollateralToken({
      token: 'CAT',
      factor: new BigNumber(0.1),
      fixedIntervalPriceId: 'CAT/USD'
    })
    await tGroup.get(0).generate(1)

    // loan token
    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })

    await tGroup.get(0).generate(1)

    // loan scheme set up
    await tGroup.get(0).rpc.loan.createLoanScheme({
      minColRatio: 150,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })

    const loanTokenMinterSchemeId = 'minter'
    await tGroup.get(0).rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(0.01),
      id: loanTokenMinterSchemeId
    })
    await tGroup.get(0).generate(1)

    vaultAddress = await tGroup.get(0).generateAddress()
    vaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: vaultAddress,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    vaultId1 = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    // set up liquidated vault here
    liqVaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: await tGroup.get(0).generateAddress(),
      loanSchemeId: 'scheme'
    })

    // set up loan token vault
    const loanTokenMinterAddress = await tGroup.get(0).generateAddress()
    const loanTokenVaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: loanTokenMinterAddress,
      loanSchemeId: loanTokenMinterSchemeId
    })

    await tGroup.get(0).generate(1)

    // prefund loanTokenVaultOwner with alot of DFI
    const utxos = await tGroup.get(0).rpc.wallet.listUnspent()
    const inputs = utxos.map((utxo: { txid: string, vout: number }) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })
    await tGroup.get(0).rpc.account.utxosToAccount({ [loanTokenMinterAddress]: '100000000@DFI' }, inputs)
    await tGroup.get(0).container.generate(1)

    // deposit to vault to loan CAT
    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: loanTokenVaultId, from: loanTokenMinterAddress, amount: '100000000@DFI'
    })
    await tGroup.get(0).container.generate(1)

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: loanTokenVaultId,
      amounts: '10000@CAT',
      to: loanTokenMinterAddress
    })
    await tGroup.get(0).container.generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: liqVaultId, from: collateralAddress, amount: '10000@DFI'
    })
    await tGroup.get(0).generate(1)

    // transferring CAT to collateralAddress
    await tGroup.get(0).rpc.account.accountToAccount(loanTokenMinterAddress, { [collateralAddress]: '10000@CAT' })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: liqVaultId, from: collateralAddress, amount: '1@CAT'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: liqVaultId,
      amounts: '100@TSLA'
    })
    await tGroup.get(0).generate(1)

    // liquidated: true
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '100000@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
  }

  // TODO: Logic moved to take loan (need to test it on take loan side instead)
  it.skip('should be failed as first deposit must be DFI', async () => {
    const promise = tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '1@BTC'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('At least 50% of the vault must be in DFI thus first deposit must be DFI')
  })

  it('should be failed as insufficient fund', async () => {
    const promise = tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '99999@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Insufficient funds: can't subtract balance of ${collateralAddress}: amount 20000.00000000 is less than 99999.00000000`)
  })

  it('should be failed as different auth address', async () => {
    const addr = await tGroup.get(1).generateAddress()
    const promise = tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: addr, amount: '1@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Incorrect authorization for ${addr}`)
  })

  it('should be failed as vault is not exists', async () => {
    const promise = tGroup.get(0).rpc.loan.depositToVault({
      vaultId: '0'.repeat(64), from: collateralAddress, amount: '10000@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
  })

  it('should depositToVault', async () => {
    {
      const vaultBefore = await tGroup.get(0).container.call('getvault', [vaultId])
      expect(vaultBefore.loanSchemeId).toStrictEqual('scheme')
      expect(vaultBefore.ownerAddress).toStrictEqual(vaultAddress)
      expect(vaultBefore.state).toStrictEqual('active')
      expect(vaultBefore.loanAmounts).toStrictEqual([])
      expect(vaultBefore.loanValue).toStrictEqual(0)
      expect(vaultBefore.collateralRatio).toStrictEqual(-1) // empty loan

      const vaultBeforeDFIAcc = vaultBefore.collateralAmounts.length > 0
        ? vaultBefore.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
        : undefined
      const vaultBeforeDFIAmt = vaultBeforeDFIAcc !== undefined ? Number(vaultBeforeDFIAcc.split('@')[0]) : 0

      const depositId = await tGroup.get(0).rpc.loan.depositToVault({
        vaultId: vaultId, from: collateralAddress, amount: '10000@DFI'
      })
      expect(typeof depositId).toStrictEqual('string')
      await tGroup.get(0).generate(1)
      await tGroup.waitForSync()

      const vaultAfter = await tGroup.get(0).container.call('getvault', [vaultId])
      // check the changes after deposit
      expect(vaultAfter.loanSchemeId).toStrictEqual(vaultBefore.loanSchemeId)
      expect(vaultAfter.ownerAddress).toStrictEqual(vaultBefore.ownerAddress)
      expect(vaultAfter.state).toStrictEqual(vaultBefore.state)
      expect(vaultAfter.loanAmounts).toStrictEqual(vaultBefore.loanAmounts)
      expect(vaultAfter.loanValue).toStrictEqual(vaultBefore.loanValue)
      expect(vaultAfter.collateralRatio).toStrictEqual(vaultBefore.collateralRatio)

      // assert collateralAmounts
      const vaultAfterDFIAcc = vaultAfter.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
      const vaultAFterDFIAmt = Number(vaultAfterDFIAcc.split('@')[0])
      expect(vaultAFterDFIAmt - vaultBeforeDFIAmt).toStrictEqual(10000)

      // assert collateralValue
      // calculate DFI collateral value with factor
      const dfiDeposit = 10000 * 1 * 1 // deposit 10000 DFI * priceFeed 1 USD * 1 factor
      expect(vaultAfter.collateralValue - vaultBefore.collateralValue).toStrictEqual(dfiDeposit)
    }

    {
      const vaultBefore = await tGroup.get(0).container.call('getvault', [vaultId])
      const vaultBeforeBTCAcc = vaultBefore.collateralAmounts.length > 0
        ? vaultBefore.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'BTC')
        : undefined
      const vaultBeforeBTCAmt = vaultBeforeBTCAcc !== undefined ? Number(vaultBeforeBTCAcc.split('@')[0]) : 0

      const depositId = await tGroup.get(0).rpc.loan.depositToVault({
        vaultId: vaultId, from: collateralAddress, amount: '1@BTC'
      })
      expect(typeof depositId).toStrictEqual('string')
      await tGroup.get(0).generate(1)
      await tGroup.waitForSync()

      const vaultAfter = await tGroup.get(0).container.call('getvault', [vaultId])
      // assert collateralAmounts
      const vaultAfterBTCAcc = vaultAfter.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'BTC')
      const vaultAFterBTCAmt = Number(vaultAfterBTCAcc.split('@')[0])
      expect(vaultAFterBTCAmt - vaultBeforeBTCAmt).toStrictEqual(1)

      // assert collateralValue
      // calculate BTC collateral value with factor
      const btcDeposit = 1 * 10000 * 0.5 // deposit 1 BTC * priceFeed 10000 USD * 0.5 factor
      expect(vaultAfter.collateralValue - vaultBefore.collateralValue).toStrictEqual(btcDeposit)
    }
  })

  it('should be able to depositToVault by anyone', async () => {
    const vaultBefore = await tGroup.get(0).container.call('getvault', [vaultId])

    const vaultBeforeDFIAcc = vaultBefore.collateralAmounts.length > 0
      ? vaultBefore.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
      : undefined
    const vaultBeforeDFIAmt = vaultBeforeDFIAcc !== undefined ? Number(vaultBeforeDFIAcc.split('@')[0]) : 0

    // test node1 deposits to vault
    const addr = await tGroup.get(1).generateAddress()
    await tGroup.get(1).token.dfi({ address: addr, amount: 100 })
    await tGroup.get(1).generate(1)
    const depositId = await tGroup.get(1).rpc.loan.depositToVault({
      vaultId: vaultId, from: addr, amount: '2@DFI'
    })
    expect(typeof depositId).toStrictEqual('string')
    await tGroup.get(1).generate(1)
    await tGroup.waitForSync()
    const vaultAfter = await tGroup.get(0).container.call('getvault', [vaultId])

    // compare colalteralAmounts
    const vaultAfterDFIAcc = vaultAfter.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
    const vaultAFterDFIAmt = Number(vaultAfterDFIAcc.split('@')[0])
    expect(vaultAFterDFIAmt - vaultBeforeDFIAmt).toStrictEqual(2)

    // compare collateralValue
    // calculate DFI collateral value with factor
    const dfiDeposit = 2 * 1 * 1 // deposit 10000 DFI * priceFeed 1 USD * 1 factor
    expect(vaultAfter.collateralValue - vaultBefore.collateralValue).toStrictEqual(dfiDeposit)
  })

  it('should depositToVault with utxos', async () => {
    const vaultBefore = await tGroup.get(0).container.call('getvault', [vaultId])
    const vaultBeforeDFIAcc = vaultBefore.collateralAmounts.length > 0
      ? vaultBefore.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
      : undefined
    const vaultBeforeDFIAmt = vaultBeforeDFIAcc !== undefined ? Number(vaultBeforeDFIAcc.split('@')[0]) : 0

    const utxo = await tGroup.get(0).container.fundAddress(collateralAddress, 250)
    const depositId = await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '250@DFI'
    }, [utxo])
    expect(typeof depositId).toStrictEqual('string')
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    const vaultAfter = await tGroup.get(0).container.call('getvault', [vaultId])
    const vaultAfterDFIAcc = vaultAfter.collateralAmounts.find((amt: string) => amt.split('@')[1] === 'DFI')
    const vaultAFterDFIAmt = Number(vaultAfterDFIAcc.split('@')[0])
    expect(vaultAFterDFIAmt - vaultBeforeDFIAmt).toStrictEqual(250)

    const rawtx = await tGroup.get(0).container.call('getrawtransaction', [depositId, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })

  it('should not depositToVault with arbitrary utxos', async () => {
    const utxo = await tGroup.get(0).container.fundAddress(await tGroup.get(0).generateAddress(), 10)

    const promise = tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId1, from: collateralAddress, amount: '1@BTC'
    }, [utxo])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('tx must have at least one input from token owner')
  })

  // TODO: Logic moved to take loan (need to test it on take loan side instead)
  it.skip('should be failed as vault must contain min 50% of DFI', async () => {
    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId1, from: collateralAddress, amount: '1000@DFI'
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    // deposit * factor >= collateralValue / 2
    const promise = tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId1, from: collateralAddress, amount: '0.201@BTC' // Throw error if more than 0.2
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('At least 50% of the vault must be in DFI')
  })

  it('should not deposit to liquidated vault', async () => {
    await tGroup.get(0).generate(6)

    const liqVault = await tGroup.get(0).container.call('getvault', [liqVaultId])
    expect(liqVault.state).toStrictEqual('inLiquidation')

    const promise = tGroup.get(0).rpc.loan.depositToVault({
      vaultId: liqVaultId, from: collateralAddress, amount: '1000@DFI'
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot deposit to vault under liquidation')
  })
})
