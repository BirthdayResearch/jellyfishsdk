import { LoanMasterNodeRegTestContainer } from './loan_container'
import { GenesisKeys } from '@defichain/testcontainers'
import BigNumber from 'bignumber.js'
import { TestingGroup } from '@defichain/jellyfish-testing'
import { RpcApiError } from '@defichain/jellyfish-api-core'

const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
const alice = tGroup.get(0)
const bob = tGroup.get(1)
let bobVaultId: string
let bobVaultId1: string
let bobVaultAddr: string
let bobVaultAddr1: string
let bobLiqVaultId: string
let bobloanAddr: string
let tslaLoanHeight: number
let aliceColAddr: string

async function setup (): Promise<void> {
  // token setup
  aliceColAddr = await alice.container.getNewAddress()
  await alice.token.dfi({ address: aliceColAddr, amount: 100000 })
  await alice.generate(1)
  await alice.token.create({ symbol: 'BTC', collateralAddress: aliceColAddr })
  await alice.generate(1)
  await alice.token.mint({ symbol: 'BTC', amount: 30000 })
  await alice.generate(1)

  // oracle setup
  const addr = await alice.generateAddress()
  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'AMZN', currency: 'USD' },
    { token: 'UBER', currency: 'USD' }
  ]
  const oracleId = await alice.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
  await alice.generate(1)

  const timestamp = Math.floor(new Date().getTime() / 1000)
  await alice.rpc.oracle.setOracleData(
    oracleId,
    timestamp,
    {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '10000@BTC', currency: 'USD' },
        { tokenAmount: '2@TSLA', currency: 'USD' },
        { tokenAmount: '4@AMZN', currency: 'USD' },
        { tokenAmount: '4@UBER', currency: 'USD' }
      ]
    }
  )
  await alice.generate(1)

  // setCollateralToken DFI
  await alice.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })
  await alice.generate(1)

  // setCollateralToken BTC
  await alice.rpc.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(0.5),
    fixedIntervalPriceId: 'BTC/USD'
  })
  await alice.generate(1)

  // setLoanToken TSLA
  await alice.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })
  await alice.generate(1)

  // mint loan token TSLA
  await alice.token.mint({ symbol: 'TSLA', amount: 21000 })
  await alice.generate(1)

  await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['21000@TSLA'] })
  await alice.generate(1)

  // setLoanToken AMZN
  await alice.rpc.loan.setLoanToken({
    symbol: 'AMZN',
    fixedIntervalPriceId: 'AMZN/USD'
  })
  await alice.generate(1)

  // mint loan token AMZN
  await alice.token.mint({ symbol: 'AMZN', amount: 40000 })
  await alice.generate(1)

  await alice.rpc.account.sendTokensToAddress({}, { [aliceColAddr]: ['40000@AMZN'] })
  await alice.generate(1)

  // setLoanToken UBER
  await alice.rpc.loan.setLoanToken({
    symbol: 'UBER',
    fixedIntervalPriceId: 'UBER/USD'
  })
  await alice.generate(1)

  // mint loan token UBER
  await alice.token.mint({ symbol: 'UBER', amount: 40000 })
  await alice.generate(1)

  // createLoanScheme 'scheme'
  await alice.rpc.loan.createLoanScheme({
    minColRatio: 500,
    interestRate: new BigNumber(3),
    id: 'scheme'
  })
  await alice.generate(1)
  await tGroup.waitForSync()

  const bobColAddr = await bob.generateAddress()
  await bob.token.dfi({ address: bobColAddr, amount: 30000 })
  await bob.generate(1)
  await tGroup.waitForSync()

  await alice.rpc.account.accountToAccount(aliceColAddr, { [bobColAddr]: '1@BTC' })
  await alice.generate(1)
  await tGroup.waitForSync()

  // createVault
  bobVaultAddr = await bob.generateAddress()
  bobVaultId = await bob.rpc.loan.createVault({
    ownerAddress: bobVaultAddr,
    loanSchemeId: 'scheme'
  })
  await bob.generate(1)

  // depositToVault DFI 1000
  await bob.rpc.loan.depositToVault({
    vaultId: bobVaultId, from: bobColAddr, amount: '10000@DFI'
  })
  await bob.generate(1)

  // depositToVault BTC 1
  await bob.rpc.loan.depositToVault({
    vaultId: bobVaultId, from: bobColAddr, amount: '1@BTC'
  })
  await bob.generate(1)

  // createVault #2
  bobVaultAddr1 = await bob.generateAddress()
  bobVaultId1 = await bob.rpc.loan.createVault({
    ownerAddress: bobVaultAddr1,
    loanSchemeId: 'scheme'
  })
  await bob.generate(1)

  await bob.rpc.loan.depositToVault({
    vaultId: bobVaultId1, from: bobColAddr, amount: '10000@DFI'
  })
  await bob.generate(1)

  // createVault for liquidation
  const bobLiqVaultAddr = await bob.generateAddress()
  bobLiqVaultId = await bob.rpc.loan.createVault({
    ownerAddress: bobLiqVaultAddr,
    loanSchemeId: 'scheme'
  })
  await bob.generate(1)

  await bob.rpc.loan.depositToVault({
    vaultId: bobLiqVaultId, from: bobColAddr, amount: '10000@DFI'
  })
  await bob.generate(1)

  await bob.rpc.loan.takeLoan({
    vaultId: bobLiqVaultId,
    amounts: '100@UBER'
  })
  await bob.generate(1)
  await tGroup.waitForSync()

  // liquidated: true
  await alice.rpc.oracle.setOracleData(oracleId, timestamp, { prices: [{ tokenAmount: '100000@UBER', currency: 'USD' }] })
  await alice.generate(1)
  await tGroup.waitForSync()

  // set up fixture for loanPayback
  const aliceDUSDAddr = await alice.container.getNewAddress()
  await alice.token.dfi({ address: aliceDUSDAddr, amount: 600000 })
  await alice.generate(1)
  await alice.token.create({ symbol: 'dUSD', collateralAddress: aliceDUSDAddr })
  await alice.generate(1)
  await alice.token.mint({ symbol: 'dUSD', amount: 600000 })
  await alice.generate(1)

  // create TSLA-dUSD
  await alice.poolpair.create({
    tokenA: 'TSLA',
    tokenB: 'dUSD',
    ownerAddress: aliceColAddr
  })
  await alice.generate(1)

  // add TSLA-dUSD
  await alice.poolpair.add({
    a: { symbol: 'TSLA', amount: 20000 },
    b: { symbol: 'dUSD', amount: 10000 }
  })
  await alice.generate(1)

  // create AMZN-dUSD
  await alice.poolpair.create({
    tokenA: 'AMZN',
    tokenB: 'dUSD'
  })
  await alice.generate(1)

  // add AMZN-dUSD
  await alice.poolpair.add({
    a: { symbol: 'AMZN', amount: 40000 },
    b: { symbol: 'dUSD', amount: 10000 }
  })
  await alice.generate(1)

  // create dUSD-DFI
  await alice.poolpair.create({
    tokenA: 'dUSD',
    tokenB: 'DFI'
  })
  await alice.generate(1)

  // add dUSD-DFI
  await alice.poolpair.add({
    a: { symbol: 'dUSD', amount: 25000 },
    b: { symbol: 'DFI', amount: 10000 }
  })
  await alice.generate(1)
  await tGroup.waitForSync()

  bobloanAddr = await bob.generateAddress()
  await bob.rpc.loan.takeLoan({
    vaultId: bobVaultId,
    to: bobloanAddr,
    amounts: '40@TSLA'
  })
  tslaLoanHeight = await bob.container.getBlockCount()
  await bob.generate(1)
  await tGroup.waitForSync()
}

beforeEach(async () => {
  await tGroup.start()
  await setup()
})

afterEach(async () => {
  await tGroup.stop()
})

describe('loanPayback', () => {
  it('should loanPayback', async () => {
    const burnInfoBefore = await bob.container.call('getburninfo')
    expect(burnInfoBefore.paybackburn).toStrictEqual(undefined)

    const loanAccBefore = await bob.container.call('getaccount', [bobloanAddr])
    expect(loanAccBefore).toStrictEqual(['40.00000000@TSLA'])

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.collateralValue).toStrictEqual(15000) // DFI(10000) + BTC(1 * 10000 * 0.5)
    expect(vaultBefore.loanAmount).toStrictEqual(['40.00004566@TSLA']) // 40 + totalInterest
    expect(vaultBefore.loanValue).toStrictEqual(80.00009132) // loanAmount * 2 (::1 TSLA = 2 USD)
    expect(vaultBefore.currentRatio).toStrictEqual(18750) // 15000 / 80.0000456 * 100

    const txid = await bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '13@TSLA',
      from: bobloanAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const loanAccAfter = await bob.container.call('getaccount', [bobloanAddr])
    expect(loanAccAfter).toStrictEqual(['27.00000000@TSLA']) // 40 - 13 = 27

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmount).toStrictEqual(['27.00007648@TSLA']) // 40.00004566 - 13 + totalInterest
    expect(vaultAfter.loanValue).toStrictEqual(54.00015296) // 27.00007648 * 2 (::1 TSLA = 2 DFI)
    expect(vaultAfter.currentRatio).toStrictEqual(27778) // 15000 / 54.00015296 * 100

    const burnInfoAfter = await bob.container.call('getburninfo')
    expect(burnInfoAfter.paybackburn).toStrictEqual(0.00000914)
  })
})

describe('loanPayback by anyone', () => {
  it('should loanPayback by anyone', async () => {
    const loanAccBefore = await bob.container.call('getaccount', [aliceColAddr])
    expect(loanAccBefore).toStrictEqual(['100000.00000000@DFI', '29999.00000000@BTC', '1000.00000000@TSLA'])

    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.collateralValue).toStrictEqual(15000) // DFI(10000) + BTC(1 * 10000 * 0.5)
    expect(vaultBefore.loanAmount).toStrictEqual(['40.00004566@TSLA']) // 40 + totalInterest
    expect(vaultBefore.loanValue).toStrictEqual(80.00009132) // loanAmount * 2 (::1 TSLA = 2 USD)
    expect(vaultBefore.currentRatio).toStrictEqual(18750) // 15000 / 80.0000456 * 100

    const txid = await alice.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '8@TSLA',
      from: aliceColAddr
    })
    expect(typeof txid).toStrictEqual('string')
    await alice.generate(1)

    const loanAccAfter = await bob.container.call('getaccount', [aliceColAddr])
    expect(loanAccAfter).toStrictEqual(['100000.00000000@DFI', '29999.00000000@BTC', '992.00000000@TSLA'])
    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmount).toStrictEqual(['32.00008218@TSLA']) // 40.00004566 - 8 + totalInterest
    expect(vaultAfter.loanValue).toStrictEqual(64.00016436) // 32.00008218 * 2 (::1 TSLA = 2 DFI)
    expect(vaultAfter.currentRatio).toStrictEqual(23437) // 15000 / 64.00016436 * 100
  })
})

describe('loanPayback multiple amounts', () => {
  it('should loanPayback more than one amount', async () => {
    const burnInfoBefore = await bob.container.call('getburninfo')
    expect(burnInfoBefore.paybackburn).toStrictEqual(undefined)

    await bob.rpc.loan.takeLoan({
      vaultId: bobVaultId,
      amounts: ['15@AMZN'],
      to: bobloanAddr
    })
    const amznLoanHeight = await bob.container.getBlockCount()
    await bob.generate(1)

    const loanTokenAccBefore = await bob.container.call('getaccount', [bobloanAddr])
    expect(loanTokenAccBefore).toStrictEqual(['40.00000000@TSLA', '15.00000000@AMZN'])

    // first loanPayback
    {
      const blockHeight = await bob.container.getBlockCount()

      const tslaTokenAmt = loanTokenAccBefore.find((amt: string) => amt.split('@')[1] === 'TSLA')
      const tslaAmt = Number(tslaTokenAmt.split('@')[0])
      const amznTokenAmt = loanTokenAccBefore.find((amt: string) => amt.split('@')[1] === 'AMZN')
      const amznAmt = Number(amznTokenAmt.split('@')[0])

      const netInterest = (3 + 0) / 100 // (scheme.rate + loanToken.interest) / 100
      const blocksPerDay = (60 * 60 * 24) / (10 * 60) // 144 in regtest

      // tsla interest
      const tslaInterestPerBlock = (netInterest * tslaAmt) / (365 * blocksPerDay) //  netInterest * loanAmt / 365 * blocksPerDay
      const tslaTotalInterest = ((blockHeight - tslaLoanHeight + 1) * tslaInterestPerBlock)

      // amzn interest
      const amznInterestPerBlock = (netInterest * amznAmt) / (365 * blocksPerDay) //  netInterest * loanAmt / 365 * blocksPerDay
      const amznTotalInterest = ((blockHeight - amznLoanHeight + 1) * amznInterestPerBlock)

      const interests = await bob.rpc.loan.getInterest('scheme')

      const tslaInterest = interests.find(i => i.token === 'TSLA')
      const tslaTotalInt = tslaInterest?.totalInterest.toFixed(8)
      expect(tslaTotalInt).toStrictEqual(tslaTotalInterest.toFixed(8)) // 0.00006849
      const tslaInterestPerBlk = tslaInterest?.interestPerBlock.toFixed(8)
      expect(tslaInterestPerBlk).toStrictEqual(tslaInterestPerBlock.toFixed(8)) // 0.00002283

      const amzInterest = interests.find(i => i.token === 'AMZN')
      const amzTotalInt = amzInterest?.totalInterest.toFixed(8)
      expect(amzTotalInt).toStrictEqual(amznTotalInterest.toFixed(8)) // 0.00001712
      const amzInterestPerBlk = amzInterest?.interestPerBlock.toFixed(8)
      expect(amzInterestPerBlk).toStrictEqual(amznInterestPerBlock.toFixed(8)) // 0.00000856

      const vaultBefore = await bob.container.call('getvault', [bobVaultId])
      expect(vaultBefore.loanAmount).toStrictEqual(['40.00006849@TSLA', '15.00001712@AMZN']) // eg: tslaTakeLoanAmt + tslaTotalInterest
      expect(vaultBefore.loanValue).toStrictEqual(140.00020546) // (40.00006849 * 2) + (15.00001712 * 4)
      expect(vaultBefore.currentRatio).toStrictEqual(10714) // 15000 / 140.00020546 * 100

      const txid = await bob.rpc.loan.loanPayback({
        vaultId: bobVaultId,
        amounts: ['13@TSLA', '6@AMZN'],
        from: bobloanAddr
      })
      expect(typeof txid).toStrictEqual('string')
      await bob.generate(1)

      const vaultAfter = await bob.container.call('getvault', [bobVaultId])
      expect(vaultAfter.loanAmount).toStrictEqual(['27.00009931@TSLA', '9.00002738@AMZN'])
      expect(vaultAfter.loanValue).toStrictEqual(90.00030814)
      expect(vaultAfter.currentRatio).toStrictEqual(16667)

      const loanTokenAccAfter = await bob.container.call('getaccount', [bobloanAddr])
      expect(loanTokenAccAfter).toStrictEqual(['27.00000000@TSLA', '9.00000000@AMZN'])

      const burnInfoAfter = await bob.container.call('getburninfo')
      expect(burnInfoAfter.paybackburn).toStrictEqual(0.00001542)
    }

    // second loanPayback
    {
      const txid2 = await bob.rpc.loan.loanPayback({
        vaultId: bobVaultId,
        amounts: ['13@TSLA', '6@AMZN'],
        from: bobloanAddr
      })
      expect(typeof txid2).toStrictEqual('string')
      await bob.generate(1)

      const interests = await bob.rpc.loan.getInterest('scheme')

      const tslaInterest = interests.find(i => i.token === 'TSLA')
      const tslaTotalInterest = tslaInterest?.totalInterest.toFixed(8)
      expect(tslaTotalInterest).toStrictEqual('0.00001598')
      const tslaInterestPerBlk = tslaInterest?.interestPerBlock.toFixed(8)
      expect(tslaInterestPerBlk).toStrictEqual('0.00000799')

      const amzInterest = interests.find(i => i.token === 'AMZN')
      const amzTotalInterest = amzInterest?.totalInterest.toFixed(8)
      expect(amzTotalInterest).toStrictEqual('0.00000342')
      const amzInterestPerBlk = amzInterest?.interestPerBlock.toFixed(8)
      expect(amzInterestPerBlk).toStrictEqual('0.00000171')

      const vaultAfter = await bob.container.call('getvault', [bobVaultId])
      expect(vaultAfter.loanAmount).toStrictEqual(['14.00011529@TSLA', '3.00003080@AMZN'])
      expect(vaultAfter.loanValue).toStrictEqual(40.00035378)
      expect(vaultAfter.currentRatio).toStrictEqual(37500)

      const loanTokenAccAfter = await bob.container.call('getaccount', [bobloanAddr])
      expect(loanTokenAccAfter).toStrictEqual(['14.00000000@TSLA', '3.00000000@AMZN']) // (27 - 13), (9 - 6)

      const burnInfoAfter = await bob.container.call('getburninfo')
      expect(burnInfoAfter.paybackburn).toStrictEqual(0.00002262)
    }
  })
})

describe('loanPayback with utxos', () => {
  it('should loanPayback with utxos', async () => {
    const vaultBefore = await bob.container.call('getvault', [bobVaultId])
    expect(vaultBefore.loanAmount).toStrictEqual(['40.00004566@TSLA']) // 40 + totalInterest
    expect(vaultBefore.loanValue).toStrictEqual(80.00009132) // loanAmount * 2 (::1 TSLA = 2 USD)
    expect(vaultBefore.currentRatio).toStrictEqual(18750) // 15000 / 80.0000456 * 100

    const utxo = await bob.container.fundAddress(bobloanAddr, 250)

    const txid = await bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '13@TSLA',
      from: bobloanAddr
    }, [utxo])
    expect(typeof txid).toStrictEqual('string')
    await bob.generate(1)

    const vaultAfter = await bob.container.call('getvault', [bobVaultId])
    expect(vaultAfter.loanAmount).toStrictEqual(['27.00009931@TSLA']) // 40.00004566 - 13 + totalInterest
    expect(vaultAfter.loanValue).toStrictEqual(54.00019862) // 27.00009931 * 2 (::1 TSLA = 2 DFI)
    expect(vaultAfter.currentRatio).toStrictEqual(27778) // 15000 / 54.00019862 * 100

    const rawtx = await bob.container.call('getrawtransaction', [txid, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
    expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
  })
})

describe('loanPayback failed', () => {
  it('should not loanPayback with arbitrary utxo', async () => {
    const utxo = await bob.container.fundAddress(bobVaultAddr, 250)
    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '13@TSLA',
      from: bobloanAddr
    }, [utxo])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('tx must have at least one input from token owner')
  })

  it('should not loanPayback on nonexistent vault', async () => {
    const promise = bob.rpc.loan.loanPayback({
      vaultId: '0'.repeat(64),
      amounts: '30@TSLA',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Cannot find existing vault with id ${'0'.repeat(64)}`)
  })

  it('should not loanPayback on nonexistent loan token', async () => {
    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '1@BTC',
      from: bobloanAddr

    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Loan token with id (1) does not exist!')
  })

  it('should not loanPayback on invalid token', async () => {
    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '1@INVALID',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Invalid Defi token: INVALID')
  })

  it('should not loanPayback on incorrect auth', async () => {
    const promise = alice.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '30@TSLA',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Address (${bobloanAddr}) is not owned by the wallet`)
  })

  it('should not loanPayback as no loan on vault', async () => {
    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobVaultId1,
      amounts: '30@TSLA',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`There are no loans on this vault (${bobVaultId1})`)
  })

  it('should not loanPayback while exceeds loan value', async () => {
    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '41@TSLA',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    // loanValue 80.0000456 - loanPayback 80 =  0.00004560
    await expect(promise).rejects.toThrow('amount 0.00000000 is less than 0.00004566')
  })

  it('should not loanPayback as no token in this vault', async () => {
    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobVaultId,
      amounts: '30@AMZN',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('There is no loan on token (AMZN) in this vault!')
  })

  it('should not loanPayback on empty vault', async () => {
    const emptyVaultId = await bob.rpc.loan.createVault({
      ownerAddress: bobVaultAddr,
      loanSchemeId: 'scheme'
    })
    await bob.generate(1)

    const promise = bob.rpc.loan.loanPayback({
      vaultId: emptyVaultId,
      amounts: '30@AMZN',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow(`Vault with id ${emptyVaultId} has no collaterals`)
  })

  it('should not loanPayback on liquidation vault', async () => {
    await tGroup.get(0).generate(12)

    const liqVault = await bob.container.call('getvault', [bobLiqVaultId])
    expect(liqVault.isUnderLiquidation).toStrictEqual(true)

    const promise = bob.rpc.loan.loanPayback({
      vaultId: bobLiqVaultId,
      amounts: '30@UBER',
      from: bobloanAddr
    })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot payback loan on vault under liquidation')
  })
})
