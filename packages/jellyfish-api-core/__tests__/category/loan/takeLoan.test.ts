import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Loan takeLoan', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  let vaultId: string
  let vaultAddress: string
  let vaultId1: string
  let vaultAddress1: string

  async function setup (): Promise<void> {
    // token setup
    const collateralAddress = await tGroup.get(0).container.getNewAddress()
    await tGroup.get(0).token.dfi({ address: collateralAddress, amount: 30000 })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).token.create({ symbol: 'BTC', collateralAddress })
    await tGroup.get(0).generate(1)
    await tGroup.get(0).token.mint({ symbol: 'BTC', amount: 30000 })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    // oracle setup
    const addr = await tGroup.get(0).generateAddress()
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' }
    ]
    const oracleId = await tGroup.get(0).rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }, { tokenAmount: '10000@BTC', currency: 'USD' }, { tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

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
    await tGroup.waitForSync()

    // loan token
    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    // loan scheme set up
    await tGroup.get(0).rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    vaultAddress = await tGroup.get(0).generateAddress()
    vaultId = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: vaultAddress,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '10000@DFI'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId, from: collateralAddress, amount: '1@BTC'
    })
    await tGroup.get(0).generate(1)

    // another vault
    vaultAddress1 = await tGroup.get(0).generateAddress()
    vaultId1 = await tGroup.get(0).rpc.loan.createVault({
      ownerAddress: vaultAddress1,
      loanSchemeId: 'scheme'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.depositToVault({
      vaultId: vaultId1, from: collateralAddress, amount: '12000@DFI'
    })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()
  }

  describe('takeLoan', () => {
    beforeAll(async () => {
      await tGroup.start()
      await tGroup.get(0).container.waitForWalletCoinbaseMaturity()
      await setup()
    })

    afterAll(async () => {
      await tGroup.stop()
    })

    it('should not takeLoan on nonexistent vault', async () => {
      const promise = tGroup.get(0).rpc.loan.takeLoan({
        vaultId: '0'.repeat(64),
        amounts: '30@TSLA'
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
    })

    it('should not takeLoan on nonexistent loan token', async () => {
      const promise = tGroup.get(0).rpc.loan.takeLoan({
        vaultId: vaultId,
        amounts: '1@BTC'
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Loan token with id (1) does not exist!')
    })

    it('should not takeLoan on invalid token', async () => {
      const promise = tGroup.get(0).rpc.loan.takeLoan({
        vaultId: vaultId,
        amounts: '1@INVALID'
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Invalid Defi token: INVALID')
    })

    it('should not takeLoan on incorrect auth', async () => {
      const promise = tGroup.get(1).rpc.loan.takeLoan({
        vaultId: vaultId,
        amounts: '30@TSLA'
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`Incorrect authorization for ${vaultAddress}`)
    })

    it('should not takeLoan while exceed vault collateralization ratio', async () => {
      const promise = tGroup.get(0).rpc.loan.takeLoan({
        vaultId: vaultId,
        amounts: '300000@TSLA'
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Vault does not have enough collateralization ratio defined by loan scheme')
    })

    it('should not takeLoan on mintable:false token', async () => {
      await tGroup.get(0).container.call('updateloantoken', ['TSLA', { mintable: false }])
      await tGroup.get(0).generate(1)
      await tGroup.waitForSync()

      const promise = tGroup.get(0).rpc.loan.takeLoan({
        vaultId: vaultId,
        amounts: '30@TSLA'
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Loan cannot be taken on token with id (2) as "mintable" is currently false')

      await tGroup.get(0).container.call('updateloantoken', ['TSLA', { mintable: true }])
      await tGroup.get(0).generate(1)
      await tGroup.waitForSync()
    })

    it('should takeLoan', async () => {
      const vaultBefore = await tGroup.get(0).container.call('getvault', [vaultId])
      expect(vaultBefore.loanSchemeId).toStrictEqual('scheme')
      expect(vaultBefore.ownerAddress).toStrictEqual(vaultAddress)
      expect(vaultBefore.isUnderLiquidation).toStrictEqual(false)
      expect(vaultBefore.collateralAmounts).toStrictEqual(['10000.00000000@DFI', '1.00000000@BTC'])
      expect(vaultBefore.collateralValue).toStrictEqual(15000)
      expect(vaultBefore.loanAmounts).toStrictEqual([])
      expect(vaultBefore.loanValue).toStrictEqual(0)
      expect(vaultBefore.currentRatio).toStrictEqual(-1) // empty loan

      const vaultBeforeTSLAAcc = vaultBefore.loanAmounts.length > 0
        ? vaultBefore.loanAmounts.find((amt: string) => amt.split('@')[1] === 'TSLA')
        : undefined
      const vaultBeforeTSLAAmt = vaultBeforeTSLAAcc !== undefined ? Number(vaultBeforeTSLAAcc.split('@')[0]) : 0

      const txid = await tGroup.get(0).rpc.loan.takeLoan({
        vaultId: vaultId,
        amounts: '40@TSLA'
      })
      expect(typeof txid).toStrictEqual('string')
      await tGroup.get(0).generate(1)
      await tGroup.waitForSync()

      const vaultAfter = await tGroup.get(0).container.call('getvault', [vaultId])
      expect(vaultAfter.loanSchemeId).toStrictEqual(vaultBefore.loanSchemeId)
      expect(vaultAfter.ownerAddress).toStrictEqual(vaultBefore.ownerAddress)
      expect(vaultAfter.isUnderLiquidation).toStrictEqual(vaultBefore.isUnderLiquidation)
      expect(vaultAfter.collateralAmounts).toStrictEqual(vaultBefore.collateralAmounts)
      expect(vaultAfter.collateralValue).toStrictEqual(vaultBefore.collateralValue)

      const interestInfo = await tGroup.get(0).container.call('getinterest', ['scheme', 'TSLA'])
      const loanAmounts = new BigNumber(40).plus(interestInfo[0].totalInterest)
      expect(vaultAfter.loanAmounts).toStrictEqual([loanAmounts.toFixed(8) + '@TSLA']) // 40.00002283@TSLA
      expect(vaultAfter.loanValue).toStrictEqual(loanAmounts.multipliedBy(2).toNumber())
      expect(vaultAfter.currentRatio).toStrictEqual(Math.round(vaultAfter.collateralValue / vaultAfter.loanValue * 100))

      const vaultAfterTSLAAcc = vaultAfter.loanAmounts.find((amt: string) => amt.split('@')[1] === 'TSLA')
      const vaultAfterTSLAAmt = Number(vaultAfterTSLAAcc.split('@')[0])
      expect(vaultAfterTSLAAmt - vaultBeforeTSLAAmt).toStrictEqual(40.00002283)
    })
  })

  describe('takeLoan with utxos', () => {
    beforeAll(async () => {
      await tGroup.start()
      await tGroup.get(0).container.waitForWalletCoinbaseMaturity()
      await setup()
    })

    afterAll(async () => {
      await tGroup.stop()
    })

    it('should takeLoan with utxos', async () => {
      const vaultBefore = await tGroup.get(0).container.call('getvault', [vaultId1])
      const vaultBeforeTSLAAcc = vaultBefore.loanAmounts.length > 0
        ? vaultBefore.loanAmounts.find((amt: string) => amt.split('@')[1] === 'TSLA')
        : undefined
      const vaultBeforeTSLAAmt = vaultBeforeTSLAAcc !== undefined ? Number(vaultBeforeTSLAAcc.split('@')[0]) : 0

      const utxo = await tGroup.get(0).container.fundAddress(vaultAddress1, 250)
      const txid = await tGroup.get(0).rpc.loan.takeLoan({
        vaultId: vaultId1,
        amounts: '5@TSLA'
      }, [utxo])
      await tGroup.get(0).generate(1)
      await tGroup.waitForSync()

      const vaultAfter = await tGroup.get(0).container.call('getvault', [vaultId1])
      const vaultAfterTSLAAcc = vaultAfter.loanAmounts.find((amt: string) => amt.split('@')[1] === 'TSLA')
      const vaultAfterTSLAAmt = Number(vaultAfterTSLAAcc.split('@')[0])
      expect(vaultAfterTSLAAmt - vaultBeforeTSLAAmt).toStrictEqual(5.00000285)

      const rawtx = await tGroup.get(0).container.call('getrawtransaction', [txid, true])
      expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
      expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
    })
  })
})
