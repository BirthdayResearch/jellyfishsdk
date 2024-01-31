import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '../../e2e.module'
import BigNumber from 'bignumber.js'
import { LoanController } from '../loan.controller'
import { TestingGroup } from '@defichain/jellyfish-testing'

const tGroup = TestingGroup.create(3)
const alice = tGroup.get(0)
const bob = tGroup.get(1)
const charlie = tGroup.get(2)

let app: NestFastifyApplication
let controller: LoanController

let vaultId1: string
let vaultId2: string
let vaultId3: string
let vaultId4: string

function now (): number {
  return Math.floor(new Date().getTime() / 1000)
}

beforeAll(async () => {
  await tGroup.start()
  await alice.container.waitForWalletCoinbaseMaturity()

  app = await createTestingApp(alice.container)
  controller = app.get(LoanController)

  const aliceColAddr = await alice.generateAddress()
  await alice.token.dfi({ address: aliceColAddr, amount: 300000 })
  await alice.token.create({ symbol: 'BTC', collateralAddress: aliceColAddr })
  await alice.generate(1)

  await alice.token.mint({ symbol: 'BTC', amount: 100 })
  await alice.generate(1)

  await alice.rpc.loan.createLoanScheme({
    minColRatio: 100,
    interestRate: new BigNumber(1),
    id: 'default'
  })
  await alice.generate(1)

  const addr = await alice.generateAddress()
  const priceFeeds = [
    { token: 'DFI', currency: 'USD' },
    { token: 'BTC', currency: 'USD' },
    { token: 'DUSD', currency: 'USD' },
    { token: 'AAPL', currency: 'USD' },
    { token: 'TSLA', currency: 'USD' },
    { token: 'MSFT', currency: 'USD' },
    { token: 'FB', currency: 'USD' }
  ]
  const oracleId = await alice.rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
  await alice.generate(1)

  await alice.rpc.oracle.setOracleData(oracleId, now(), {
    prices: [
      { tokenAmount: '1@DFI', currency: 'USD' },
      { tokenAmount: '10000@BTC', currency: 'USD' },
      { tokenAmount: '1@DUSD', currency: 'USD' },
      { tokenAmount: '2@AAPL', currency: 'USD' },
      { tokenAmount: '2@TSLA', currency: 'USD' },
      { tokenAmount: '2@MSFT', currency: 'USD' },
      { tokenAmount: '2@FB', currency: 'USD' }
    ]
  })
  await alice.generate(1)

  await alice.rpc.loan.setCollateralToken({
    token: 'DFI',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'DFI/USD'
  })

  await alice.rpc.loan.setCollateralToken({
    token: 'BTC',
    factor: new BigNumber(1),
    fixedIntervalPriceId: 'BTC/USD'
  })

  await alice.rpc.loan.setLoanToken({
    symbol: 'DUSD',
    fixedIntervalPriceId: 'DUSD/USD'
  })

  await alice.rpc.loan.setLoanToken({
    symbol: 'AAPL',
    fixedIntervalPriceId: 'AAPL/USD'
  })

  await alice.rpc.loan.setLoanToken({
    symbol: 'TSLA',
    fixedIntervalPriceId: 'TSLA/USD'
  })

  await alice.rpc.loan.setLoanToken({
    symbol: 'MSFT',
    fixedIntervalPriceId: 'MSFT/USD'
  })

  await alice.rpc.loan.setLoanToken({
    symbol: 'FB',
    fixedIntervalPriceId: 'FB/USD'
  })
  await alice.generate(1)

  const mVaultId = await alice.rpc.loan.createVault({
    ownerAddress: await alice.generateAddress(),
    loanSchemeId: 'default'
  })
  await alice.generate(1)

  await alice.rpc.loan.depositToVault({
    vaultId: mVaultId, from: aliceColAddr, amount: '100000@DFI'
  })
  await alice.generate(1)

  await alice.rpc.loan.depositToVault({
    vaultId: mVaultId, from: aliceColAddr, amount: '10@BTC'
  })
  await alice.generate(1)

  await alice.rpc.loan.takeLoan({
    vaultId: mVaultId,
    amounts: ['10000@AAPL', '10000@TSLA', '10000@MSFT', '10000@FB'],
    to: aliceColAddr
  })
  await alice.generate(1)

  // Vault 1
  vaultId1 = await alice.rpc.loan.createVault({
    ownerAddress: await alice.generateAddress(),
    loanSchemeId: 'default'
  })
  await alice.generate(1)

  await alice.rpc.loan.depositToVault({
    vaultId: vaultId1, from: aliceColAddr, amount: '1000@DFI'
  })
  await alice.generate(1)

  await alice.rpc.loan.depositToVault({
    vaultId: vaultId1, from: aliceColAddr, amount: '0.05@BTC'
  })
  await alice.generate(1)

  await alice.rpc.loan.takeLoan({
    vaultId: vaultId1,
    amounts: '750@AAPL',
    to: aliceColAddr
  })
  await alice.generate(1)

  // Vault 2
  vaultId2 = await alice.rpc.loan.createVault({
    ownerAddress: await alice.generateAddress(),
    loanSchemeId: 'default'
  })
  await alice.generate(1)

  await alice.rpc.loan.depositToVault({
    vaultId: vaultId2, from: aliceColAddr, amount: '2000@DFI'
  })
  await alice.generate(1)

  await alice.rpc.loan.depositToVault({
    vaultId: vaultId2, from: aliceColAddr, amount: '0.1@BTC'
  })
  await alice.generate(1)

  await alice.rpc.loan.takeLoan({
    vaultId: vaultId2,
    amounts: '1500@TSLA',
    to: aliceColAddr
  })
  await alice.generate(1)

  // Vault 3
  vaultId3 = await alice.rpc.loan.createVault({
    ownerAddress: await alice.generateAddress(),
    loanSchemeId: 'default'
  })
  await alice.generate(1)

  await alice.rpc.loan.depositToVault({
    vaultId: vaultId3, from: aliceColAddr, amount: '3000@DFI'
  })
  await alice.generate(1)

  await alice.rpc.loan.depositToVault({
    vaultId: vaultId3, from: aliceColAddr, amount: '0.15@BTC'
  })
  await alice.generate(1)

  await alice.rpc.loan.takeLoan({
    vaultId: vaultId3,
    amounts: '2250@MSFT',
    to: aliceColAddr
  })
  await alice.generate(1)

  // Vault 4
  vaultId4 = await alice.rpc.loan.createVault({
    ownerAddress: await alice.generateAddress(),
    loanSchemeId: 'default'
  })
  await alice.generate(1)

  await alice.rpc.loan.depositToVault({
    vaultId: vaultId4, from: aliceColAddr, amount: '4000@DFI'
  })
  await alice.generate(1)

  await alice.rpc.loan.depositToVault({
    vaultId: vaultId4, from: aliceColAddr, amount: '0.2@BTC'
  })
  await alice.generate(1)

  await alice.rpc.loan.takeLoan({
    vaultId: vaultId4,
    amounts: '3000@FB',
    to: aliceColAddr
  })
  await alice.generate(1)

  const auctions = await alice.rpc.loan.listAuctions()
  expect(auctions).toStrictEqual([])

  const vaults = await alice.rpc.loan.listVaults()
  expect(vaults.every(v => v.state === 'active'))

  // Going to liquidate the vaults by price increase of the loan tokens
  await alice.rpc.oracle.setOracleData(oracleId, now(), {
    prices: [
      { tokenAmount: '2.2@AAPL', currency: 'USD' },
      { tokenAmount: '2.2@TSLA', currency: 'USD' },
      { tokenAmount: '2.2@MSFT', currency: 'USD' },
      { tokenAmount: '2.2@FB', currency: 'USD' }
    ]
  })
  await alice.container.waitForActivePrice('AAPL/USD', '2.2')
  await alice.container.waitForActivePrice('TSLA/USD', '2.2')
  await alice.container.waitForActivePrice('MSFT/USD', '2.2')
  await alice.container.waitForActivePrice('FB/USD', '2.2')

  {
    const vaults = await alice.rpc.loan.listVaults()
    expect(vaults.every(v => v.state === 'inLiquidation'))
  }

  const bobAddr = await bob.generateAddress()
  const charlieAddr = await charlie.generateAddress()

  await alice.rpc.wallet.sendToAddress(charlieAddr, 100)

  await alice.rpc.account.accountToAccount(aliceColAddr, {
    [bobAddr]: '4000@AAPL',
    [charlieAddr]: '4000@AAPL'
  })
  await alice.generate(1)

  await alice.rpc.account.accountToAccount(aliceColAddr, {
    [bobAddr]: '4000@TSLA',
    [charlieAddr]: '4000@TSLA'
  })
  await alice.generate(1)

  await alice.rpc.account.accountToAccount(aliceColAddr, {
    [bobAddr]: '4000@MSFT',
    [charlieAddr]: '4000@MSFT'
  })
  await alice.generate(1)
  await tGroup.waitForSync()

  // bid #1
  await bob.rpc.loan.placeAuctionBid({
    vaultId: vaultId1,
    index: 0,
    from: bobAddr,
    amount: '800@AAPL'
  })
  await bob.generate(1)
  await tGroup.waitForSync()

  await charlie.rpc.loan.placeAuctionBid({
    vaultId: vaultId1,
    index: 0,
    from: charlieAddr,
    amount: '900@AAPL'
  })
  await charlie.generate(1)
  await tGroup.waitForSync()

  // bid #2
  await bob.rpc.loan.placeAuctionBid({
    vaultId: vaultId2,
    index: 0,
    from: bobAddr,
    amount: '2000@TSLA'
  })
  await bob.generate(1)
  await tGroup.waitForSync()

  await alice.rpc.loan.placeAuctionBid({
    vaultId: vaultId2,
    index: 0,
    from: aliceColAddr,
    amount: '2100@TSLA'
  })
  await alice.generate(1)
  await tGroup.waitForSync()

  // bid #3
  await bob.rpc.loan.placeAuctionBid({
    vaultId: vaultId3,
    index: 0,
    from: bobAddr,
    amount: '3000@MSFT'
  })
  await bob.generate(1)
  await tGroup.waitForSync()

  await alice.rpc.loan.placeAuctionBid({
    vaultId: vaultId3,
    index: 0,
    from: aliceColAddr,
    amount: '3100@MSFT'
  })
  await alice.generate(1)
  await tGroup.waitForSync()

  await charlie.rpc.loan.placeAuctionBid({
    vaultId: vaultId3,
    index: 0,
    from: charlieAddr,
    amount: '3200@MSFT'
  })
  await charlie.generate(1)
  await tGroup.waitForSync()

  const height = await alice.container.call('getblockcount')
  await waitForIndexedHeight(app, height - 1)
})

afterAll(async () => {
  await stopTestingApp(tGroup, app)
})

describe('list', () => {
  it('should listAuctions', async () => {
    const result = await controller.listAuction({ size: 100 })
    expect(result.data.length).toStrictEqual(4)

    for (let i = 0; i < result.data.length; i += 1) {
      const auction = result.data[i]
      expect(auction).toStrictEqual({
        batchCount: expect.any(Number),
        batches: expect.any(Object),
        loanScheme: expect.any(Object),
        ownerAddress: expect.any(String),
        state: expect.any(String),
        liquidationHeight: expect.any(Number),
        liquidationPenalty: expect.any(Number),
        vaultId: expect.any(String)
      })

      for (let j = 0; j < auction.batches.length; j += 1) {
        const batch = auction.batches[j]
        expect(typeof batch.index).toBe('number')
        expect(typeof batch.collaterals).toBe('object')
        expect(typeof batch.loan).toBe('object')
        if (auction.vaultId === vaultId4) {
          expect(batch.froms.length).toStrictEqual(0)
        } else {
          expect(batch.froms.length).toBeGreaterThan(0)
          expect(batch.froms).toStrictEqual(
            expect.arrayContaining([expect.any(String)])
          )
        }
        expect(typeof batch.highestBid === 'object' || batch.highestBid === undefined).toBe(true)
      }
    }
  })

  it('should listAuctions with pagination', async () => {
    const first = await controller.listAuction({ size: 2 })
    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual(`${first.data[1].vaultId}${first.data[1].liquidationHeight}`)

    const next = await controller.listAuction({
      size: 2,
      next: first.page?.next
    })
    expect(next.data.length).toStrictEqual(2)
    expect(next.page?.next).toStrictEqual(`${next.data[1].vaultId}${next.data[1].liquidationHeight}`)

    const last = await controller.listAuction({
      size: 2,
      next: next.page?.next
    })
    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toBeUndefined()
  })

  it('should listAuctions with an empty object if out of range', async () => {
    const result = await controller.listAuction({ size: 100, next: '51f6233c4403f6ce113bb4e90f83b176587f401081605b8a8bb723ff3b0ab5b6300' })

    expect(result.data.length).toStrictEqual(0)
    expect(result.page).toBeUndefined()
  })
})
