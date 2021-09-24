import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

describe('Loan', () => {
  const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
  let vaultId: string
  let oracleId: string
  let node1ColAddr: string

  async function setup (): Promise<void> {
    // token setup
    const collateralAddress = await tGroup.get(0).container.getNewAddress()
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
    const timestamp = Math.floor(new Date().getTime() / 1000)
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '1@DFI', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '10000@BTC', currency: 'USD' }] })
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '2@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)

    // collateral token
    await tGroup.get(0).rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      priceFeedId: 'DFI/USD'
    })
    await tGroup.get(0).generate(1)

    await tGroup.get(0).rpc.loan.setCollateralToken({
      token: 'BTC',
      factor: new BigNumber(1),
      priceFeedId: 'BTC/USD'
    })
    await tGroup.get(0).generate(1)

    // loan token
    await tGroup.get(0).rpc.loan.setLoanToken({
      symbol: 'TSLA',
      priceFeedId: 'TSLA/USD'
    })
    await tGroup.get(0).generate(1)

    // loan scheme set up
    await tGroup.get(0).rpc.loan.createLoanScheme({
      minColRatio: 200,
      interestRate: new BigNumber(3),
      id: 'scheme'
    })
    await tGroup.get(0).generate(1)

    const vaultAddress = await tGroup.get(0).generateAddress()
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

    await tGroup.get(0).rpc.loan.takeLoan({
      vaultId: vaultId,
      amounts: '1000@TSLA'
    })
    await tGroup.get(0).generate(1)

    // create poolpair
    await tGroup.get(0).rpc.poolpair.createPoolPair({
      tokenA: 'DFI',
      tokenB: 'TSLA',
      commission: 0,
      status: true,
      ownerAddress: collateralAddress
    })
    await tGroup.get(0).generate(1)

    const from = { '*': ['500@DFI', '1000@TSLA'] }
    await tGroup.get(0).rpc.poolpair.addPoolLiquidity(from, collateralAddress)
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    node1ColAddr = await tGroup.get(1).generateAddress()
    await tGroup.get(1).token.dfi({ address: node1ColAddr, amount: 10000 })
    await tGroup.get(1).generate(1)

    await tGroup.get(1).rpc.poolpair.poolSwap({
      from: node1ColAddr,
      tokenFrom: 'DFI',
      amountFrom: 10000,
      to: node1ColAddr,
      tokenTo: 'TSLA'
    })
    await tGroup.get(1).generate(1)
    await tGroup.waitForSync()

    const vaultBefore = await tGroup.get(0).container.call('getvault', [vaultId])
    expect(vaultBefore.isUnderLiquidation).toStrictEqual(false)
    expect(vaultBefore.collateralAmounts.length > 0).toStrictEqual(true)
    expect(vaultBefore.loanAmount.length > 0).toStrictEqual(true)
    expect(vaultBefore.collateralValue !== 0).toStrictEqual(true)
    expect(vaultBefore.loanValue !== 0).toStrictEqual(true)

    const auctionsBefore = await tGroup.get(0).container.call('listauctions')
    expect(auctionsBefore.length).toStrictEqual(0)

    // increase 10x of TSLA price
    await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '20@TSLA', currency: 'USD' }] })
    await tGroup.get(0).generate(1)
    await tGroup.waitForSync()

    // vault is liquidated now
    const vaultAfter = await tGroup.get(0).container.call('getvault', [vaultId])
    expect(vaultAfter.isUnderLiquidation).toStrictEqual(true)
    expect(vaultAfter.collateralAmounts).toStrictEqual(undefined)
    expect(vaultAfter.loanAmount).toStrictEqual(undefined)
    expect(vaultAfter.collateralValue).toStrictEqual(undefined)
    expect(vaultAfter.loanValue).toStrictEqual(undefined)

    const auctionsAfter = await tGroup.get(0).container.call('listauctions')
    expect(auctionsAfter.length > 0).toStrictEqual(true)
    expect(auctionsAfter[0].vaultId).toStrictEqual(vaultId)
    expect(auctionsAfter[0].batchCount).toStrictEqual(2)
    expect(auctionsAfter[0].liquidationPenalty).toStrictEqual(5)
    expect(auctionsAfter[0].batches[0].collaterals).toStrictEqual(['5000.00000000@DFI', '0.50000000@BTC'])
    expect(auctionsAfter[0].batches[0].loan).toStrictEqual('500.00000000@TSLA')
  }

  describe('test first auctionBid', () => {
    beforeAll(async () => {
      await tGroup.start()
      await tGroup.get(0).container.waitForWalletCoinbaseMaturity()
      await setup()
    })

    afterAll(async () => {
      await tGroup.stop()
    })

    it('should not auctionBid on non-existent vault', async () => {
      const promise = tGroup.get(1).rpc.loan.auctionBid({
        vaultId: '0'.repeat(64),
        index: 0,
        from: node1ColAddr,
        amount: '600@DFI'
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`Vault <${'0'.repeat(64)}> not found`)
    })

    it('should not auctionBid as vault is not under liquidation', async () => {
      const addr = await tGroup.get(0).generateAddress()
      const vaultId = await tGroup.get(0).rpc.loan.createVault({
        ownerAddress: addr,
        loanSchemeId: 'scheme'
      })
      await tGroup.get(0).generate(1)
      await tGroup.waitForSync()

      const vault = await tGroup.get(0).container.call('getvault', [vaultId])
      expect(vault.isUnderLiquidation).toStrictEqual(false)

      const promise = tGroup.get(1).rpc.loan.auctionBid({
        vaultId: vaultId,
        index: 0,
        from: node1ColAddr,
        amount: '100@DFI'
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Cannot bid to vault which is not under liquidation')
    })

    it('should not auctionBid as bid token does not match auction one', async () => {
      const promise = tGroup.get(1).rpc.loan.auctionBid({
        vaultId: vaultId,
        index: 0,
        from: node1ColAddr,
        amount: '10000@DFI'
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Bid token does not match auction one')
    })

    it('should not auctionBid as insufficient fund', async () => {
      const node1ColAcc = await tGroup.get(1).rpc.account.getAccount(node1ColAddr)
      const tslaAcc = node1ColAcc.find((amt: string) => amt.split('@')[1] === 'TSLA')
      const tslaAmt = Number(tslaAcc?.split('@')[0])
      expect(Number(tslaAmt)).toBeLessThan(30000)

      const promise = tGroup.get(1).rpc.loan.auctionBid({
        vaultId: vaultId,
        index: 0,
        from: node1ColAddr,
        amount: '30000@TSLA'
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow(`amount ${tslaAmt} is less than 30000.00000000`)
    })

    it('should not auctionBid as first bid should include liquidation penalty of 5%', async () => {
      const promise = tGroup.get(1).rpc.loan.auctionBid({
        vaultId: vaultId,
        index: 0,
        from: node1ColAddr,
        amount: '500@TSLA' // (500 * 5%) + 500 = 525, should not less than 525
      })
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('First bid should include liquidation penalty of 5%')
    })

    it('should auctionBid', async () => {
      const node1ColAccBefore = await tGroup.get(1).rpc.account.getAccount(node1ColAddr)
      const node1BeforeTSLAAcc = node1ColAccBefore.length > 0
        ? node1ColAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
        : undefined
      const node1BeforeTSLAAmt = node1BeforeTSLAAcc !== undefined ? Number(node1BeforeTSLAAcc.split('@')[0]) : 0

      const txid = await tGroup.get(1).rpc.loan.auctionBid({
        vaultId: vaultId,
        index: 0,
        from: node1ColAddr,
        amount: '525@TSLA' // (500 * 5%) + 500 = 525, min first bid is 525
      })
      expect(typeof txid).toStrictEqual('string')
      await tGroup.get(1).container.generate(1)
      await tGroup.waitForSync()

      const auctionsBefore = await tGroup.get(1).container.call('listauctions')

      const node1ColAccAfter = await tGroup.get(1).rpc.account.getAccount(node1ColAddr)
      const node1AfterTSLAAcc = node1ColAccAfter.length > 0
        ? node1ColAccAfter.find((amt: string) => amt.split('@')[1] === 'TSLA')
        : undefined
      const node1AfterTSLAAmt = node1AfterTSLAAcc !== undefined ? Number(node1AfterTSLAAcc.split('@')[0]) : 0
      expect(node1BeforeTSLAAmt - node1AfterTSLAAmt).toStrictEqual(525)

      // end the auction and node1 get the auction bid
      await tGroup.get(0).generate(36)
      const auctionsAfter = await tGroup.get(1).container.call('listauctions')
      expect(auctionsBefore[0].batches.length - auctionsAfter[0].batches.length).toStrictEqual(1)

      const node1ColAccAfterWin = await tGroup.get(1).rpc.account.getAccount(node1ColAddr)
      const wonBids = auctionsBefore[0].batches[0].collaterals
      expect(node1ColAccAfterWin).toStrictEqual(wonBids.concat(node1ColAccAfter))
    })
  })

  describe('test next auctionBid and utxos', () => {
    beforeAll(async () => {
      await tGroup.start()
      await tGroup.get(0).container.waitForWalletCoinbaseMaturity()
      await setup()

      await tGroup.get(1).rpc.loan.auctionBid({
        vaultId: vaultId,
        index: 0,
        from: node1ColAddr,
        amount: '525@TSLA'
      })
      await tGroup.get(1).container.generate(1)
      await tGroup.waitForSync()
    })

    afterAll(async () => {
      await tGroup.stop()
    })

    it('next bid is required 1% higher', async () => {
      const promise = tGroup.get(1).rpc.loan.auctionBid({
        vaultId: vaultId,
        index: 0,
        from: node1ColAddr,
        amount: '530@TSLA' // (525 * 1%) + 525 = 530.25
      })

      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('Bid override should be at least 1% higher than current one')
    })

    it('should auctionBid with utxos', async () => {
      const node1ColAccBefore = await tGroup.get(1).rpc.account.getAccount(node1ColAddr)
      const node1BeforeTSLAAcc = node1ColAccBefore.length > 0
        ? node1ColAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
        : undefined
      const node1BeforeTSLAAmt = node1BeforeTSLAAcc !== undefined ? Number(node1BeforeTSLAAcc.split('@')[0]) : 0

      const utxo = await tGroup.get(0).container.fundAddress(node1ColAddr, 50)

      const txid = await tGroup.get(1).rpc.loan.auctionBid({
        vaultId: vaultId,
        index: 0,
        from: node1ColAddr,
        amount: '550@TSLA' // (525 * 1%) + 525 = 530.25
      }, [utxo])
      expect(typeof txid).toStrictEqual('string')
      await tGroup.get(1).container.generate(1)
      await tGroup.waitForSync()

      const node1ColAccAfter = await tGroup.get(1).rpc.account.getAccount(node1ColAddr)
      const node1AfterTSLAAcc = node1ColAccAfter.length > 0
        ? node1ColAccAfter.find((amt: string) => amt.split('@')[1] === 'TSLA')
        : undefined
      const node1AfterTSLAAmt = node1AfterTSLAAcc !== undefined ? Number(node1AfterTSLAAcc.split('@')[0]) : 0
      expect(node1BeforeTSLAAmt - node1AfterTSLAAmt).toStrictEqual(25) // ?? not sure how it calculated yet

      const rawtx = await tGroup.get(1).container.call('getrawtransaction', [txid, true])
      expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
      expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
    })

    it('should not auctionBid with arbitrary utxos', async () => {
      const utxo = await tGroup.get(0).container.fundAddress(await tGroup.get(0).generateAddress(), 10)

      const promise = tGroup.get(0).rpc.loan.auctionBid({
        vaultId: vaultId,
        index: 0,
        from: node1ColAddr,
        amount: '550@TSLA'
      }, [utxo])
      await expect(promise).rejects.toThrow(RpcApiError)
      await expect(promise).rejects.toThrow('tx must have at least one input from token owner')
    })
  })
})
