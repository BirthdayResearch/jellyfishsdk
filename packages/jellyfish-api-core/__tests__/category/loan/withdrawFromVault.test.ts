import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Loan', () => {
  const tGroup = TestingGroup.create(3, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  let vaultId1!: string // without loan taken
  let vaultId2: string // with loan taken
  let vaultId3: string // with loan taken, liquidated
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

    /* eslint-disable no-lone-blocks */
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

    /* eslint-disable no-lone-blocks */
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

    /* eslint-disable no-lone-blocks */
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
        amounts: '100@TSLA'
      })
      await tGroup.get(0).generate(1)
    }

    await tGroup.waitForSync()
  }

  async function waitForOraclePriceGraduallyChange (previous: number, expected: number): Promise<void> {
    const MULTIPLIER = 1.29 // 30% change causing price invalid

    if (expected === previous) {
      return
    }
    const mode = expected > previous
    let current = previous
    while (mode ? current < expected : current > expected) {
      let next = Number((mode ? current * MULTIPLIER : current / MULTIPLIER).toFixed(8))
      if (mode ? next > expected : next < expected) {
        next = expected
      }
      await tGroup.get(0).rpc.oracle.setOracleData(oracleId, Math.floor(new Date().getTime() / 1000), {
        prices: [{
          tokenAmount: `${next}@TSLA`,
          currency: 'USD'
        }]
      })
      await tGroup.get(0).generate(1)
      current = next
    }
    await tGroup.get(0).generate(5) // wait for newest price to be accepted
  }

  describe('success cases', () => {
    it('should withdrawFromVault', async () => {
      const anotherMn = tGroup.get(1)
      const destinationAddress = await anotherMn.generateAddress()

      { // before
        const accountBalances = await anotherMn.rpc.account.getAccount(destinationAddress)
        expect(accountBalances.length).toStrictEqual(0)

        const { collateralAmounts } = await tGroup.get(0).rpc.loan.getVault(vaultId1)
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

        const { collateralAmounts } = await anotherMn.rpc.loan.getVault(vaultId1)
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

        const { collateralAmounts } = await anotherMn.rpc.loan.getVault(vaultId1)
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
      const utxo = await tGroup.get(0).container.fundAddress(vaultOwner, 10)
      const txid = await tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId1,
        to: collateralAddress,
        amount: '2.34567@DFI'
      }, [utxo])

      const rawtx = await tGroup.get(0).container.call('getrawtransaction', [txid, true])
      expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
      expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
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
      await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> does not found`)
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
      await expect(promise).rejects.toThrow(`Collateral for vault <${vaultId1}> not found`)
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
      await expect(promise).rejects.toThrow(`Collateral for vault <${vaultId2}> not found`)
    })

    it('should not withdrawFromVault liquidated vault', async () => {
      // trigger liquidation
      // min collateral required = (10000 DFI * 1 USD/DFI + 1 BTC * 0.5 (col-factor) * 10000 UDF/BTC) / 149.5% = 15000 / 1.495 = 10033.44... USD
      await waitForOraclePriceGraduallyChange(2, 100.4)

      const promise = tGroup.get(0).rpc.loan.withdrawFromVault({
        vaultId: vaultId3,
        to: await tGroup.get(0).generateAddress(),
        amount: '0.00000001@DFI'
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Vault does not have enough collateralization ratio defined by loan scheme - 149 < 150')

      // stop liq
      await waitForOraclePriceGraduallyChange(100.4, 2)
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
          tokenAmount: `${2 * 1.31}@TSLA`, // bump price for 31%
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
