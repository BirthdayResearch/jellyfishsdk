// import { NestFastifyApplication } from '@nestjs/platform-fastify'
// import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '../../e2e.module'
// import BigNumber from 'bignumber.js'
// import { LoanController } from '../loan.controller'
// import { TestingGroup, Testing } from '@defichain/jellyfish-testing'
// import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
// import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
// import { VaultLiquidation } from '@defichain/jellyfish-api-core/dist/category/loan'
// import { HexEncoder } from '../../module.model/_hex.encoder'

// let app: NestFastifyApplication
// let controller: LoanController

// const tGroup = TestingGroup.create(2, i => new MasterNodeRegTestContainer(RegTestFoundationKeys[i]))
// const alice = tGroup.get(0)
// const bob = tGroup.get(1)
// let colAddr: string
// let bobColAddr: string
// let vaultId: string
// let batch: number
// let batch1: number

// beforeAll(async () => {
//   await tGroup.start()
//   await alice.container.waitForWalletCoinbaseMaturity()

//   app = await createTestingApp(alice.container)
//   controller = app.get(LoanController)

//   colAddr = await alice.generateAddress()
//   bobColAddr = await bob.generateAddress()

//   await dfi(alice, colAddr, 300000)
//   await createToken(alice, 'BTC', colAddr)
//   await mintTokens(alice, 'BTC', 50)
//   await alice.rpc.account.sendTokensToAddress({}, { [colAddr]: ['25@BTC'] })
//   await alice.container.call('createloanscheme', [100, 1, 'default'])
//   await alice.generate(1)

//   const priceFeeds = [
//     { token: 'DFI', currency: 'USD' },
//     { token: 'BTC', currency: 'USD' },
//     { token: 'AAPL', currency: 'USD' },
//     { token: 'TSLA', currency: 'USD' },
//     { token: 'MSFT', currency: 'USD' }
//   ]
//   const oracleId = await alice.rpc.oracle.appointOracle(await alice.generateAddress(), priceFeeds, { weightage: 1 })
//   await alice.generate(1)
//   await alice.rpc.oracle.setOracleData(oracleId, now(), {
//     prices: [
//       { tokenAmount: '1@DFI', currency: 'USD' },
//       { tokenAmount: '10000@BTC', currency: 'USD' },
//       { tokenAmount: '2@AAPL', currency: 'USD' },
//       { tokenAmount: '2@TSLA', currency: 'USD' },
//       { tokenAmount: '2@MSFT', currency: 'USD' }
//     ]
//   })
//   await alice.generate(1)

//   await setCollateralToken(alice, 'DFI')
//   await setCollateralToken(alice, 'BTC')

//   await setLoanToken(alice, 'AAPL')
//   await setLoanToken(alice, 'TSLA')
//   await setLoanToken(alice, 'MSFT')

//   const mVaultId = await createVault(alice, 'default')
//   await depositToVault(alice, mVaultId, colAddr, '200001@DFI')
//   await depositToVault(alice, mVaultId, colAddr, '20@BTC')
//   await takeLoan(alice, mVaultId, ['60000@TSLA', '60000@AAPL', '60000@MSFT'])

//   await alice.rpc.account.sendTokensToAddress({}, { [colAddr]: ['30000@TSLA', '30000@AAPL', '30000@MSFT'] })
//   await alice.rpc.account.sendTokensToAddress({}, { [bobColAddr]: ['30000@TSLA', '30000@AAPL', '30000@MSFT'] })
//   await alice.generate(1)
//   await tGroup.waitForSync()

//   vaultId = await createVault(alice, 'default')
//   await depositToVault(alice, vaultId, colAddr, '10001@DFI')
//   await depositToVault(alice, vaultId, colAddr, '1@BTC')
//   await takeLoan(alice, vaultId, '7500@AAPL')
//   await takeLoan(alice, vaultId, '2500@TSLA')

//   {
//     const data = await alice.container.call('listauctions', [])
//     expect(data).toStrictEqual([])

//     const list = await alice.container.call('listauctions')
//     expect(list.every((each: any) => each.state === 'active'))
//   }

//   // liquidated
//   await alice.rpc.oracle.setOracleData(oracleId, now(), {
//     prices: [
//       { tokenAmount: '2.2@AAPL', currency: 'USD' },
//       { tokenAmount: '2.2@TSLA', currency: 'USD' }
//     ]
//   })
//   await alice.container.generate(13)

//   {
//     const list = await alice.container.call('listauctions')
//     expect(list.every((each: any) => each.state === 'inLiquidation'))
//   }

//   let vault = await alice.rpc.loan.getVault(vaultId) as VaultLiquidation
//   batch = vault.liquidationHeight

//   // BID WAR!!
//   // vaultId[0]
//   await placeAuctionBid(alice, vaultId, 0, colAddr, '5300@AAPL')
//   await tGroup.waitForSync()
//   await placeAuctionBid(bob, vaultId, 0, bobColAddr, '5355@AAPL')
//   await tGroup.waitForSync()
//   await placeAuctionBid(alice, vaultId, 0, colAddr, '5408.55@AAPL')
//   await tGroup.waitForSync()

//   // vaultId[1]
//   await placeAuctionBid(alice, vaultId, 1, colAddr, '2700.00012@AAPL')
//   await tGroup.waitForSync()
//   await placeAuctionBid(bob, vaultId, 1, bobColAddr, '2730@AAPL')
//   await tGroup.waitForSync()
//   await placeAuctionBid(alice, vaultId, 1, colAddr, '2760.0666069@AAPL')
//   await tGroup.waitForSync()

//   // vaultId[2]
//   await placeAuctionBid(alice, vaultId, 2, colAddr, '2625.01499422@TSLA')
//   await tGroup.waitForSync()

//   // do another batch
//   await alice.generate(40)
//   await tGroup.waitForSync()

//   await depositToVault(alice, vaultId, colAddr, '10001@DFI')
//   await depositToVault(alice, vaultId, colAddr, '1@BTC')
//   await takeLoan(alice, vaultId, '10000@MSFT')

//   // liquidated #2
//   await alice.rpc.oracle.setOracleData(oracleId, now(), {
//     prices: [
//       { tokenAmount: '2.2@MSFT', currency: 'USD' }
//     ]
//   })
//   await alice.container.generate(13)

//   vault = await alice.rpc.loan.getVault(vaultId) as VaultLiquidation
//   batch1 = vault.liquidationHeight

//   // BID WAR #2!!
//   await placeAuctionBid(alice, vaultId, 0, colAddr, '5300.123@MSFT')
//   await tGroup.waitForSync()
//   await placeAuctionBid(bob, vaultId, 0, bobColAddr, '5355.123@MSFT')
//   await tGroup.waitForSync()

//   const height = await alice.container.call('getblockcount')
//   await waitForIndexedHeight(app, height - 1)
// })

// afterAll(async () => {
//   await stopTestingApp(tGroup, app)
// })

// it('should listVaultAuctionHistory', async () => {
//   {
//     const list = await controller.listVaultAuctionHistory(vaultId, batch, 0, { size: 30 })
//     expect(list.data.length).toStrictEqual(3)
//     expect(list.data).toStrictEqual([
//       {
//         id: expect.any(String),
//         key: `${vaultId}-0`,
//         sort: `${HexEncoder.encodeHeight(list.data[0].block.height)}-${list.data[0].id.split('-')[2]}`,
//         vaultId: vaultId,
//         index: 0,
//         from: expect.any(String),
//         address: colAddr,
//         amount: '5408.55',
//         tokenId: 2,
//         block: expect.any(Object)
//       },
//       {
//         id: expect.any(String),
//         key: `${vaultId}-0`,
//         sort: `${HexEncoder.encodeHeight(list.data[1].block.height)}-${list.data[1].id.split('-')[2]}`,
//         vaultId: vaultId,
//         index: 0,
//         from: expect.any(String),
//         address: bobColAddr,
//         amount: '5355',
//         tokenId: 2,
//         block: expect.any(Object)
//       },
//       {
//         id: expect.any(String),
//         key: `${vaultId}-0`,
//         sort: `${HexEncoder.encodeHeight(list.data[2].block.height)}-${list.data[2].id.split('-')[2]}`,
//         vaultId: vaultId,
//         index: 0,
//         from: expect.any(String),
//         address: colAddr,
//         amount: '5300',
//         tokenId: 2,
//         block: expect.any(Object)
//       }
//     ])
//   }

//   {
//     const list = await controller.listVaultAuctionHistory(vaultId, batch1, 0, { size: 30 })
//     expect(list.data.length).toStrictEqual(2)
//     expect(list.data).toStrictEqual([
//       {
//         id: expect.any(String),
//         key: `${vaultId}-0`,
//         sort: `${HexEncoder.encodeHeight(list.data[0].block.height)}-${list.data[0].id.split('-')[2]}`,
//         vaultId: vaultId,
//         index: 0,
//         from: expect.any(String),
//         address: bobColAddr,
//         amount: '5355.123',
//         tokenId: 4,
//         block: expect.any(Object)
//       },
//       {
//         id: expect.any(String),
//         key: `${vaultId}-0`,
//         sort: `${HexEncoder.encodeHeight(list.data[1].block.height)}-${list.data[1].id.split('-')[2]}`,
//         vaultId: vaultId,
//         index: 0,
//         from: expect.any(String),
//         address: colAddr,
//         amount: '5300.123',
//         tokenId: 4,
//         block: expect.any(Object)
//       }
//     ])
//   }
// })

// it('should listVaultAuctionHistory with pagination', async () => {
//   const first = await controller.listVaultAuctionHistory(vaultId, batch, 0, { size: 1 })
//   expect(first.data.length).toStrictEqual(1)
//   expect(first.data).toStrictEqual([
//     {
//       id: expect.any(String),
//       key: `${vaultId}-0`,
//       sort: `${HexEncoder.encodeHeight(first.data[0].block.height)}-${first.data[0].id.split('-')[2]}`,
//       vaultId: vaultId,
//       index: 0,
//       from: expect.any(String),
//       address: colAddr,
//       amount: '5408.55',
//       tokenId: 2,
//       block: expect.any(Object)
//     }
//   ])
//   expect(first.page).toStrictEqual({ next: first.data[0].sort })

//   const next = await controller.listVaultAuctionHistory(vaultId, batch, 0, { size: 1, next: first?.page?.next })
//   expect(next.data).toStrictEqual([
//     {
//       id: expect.any(String),
//       key: `${vaultId}-0`,
//       sort: `${HexEncoder.encodeHeight(next.data[0].block.height)}-${next.data[0].id.split('-')[2]}`,
//       vaultId: vaultId,
//       index: 0,
//       from: expect.any(String),
//       address: bobColAddr,
//       amount: '5355',
//       tokenId: 2,
//       block: expect.any(Object)
//     }
//   ])
//   expect(next.page).toStrictEqual({ next: next.data[0].sort })

//   const last = await controller.listVaultAuctionHistory(vaultId, batch, 0, { size: 2, next: next?.page?.next })
//   expect(last.data).toStrictEqual([
//     {
//       id: expect.any(String),
//       key: `${vaultId}-0`,
//       sort: `${HexEncoder.encodeHeight(last.data[0].block.height)}-${last.data[0].id.split('-')[2]}`,
//       vaultId: vaultId,
//       index: 0,
//       from: expect.any(String),
//       address: colAddr,
//       amount: '5300',
//       tokenId: 2,
//       block: expect.any(Object)
//     }
//   ])
//   expect(last.page).toStrictEqual(undefined)
// })

// function now (): number {
//   return Math.floor(new Date().getTime() / 1000)
// }
// async function dfi (testing: Testing, address: string, amount: number): Promise<void> {
//   await testing.token.dfi({
//     address: address,
//     amount: amount
//   })
//   await testing.generate(1)
// }
// async function createToken (testing: Testing, symbol: string, address: string): Promise<void> {
//   await testing.token.create({
//     symbol: symbol,
//     collateralAddress: address
//   })
//   await testing.generate(1)
// }
// async function mintTokens (testing: Testing, symbol: string, amount: number): Promise<void> {
//   await testing.token.mint({
//     symbol: symbol,
//     amount: amount
//   })
//   await testing.generate(1)
// }
// async function setCollateralToken (testing: Testing, symbol: string): Promise<void> {
//   await testing.client.loan.setCollateralToken({
//     token: symbol,
//     factor: new BigNumber(1),
//     fixedIntervalPriceId: `${symbol}/USD`
//   })
//   await testing.generate(1)
// }
// async function setLoanToken (testing: Testing, symbol: string): Promise<void> {
//   await testing.client.loan.setLoanToken({
//     symbol: symbol,
//     fixedIntervalPriceId: `${symbol}/USD`
//   })
//   await testing.generate(1)
// }
// async function createVault (testing: Testing, schemeId: string, address?: string): Promise<string> {
//   const vaultId = await testing.client.container.call(
//     'createvault', [address ?? await testing.generateAddress(), schemeId]
//   )
//   await testing.generate(1)
//   return vaultId
// }
// async function depositToVault (testing: Testing, vaultId: string, address: string, tokenAmt: string): Promise<void> {
//   await testing.client.container.call('deposittovault', [vaultId, address, tokenAmt])
//   await testing.generate(1)
// }
// async function takeLoan (testing: Testing, vaultId: string, amounts: string | string[]): Promise<void> {
//   await testing.client.container.call('takeloan', [{ vaultId, amounts }])
//   await testing.generate(1)
// }
// async function placeAuctionBid (testing: Testing, vaultId: string, index: number, addr: string, tokenAmt: string): Promise<void> {
//   await testing.container.call('placeauctionbid', [vaultId, index, addr, tokenAmt])
//   await testing.generate(1)
// }
