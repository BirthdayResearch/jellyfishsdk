import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys, StartFlags } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { VaultActive } from 'packages/jellyfish-api-core/src/category/loan'

describe('Loan', () => {
  const tGroup = TestingGroup.create(3, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  let vaultId1!: string // without loan taken
  let vaultId2: string // single collateral, with loan taken, test: loan:collateral ratio
  let vaultId3: string // dual collateral, with loan taken, test: liquidated vault, DFI/total collateral ratio
  let collateralAddress!: string
  let vaultOwner!: string
  let oracleId!: string
  let oracleTickTimestamp!: number

  beforeAll(async () => {
    await tGroup.start()
    await tGroup.get(0).container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterAll(async () => {
    await tGroup.stop()
  })

  async function setup (): Promise<void> {
    // token setup
    collateralAddress = await tGroup.get(0).container.getNewAddress()
    await tGroup.get(0).token.dfi({ address: collateralAddress, amount: 30000 })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).token.create({ symbol: 'BTC', collateralAddress })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).token.mint({ symbol: 'BTC', amount: 20000 })
    await tGroup.get(0).generate(1)

    // oracle setup
    const addr = await tGroup.get(0).generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
    ]
    oracleId = await tGroup.get(0).rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await tGroup.get(0).generate(1)
    oracleTickTimestamp = Math.floor(new Date().getTime() / 1000)
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, oracleTickTimestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, oracleTickTimestamp, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, oracleTickTimestamp, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

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
    await tGroup.get(0).generate(1)
    vaultOwner = await tGroup.get(0).generateAddress()

    {
      // vault1: 2 types of collateral token, no loan taken
      vaultId1 = await tGroup.get(0).rpc.loan.createVault({
        ownerAddress: vaultOwner,
        loanSchemeId: 'scheme'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.loan.depositToVault({
        vaultId: vaultId1, from: collateralAddress, amount: '10000@DFI'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.loan.depositToVault({
        vaultId: vaultId1, from: collateralAddress, amount: '1@BTC'
      })
      await tGroup.get(0).generate(1)
    }

    {
      // vault2: single collateral token, loan taken, ease ratio control
      vaultId2 = await tGroup.get(0).rpc.loan.createVault({
        ownerAddress: await tGroup.get(0).generateAddress(),
        loanSchemeId: 'scheme'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.loan.depositToVault({
        vaultId: vaultId2, from: collateralAddress, amount: '10000@DFI'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
      await tGroup.get(0).rpc.loan.takeLoan({
        vaultId: vaultId2,
        amounts: '100@TSLA'
      })
      await tGroup.get(0).generate(1)
    }

    {
      // vault3: 2 types of collateral token, loan taken, to be liquidated
      vaultId3 = await tGroup.get(0).rpc.loan.createVault({
        ownerAddress: await tGroup.get(0).generateAddress(),
        loanSchemeId: 'scheme'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.loan.depositToVault({
        vaultId: vaultId3, from: collateralAddress, amount: '10000@DFI'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.loan.depositToVault({
        vaultId: vaultId3, from: collateralAddress, amount: '1@BTC'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
      await tGroup.get(0).rpc.loan.takeLoan({
        vaultId: vaultId3,
        amounts: '2000@TSLA'
      })
      await tGroup.get(0).generate(1)
    }

    await tGroup.waitForSync()
  }

  describe('success cases', () => {
    it('should withdrawFromVault', async () => {
      const anotherMn = tGroup.get(1)
      const destinationAddress = await anotherMn.generateAddress()

      { // before
        const accountBalances = await anotherMn.rpc.account.getAccount(destinationAddress)
        expect(accountBalances.length).toStrictEqual(0)

        const { collateralAmounts } = await tGroup.get(0).rpc.loan.getVault(vaultId1) as VaultActive
        expect(collateralAmounts?.length).toStrictEqual(2)

        {
          const dfiCol = collateralAmounts?.find(c => c.includes('DFI'))
          expect(dfiCol).toBeDefined()
          const [amount, tokenSymbol] = (dfiCol as string).split('@')
          expect(tokenSymbol).toStrictEqual('DFI')
          expect(amount).toStrictEqual('10000.00000000')
        }
        {
          const btcCol = collateralAmounts?.find(c => c.includes('BTC'))
          expect(btcCol).toBeDefined()
          const [amount, tokenSymbol] = (btcCol as string).split('@')
          expect(tokenSymbol).toStrictEqual('BTC')
          expect(amount).toStrictEqual('1.00000000')
        }
      }

      await tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId1,
        to: destinationAddress,
        amount: '9.876@DFI'
      })
      await tGroup.get(0).generate(1)
      await tGroup.waitForSync()

      { // after first withdrawal
        const accountBalances = await tGroup.get(0).rpc.account.getAccount(destinationAddress)
        expect(accountBalances.length).toStrictEqual(1)
        expect(accountBalances[0]).toStrictEqual('9.87600000@DFI')

        const { collateralAmounts } = await anotherMn.rpc.loan.getVault(vaultId1) as VaultActive
        expect(collateralAmounts?.length).toStrictEqual(2)

        {
          const dfiCol = collateralAmounts?.find(c => c.includes('DFI'))
          expect(dfiCol).toBeDefined()
          const [amount, tokenSymbol] = (dfiCol as string).split('@')
          expect(tokenSymbol).toStrictEqual('DFI')
          expect(amount).toStrictEqual('9990.12400000')
        }
        { // unchanged
          const btcCol = collateralAmounts?.find(c => c.includes('BTC'))
          expect(btcCol).toBeDefined()
          const [amount, tokenSymbol] = (btcCol as string).split('@')
          expect(tokenSymbol).toStrictEqual('BTC')
          expect(amount).toStrictEqual('1.00000000')
        }
      }

      await tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId1,
        to: destinationAddress,
        amount: '0.123@BTC'
      })
      await tGroup.get(0).generate(1)
      await tGroup.waitForSync()

      { // after second withdrawal
        const accountBalances = await anotherMn.rpc.account.getAccount(destinationAddress)
        expect(accountBalances.length).toStrictEqual(2)
        expect(accountBalances[0]).toStrictEqual('9.87600000@DFI')
        expect(accountBalances[1]).toStrictEqual('0.12300000@BTC')

        const { collateralAmounts } = await anotherMn.rpc.loan.getVault(vaultId1) as VaultActive
        expect(collateralAmounts?.length).toStrictEqual(2)

        {
          const dfiCol = collateralAmounts?.find(c => c.includes('DFI'))
          expect(dfiCol).toBeDefined()
          const [amount, tokenSymbol] = (dfiCol as string).split('@')
          expect(tokenSymbol).toStrictEqual('DFI')
          expect(amount).toStrictEqual('9990.12400000')
        }
        { // unchanged
          const btcCol = collateralAmounts?.find(c => c.includes('BTC'))
          expect(btcCol).toBeDefined()
          const [amount, tokenSymbol] = (btcCol as string).split('@')
          expect(tokenSymbol).toStrictEqual('BTC')
          expect(amount).toStrictEqual('0.87700000')
        }
      }
    })

    it('should withdrawFromVault using specific utxo', async () => {
      const destinationAddress = await tGroup.get(0).generateAddress()
      const utxo = await tGroup.get(0).container.fundAddress(vaultOwner, 10)
      const txid = await tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId1,
        to: destinationAddress,
        amount: '2.34567@DFI'
      }, [utxo])

      const rawtx = await tGroup.get(0).container.call('getrawtransaction', [txid, true])
      expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
      expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
      await tGroup.get(0).generate(1)

      const accountBalances = await tGroup.get(0).rpc.account.getAccount(destinationAddress)
      expect(accountBalances.length).toStrictEqual(1)
      expect(accountBalances[0]).toStrictEqual('2.34567000@DFI')
    })
  })

  describe('fail cases', () => {
    it('should not withdrawFromVault with invalid vaultId', async () => {
      const promise = tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: '0'.repeat(64),
        to: await tGroup.get(0).generateAddress(),
        amount: '9.876@DFI'
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
    })

    it('should not withdrawFromVault with invalid collateral token', async () => {
      const promise = tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId1,
        to: await tGroup.get(0).generateAddress(),
        amount: '9.876@GOLD'
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('amount: Invalid Defi token: GOLD')
    })

    it('should not withdrawFromVault exceeded total collateral (no loan token)', async () => {
      const promise = tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId1,
        to: await tGroup.get(0).generateAddress(),
        amount: '10000.00000001@DFI'
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('amount 9987.77833000 is less than 10000.00000001')
    })

    it('should not withdrawFromVault cause DFI collateral value less than 50% of the minimum required collateral', async () => {
      // loan amount = 2000Tsla, 4,000 usd
      // collateral = 10,000 dfi , 10,000*0.5 (col factor) usd + 0.1btc, 5,000usd
      // after withdraw:
      // 10,000-7000 < (4000+interest)*1.5/2, 3000 < (3000 + interest)
      const promise = tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId3,
        to: await tGroup.get(0).generateAddress(),
        amount: '7000@DFI'
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('At least 50% of the minimum required collateral must be in DFI')
    })

    it('should not withdrawFromVault when DFI collateral value is already less than 50% of the minimum required collateral', async () => {
      // loan value = 4000 usd + interest
      // current collateral value = 10,000usd (dfi) + 10,000usd(btc) * 0.5
      // new dfi price 0.3
      // dfi collateral value = 3000usd
      // 3000 < (4000+interest) * 1.5/2 , 3000 < (3000 + interest)
      {
        // reduce DFI value to below 50%
        await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '0.3@DFI', currency: 'USD' }] })
        await tGroup.get(0).generate(12)
      }

      const promise = tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId3,
        to: await tGroup.get(0).generateAddress(),
        amount: '1@DFI' // use small amount, no DFI can be withdrawn when below 50% of total
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('At least 50% of the minimum required collateral must be in DFI')
      {
        // revert DFI value
        await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
        await tGroup.get(0).generate(12)
      }
    })

    it('should not withdrawFromVault exceeded minCollateralRatio', async () => {
      /**
        * collateral = 10000 DFI  = 10000 USD
        * loan = 100 TSLA = 200 USD
        * min collateral = 200 * 150% = 300
        */
      const promise = tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId2,
        to: await tGroup.get(0).generateAddress(),
        amount: '99701@DFI'
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('amount 10000.00000000 is less than 99701.00000000')
    })

    it('should not withdrawFromVault liquidated vault', async () => {
      // trigger liquidation
      // current loan value = 4000usd
      // max loan available to borrow  = (10,000 + 10,000 *0.5 (col factor))/1.5 = 10000
      // tsla price to liquidate = 10000/2000  = 5
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '5.5@TSLA', currency: 'USD' }] })
      await tGroup.get(0).generate(13)

      const promise = tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId3,
        to: await tGroup.get(0).generateAddress(),
        amount: '0.00000001@DFI'
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Cannot withdraw from vault under liquidation')

      // stop liq, revert TSLA price to $2
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
      // wait/ensure auction period to ended, 6 hr * * 60 min * 2 (blocks per min)
      await tGroup.get(0).generate(6 * 6 * 2)

      // success withdrawal after auction ended
      await tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId3,
        to: await tGroup.get(0).generateAddress(),
        amount: '0.00000001@DFI'
      })
    })

    it('should not withdrawFromVault when price is invalid', async () => {
      // trigger liquidation
      // min collateral required = (10000 DFI * 1 USD/DFI + 1 BTC * 0.5 (col-factor) * 10000 UDF/BTC) / 149.5% = 15000 / 1.495 = 10033.44... USD
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
        prices: [{
          tokenAmount: `${2 * 5}@TSLA`, // bump price for 31%
          currency: 'USD'
        }]
      })
      await tGroup.get(0).generate(6)

      const promise = tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId3,
        to: await tGroup.get(0).generateAddress(),
        amount: '0.00000001@DFI'
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Cannot withdraw from vault while any of the asset\'s price is invalid')
    })

    it('should not withdrawFromVault without valid auth', async () => {
      const promise = tGroup.get(1).rpc.loan.withdrawFromVault({
        vaultId: vaultId1,
        to: await tGroup.get(0).generateAddress(),
        amount: '9.876@DFI'
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`Incorrect authorization for ${vaultOwner}`)
    })

    it('should not withdrawFromVault with not mine utxo', async () => {
      const anotherMn = tGroup.get(1)
      const utxo = await anotherMn.container.fundAddress(await anotherMn.generateAddress(), 10)
      const promise = tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId1,
        to: await tGroup.get(0).generateAddress(),
        amount: '9.876@DFI'
      }, [utxo])

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Insufficient funds')
    })
  })
})

describe('withdrawFromVault with 50% DUSD or DFI collaterals', () => {
  const tGroup = TestingGroup.create(2)
  const alice = tGroup.get(0)
  const bob = tGroup.get(1)
  let aliceAddr: string
  let bobVaultId: string
  let bobVaultAddr: string
  let bobVault: VaultActive
  let oracleId: string
  let timestamp: number
  const fortCanningRoadHeight = 128

  beforeEach(async () => {
    const startFlags: StartFlags[] = [{ name: 'fortcanningroadheight', value: fortCanningRoadHeight }]
    await tGroup.start({ startFlags: startFlags })
    await alice.container.waitForWalletCoinbaseMaturity()
    await setup()
  })

  afterEach(async () => {
    await tGroup.stop()
  })

  async function setup (): Promise<void> {
    // token setup
    aliceAddr = await alice.container.getNewAddress()
    await alice.token.dfi({ address: aliceAddr, amount: 40000 })
    await alice.generate(1)

    // oracle setup
    const addr = await alice.generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'DUSD', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
    ]
    oracleId = await alice.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await alice.generate(1)
    timestamp = Math.floor(new Date().getTime() / 1000)
    await alice.rpc.oracle.setOracleData(
      oracleId,
      timestamp,
      {
        prices: [
          { tokenAmount: '1@DFI', currency: 'USD' },
          { tokenAmount: '1@DUSD', currency: 'USD' },
          { tokenAmount: '10000@BTC', currency: 'USD' },
          { tokenAmount: '2@TSLA', currency: 'USD' }
        ]
      })
    await alice.generate(1)

    // collateral token
    await alice.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })
    await alice.generate(1)

    await takeDusdTokensToPayback()

    await alice.rpc.loan.setCollateralToken({
      token: 'DUSD',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await alice.generate(1)

    await alice.token.create({ symbol: 'BTC', collateralAddress: aliceAddr })
    await alice.generate(1)

    await alice.token.mint({ symbol: 'BTC', amount: 4 })
    await alice.generate(1)

    await alice.rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(0.5),
      fixedIntervalPriceId: 'BTC/USD'
    })
    await alice.generate(1)

    // loan scheme set up
    await alice.rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    bobVaultAddr = await bob.generateAddress()
    bobVaultId = await bob.rpc.loan.createVault({
      ownerAddress: bobVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    // deposit on active vault
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '5000@DFI' // collateral value = 5000 USD
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '5000@DUSD' // collateral value = 5000 USD
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@BTC' // collateral value = 1 x 10000 x 0.5 = 5000 USD
    })
    await alice.generate(1)
    await tGroup.waitForSync()

    // loan token
    await bob.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await bob.generate(1)

    bobVault = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(bobVault.loanSchemeId).toStrictEqual('scheme')
    expect(bobVault.ownerAddress).toStrictEqual(bobVaultAddr)
    expect(bobVault.state).toStrictEqual('active')
    expect(bobVault.collateralAmounts).toStrictEqual(['5000.00000000@DFI', '5000.00000000@DUSD', '1.00000000@BTC'])
    expect(bobVault.collateralValue).toStrictEqual(new BigNumber(15000))
    expect(bobVault.loanAmounts).toStrictEqual([])
    expect(bobVault.loanValue).toStrictEqual(new BigNumber(0))
    expect(bobVault.interestAmounts).toStrictEqual([])
    expect(bobVault.interestValue).toStrictEqual(new BigNumber(0))
    expect(bobVault.collateralRatio).toStrictEqual(-1) // empty loan
    expect(bobVault.informativeRatio).toStrictEqual(new BigNumber(-1)) // empty loan
  }

  // this will borrow dusd tokens and will give to aliceAddr
  async function takeDusdTokensToPayback (): Promise<void> {
    await alice.rpc.loan.setLoanToken({
      symbol: 'DUSD',
      fixedIntervalPriceId: 'DUSD/USD'
    })
    await alice.generate(1)

    const tokenProviderSchemeId = 'LoanDusd'
    await alice.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(0.01),
      id: tokenProviderSchemeId
    })
    await alice.generate(1)

    const tokenProviderVaultAddress = await alice.generateAddress()
    const tokenProviderVaultId = await alice.rpc.loan.createVault({
      ownerAddress: tokenProviderVaultAddress,
      loanSchemeId: tokenProviderSchemeId
    })
    await alice.generate(1)

    await alice.rpc.loan.depositToVault({
      vaultId: tokenProviderVaultId,
      from: aliceAddr,
      amount: '10000@DFI'
    })
    await alice.generate(1)

    await alice.rpc.loan.takeLoan({
      vaultId: tokenProviderVaultId,
      amounts: '10000@DUSD',
      to: tokenProviderVaultAddress
    })
    await alice.generate(1)

    await alice.rpc.account.accountToAccount(tokenProviderVaultAddress, { [aliceAddr]: '10000@DUSD' })
  }

  it('should withdrawFromVault - If there is no loan, everything can be withdrawn', async () => {
    const destinationAddress = await alice.generateAddress()
    const accountBalancesBefore = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesBefore.length).toStrictEqual(0)

    // remove dfi collateral, new total collateral = 10000 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: destinationAddress, amount: '5000@DFI'
    })
    await bob.generate(1)

    // remove dusd collateral, new total collateral = 5000 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: destinationAddress, amount: '5000@DUSD'
    })
    await bob.generate(1)

    // remove btc collateral, new total collateral = 0 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: destinationAddress, amount: '1@BTC'
    })
    await bob.generate(1)

    await tGroup.waitForSync()

    const accountBalancesAfter = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesAfter.length).toStrictEqual(3)
    expect(accountBalancesAfter).toStrictEqual(['5000.00000000@DFI', '5000.00000000@DUSD', '1.00000000@BTC'])

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.collateralAmounts).toStrictEqual([])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(0))
  })

  it('should withdrawFromVault with 50% DUSD collateral', async () => {
    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)
    await tGroup.waitForSync()

    const destinationAddress = await alice.generateAddress()
    const accountBalancesBefore = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesBefore.length).toStrictEqual(0)

    const tslaLoanAmount = 2500 // loan amount = 5000 USD
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    // remove dfi collateral, new total collateral = 10000 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: destinationAddress, amount: '5000@DFI'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    const accountBalancesAfter = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesAfter.length).toStrictEqual(1)
    expect(accountBalancesAfter[0]).toStrictEqual('5000.00000000@DFI')

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.collateralAmounts).toStrictEqual(['5000.00000000@DUSD', '1.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(10000))
  })

  it('should withdrawFromVault with 50% DUSD of minimum required collateral', async () => {
    // add btc collateral, new total collateral = 20000 USD
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@BTC' // collateral value = 1 x 10000 x 0.5 = 5000 USD
    })
    await alice.generate(1)

    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)
    await tGroup.waitForSync()

    const destinationAddress = await alice.generateAddress()
    const accountBalancesBefore = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesBefore.length).toStrictEqual(0)

    const tslaLoanAmount = 2500 // loan amount = 5000 USD
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    // remove dfi collateral, new total collateral = 10000 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: destinationAddress, amount: '5000@DFI'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    const accountBalancesAfter = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesAfter.length).toStrictEqual(1)
    expect(accountBalancesAfter[0]).toStrictEqual('5000.00000000@DFI')

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.collateralAmounts).toStrictEqual(['5000.00000000@DUSD', '2.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(15000))
  })

  it('should withdrawFromVault with 25% DFI + 25% DUSD collateral', async () => {
    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)
    await tGroup.waitForSync()

    const destinationAddress = await alice.generateAddress()
    const accountBalancesBefore = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesBefore.length).toStrictEqual(0)

    const tslaLoanAmount = 2500 // loan amount = 5000 USD
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    // remove dfi collateral, new total collateral = 12500 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: destinationAddress, amount: '2500@DFI'
    })
    // remove dusd collateral, new total collateral = 10000 USD
    await bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: destinationAddress, amount: '2500@DUSD'
    })
    await bob.generate(1)
    await tGroup.waitForSync()

    const accountBalancesAfter = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesAfter.length).toStrictEqual(2)
    expect(accountBalancesAfter[0]).toStrictEqual('2500.00000000@DFI')
    expect(accountBalancesAfter[1]).toStrictEqual('2500.00000000@DUSD')

    const vaultAfter = await bob.rpc.loan.getVault(bobVaultId) as VaultActive
    expect(vaultAfter.collateralAmounts).toStrictEqual(['2500.00000000@DFI', '2500.00000000@DUSD', '1.00000000@BTC'])
    expect(vaultAfter.collateralValue).toStrictEqual(new BigNumber(10000))
  })

  it('should not withdrawFromVault with 50% DUSD collateral before reaching fort canning road height', async () => {
    const destinationAddress = await alice.generateAddress()
    const accountBalancesBefore = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesBefore.length).toStrictEqual(0)

    const tslaLoanAmount = 2500 // loan amount = 5000 USD
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    // remove dfi collateral, new total collateral = 10000 USD
    const txid = bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: destinationAddress, amount: '5000@DFI'
    })
    await expect(txid).rejects.toThrow(RpcApiError)
    await expect(txid).rejects.toThrow('At least 50% of the minimum required collateral must be in DFI')
  })

  it('should not takeLoan with 33.33% DUSD collateral', async () => {
    // add btc collateral, new total collateral = 20000 USD
    await alice.rpc.loan.depositToVault({
      vaultId: bobVaultId, from: aliceAddr, amount: '1@BTC' // collateral value = 1 x 10000 x 0.5 = 5000 USD
    })
    await alice.generate(1)

    // must wait until block count reaches fort canning road height
    const blockCount = await bob.container.getBlockCount()
    await bob.generate(fortCanningRoadHeight - blockCount)
    await tGroup.waitForSync()

    const destinationAddress = await alice.generateAddress()
    const accountBalancesBefore = await alice.rpc.account.getAccount(destinationAddress)
    expect(accountBalancesBefore.length).toStrictEqual(0)

    const tslaLoanAmount = 3750 // loan amount = 7500 USD
    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: `${tslaLoanAmount}@TSLA`
    })
    // remove dfi collateral, new total collateral = 15000 USD
    const txid = bob.rpc.loan.withdrawFromVault({
      vaultId: bobVaultId, to: destinationAddress, amount: '5000@DFI'
    })
    await expect(txid).rejects.toThrow(RpcApiError)
    await expect(txid).rejects.toThrow('At least 50% of the minimum required collateral must be in DFI or DUSD')
  })
})
