import { GenesisKeys, MasterNodeRegTestContainer } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'
import { VaultActive } from 'packages/jellyfish-api-core/src/category/vault'

describe('Vault', () => {
  const tGroup = TestingGroup.create(3, i => new MasterNodeRegTestContainer(GenesisKeys[i]))
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
      vaultId1 = await tGroup.get(0).rpc.vault.createVault({
        ownerAddress: vaultOwner,
        loanSchemeId: 'scheme'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.vault.depositToVault({
        vaultId: vaultId1, from: collateralAddress, amount: '10000@DFI'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.vault.depositToVault({
        vaultId: vaultId1, from: collateralAddress, amount: '1@BTC'
      })
      await tGroup.get(0).generate(1)
    }

    {
      // vault2: single collateral token, loan taken, ease ratio control
      vaultId2 = await tGroup.get(0).rpc.vault.createVault({
        ownerAddress: await tGroup.get(0).generateAddress(),
        loanSchemeId: 'scheme'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.vault.depositToVault({
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
      vaultId3 = await tGroup.get(0).rpc.vault.createVault({
        ownerAddress: await tGroup.get(0).generateAddress(),
        loanSchemeId: 'scheme'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.vault.depositToVault({
        vaultId: vaultId3, from: collateralAddress, amount: '10000@DFI'
      })
      await tGroup.get(0).generate(1)

      await tGroup.get(0).rpc.vault.depositToVault({
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

        const { collateralAmounts } = await tGroup.get(0).rpc.vault.getVault(vaultId1) as VaultActive
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

      await tGroup.get(0).rpc.vault.withdrawFromVault({
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

        const { collateralAmounts } = await anotherMn.rpc.vault.getVault(vaultId1) as VaultActive
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

      await tGroup.get(0).rpc.vault.withdrawFromVault({
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

        const { collateralAmounts } = await anotherMn.rpc.vault.getVault(vaultId1) as VaultActive
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
      const txid = await tGroup.get(0).rpc.vault.withdrawFromVault({
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
      const promise = tGroup.get(0).rpc.vault.withdrawFromVault({
        vaultId: '0'.repeat(64),
        to: await tGroup.get(0).generateAddress(),
        amount: '9.876@DFI'
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
    })

    it('should not withdrawFromVault with invalid collateral token', async () => {
      const promise = tGroup.get(0).rpc.vault.withdrawFromVault({
        vaultId: vaultId1,
        to: await tGroup.get(0).generateAddress(),
        amount: '9.876@GOLD'
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('amount: Invalid Defi token: GOLD')
    })

    it('should not withdrawFromVault exceeded total collateral (no loan token)', async () => {
      const promise = tGroup.get(0).rpc.vault.withdrawFromVault({
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
      const promise = tGroup.get(0).rpc.vault.withdrawFromVault({
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

      const promise = tGroup.get(0).rpc.vault.withdrawFromVault({
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
      const promise = tGroup.get(0).rpc.vault.withdrawFromVault({
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

      const promise = tGroup.get(0).rpc.vault.withdrawFromVault({
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
      await tGroup.get(0).rpc.vault.withdrawFromVault({
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

      const promise = tGroup.get(0).rpc.vault.withdrawFromVault({
        vaultId: vaultId3,
        to: await tGroup.get(0).generateAddress(),
        amount: '0.00000001@DFI'
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Cannot withdraw from vault while any of the asset\'s price is invalid')
    })

    it('should not withdrawFromVault without valid auth', async () => {
      const promise = tGroup.get(1).rpc.vault.withdrawFromVault({
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
      const promise = tGroup.get(0).rpc.vault.withdrawFromVault({
        vaultId: vaultId1,
        to: await tGroup.get(0).generateAddress(),
        amount: '9.876@DFI'
      }, [utxo])

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Insufficient funds')
    })
  })
})
