// import { GenesisKeys } from '@defichain/testcontainers'
// import { getProviders, MockProviders } from '../provider.mock'
// import { P2WPKHTransactionBuilder } from '../../src'
// import { fundEllipticPair, sendTransaction } from '../test.utils'
// import { WIF } from '@defichain/jellyfish-crypto'
// import BigNumber from 'bignumber.js'
// import { LoanMasterNodeRegTestContainer } from './loan_container'
// import { TestingGroup } from '@defichain/jellyfish-testing'
// import { RegTest } from '@defichain/jellyfish-network'
// import { P2WPKH } from '@defichain/jellyfish-address'
//
// describe('loans.closeVault', () => {
//   const tGroup = TestingGroup.create(2, i => new LoanMasterNodeRegTestContainer(GenesisKeys[i]))
//
//   let providers: MockProviders
//   let builder: P2WPKHTransactionBuilder
//
//   let vaultWithCollateral: string // Vault with collateral token deposited
//
//   let vaultWithoutCollateral1: string // Vaults without collateral token deposited
//   let vaultWithoutCollateral2: string
//   let vaultWithoutCollateral3: string
//
//   let vaultWithLiquidation: string // Vault with liquidation event triggered
//
//   let vaultAddresstWithoutCollateral2: string
//
//   beforeAll(async () => {
//     await tGroup.start()
//     await tGroup.get(0).container.waitForWalletCoinbaseMaturity()
//
//     providers = await getProviders(tGroup.get(0).container)
//     providers.setEllipticPair(WIF.asEllipticPair(GenesisKeys[0].owner.privKey))
//     builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
//
//     // do the setup
//     await setup()
//   })
//
//   afterAll(async () => {
//     await tGroup.stop()
//   })
//
//   async function fundForFeesIfUTXONotAvailable (amount: number): Promise<void> {
//     const prevouts = await providers.prevout.all()
//     if (prevouts.length === 0) {
//       // Fund 10 DFI UTXO to providers.getAddress() for fees
//       await fundEllipticPair(tGroup.get(0).container, providers.ellipticPair, 10)
//     }
//   }
//
//   async function setup (): Promise<void> {
//     // token setup
//     const collateralAddress = await tGroup.get(0).container.getNewAddress()
//     await tGroup.get(0).token.dfi({
//       address: collateralAddress,
//       amount: 30000
//     })
//     await tGroup.get(0).generate(1)
//
//     // oracle setup
//     const addr = await tGroup.get(0).generateAddress()
//     const priceFeeds = [
//       {
//         token: 'DFI',
//         currency: 'USD'
//       },
//       {
//         token: 'TSLA',
//         currency: 'USD'
//       }
//     ]
//     const oracleId = await tGroup.get(0).rpc.oracle.appointOracle(addr, priceFeeds, { weightage: 1 })
//     await tGroup.get(0).generate(1)
//     const timestamp = Math.floor(new Date().getTime() / 1000)
//     await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, {
//       prices: [{
//         tokenAmount: '1@DFI',
//         currency: 'USD'
//       }]
//     })
//     await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, {
//       prices: [{
//         tokenAmount: '2@TSLA',
//         currency: 'USD'
//       }]
//     })
//     await tGroup.get(0).generate(1)
//
//     // loan scheme setup
//     await tGroup.get(0).rpc.loan.createLoanScheme({
//       minColRatio: 150,
//       interestRate: new BigNumber(3),
//       id: 'scheme'
//     })
//     await tGroup.get(0).generate(1)
//
//     // collateral token setup
//     await tGroup.get(0).rpc.loan.setCollateralToken({
//       token: 'DFI',
//       factor: new BigNumber(1),
//       fixedIntervalPriceId: 'DFI/USD'
//     })
//     await tGroup.get(0).generate(1)
//
//     // loan token setup
//     await tGroup.get(0).rpc.loan.setLoanToken({
//       symbol: 'TSLA',
//       fixedIntervalPriceId: 'TSLA/USD'
//     })
//     await tGroup.get(0).generate(1)
//
//     // Vaults setup
//     vaultWithCollateral = await tGroup.get(0).rpc.loan.createVault({
//       ownerAddress: await tGroup.get(0).generateAddress(),
//       loanSchemeId: 'scheme'
//     })
//     await tGroup.get(0).generate(1)
//
//     await tGroup.get(0).rpc.loan.depositToVault({
//       vaultId: vaultWithCollateral,
//       from: collateralAddress,
//       amount: '2@DFI'
//     })
//     await tGroup.get(0).generate(1)
//
//     vaultWithoutCollateral1 = await tGroup.get(0).rpc.loan.createVault({
//       ownerAddress: await tGroup.get(0).generateAddress(),
//       loanSchemeId: 'scheme'
//     })
//     await tGroup.get(0).generate(1)
//
//     vaultAddresstWithoutCollateral2 = await tGroup.get(0).generateAddress()
//     vaultWithoutCollateral2 = await tGroup.get(0).rpc.loan.createVault({
//       ownerAddress: vaultAddresstWithoutCollateral2,
//       loanSchemeId: 'scheme'
//     })
//     await tGroup.get(0).generate(1)
//
//     vaultWithoutCollateral3 = await tGroup.get(0).rpc.loan.createVault({
//       ownerAddress: await tGroup.get(0).generateAddress(),
//       loanSchemeId: 'scheme'
//     })
//     await tGroup.get(0).generate(1)
//
//     vaultWithLiquidation = await tGroup.get(0).rpc.loan.createVault({
//       ownerAddress: await tGroup.get(0).generateAddress(),
//       loanSchemeId: 'scheme'
//     })
//     await tGroup.get(0).generate(1)
//
//     await tGroup.get(0).rpc.loan.depositToVault({
//       vaultId: vaultWithLiquidation,
//       from: collateralAddress,
//       amount: '10000@DFI'
//     })
//     await tGroup.get(0).generate(1)
//
//     await tGroup.get(0).rpc.loan.takeLoan({
//       vaultId: vaultWithLiquidation,
//       amounts: '100@TSLA'
//     })
//     await tGroup.get(0).generate(1)
//
//     await tGroup.get(0).rpc.oracle.setOracleData(oracleId, timestamp, {
//       prices: [{
//         tokenAmount: '100000@TSLA',
//         currency: 'USD'
//       }]
//     })
//     await tGroup.get(0).generate(12)
//
//     await tGroup.waitForSync()
//   }
//
//   describe('loan.closeVault()', () => {
//     it('should closeVault', async () => {
//       {
//         const address = await tGroup.get(0).generateAddress()
//         const addressAccountBefore = await tGroup.get(0).rpc.account.getAccount(address)
//         expect(addressAccountBefore).toStrictEqual([]) // 0 DFI
//
//         // fund if UTXO is not available for fees
//         await fundForFeesIfUTXONotAvailable(10)
//
//         // const script = await providers.elliptic.script()
//         // const newAddress = await tGroup.get(0).generateAddress()
//         // const fromScript = P2WPKH.fromAddress(RegTest, newAddress, P2WPKH).getScript()
//
//         // const txn = await builder.loans.closeVault({
//         //   vaultId: vaultWithCollateral,
//         //   to: fromScript
//         // }, script)
//
//         // Ensure the created txn is correct.
//         // const outs = await sendTransaction(tGroup.get(0).container, txn)
//         // expect(outs[0].value).toStrictEqual(0)
//         // expect(outs[1].value).toBeLessThan(10)
//         // expect(outs[1].value).toBeGreaterThan(9.999)
//         // expect(outs[1].scriptPubKey.addresses[0]).toStrictEqual(await providers.getAddress())
//         //
//         // // Ensure you don't send all your balance away during appoint oracle
//         // const prevouts = await providers.prevout.all()
//         // expect(prevouts.length).toStrictEqual(1)
//         // expect(prevouts[0].value.toNumber()).toBeLessThan(10)
//         // expect(prevouts[0].value.toNumber()).toBeGreaterThan(9.999)
//         //
//         // const addressAccountAfter = await tGroup.get(0).rpc.account.getAccount(address)
//         // expect(addressAccountAfter).toStrictEqual(['2.50000000@DFI']) // 2 + 0.5 DFI (Get back collateral tokens and fee)
//       }
//
//       //{
//         // const address = await tGroup.get(0).generateAddress()
//         // const addressAccountBefore = await tGroup.get(0).rpc.account.getAccount(address)
//         // expect(addressAccountBefore).toStrictEqual([]) // 0 DFI
//         //
//         // const txId = await tGroup.get(0).rpc.loan.closeVault({
//         //   vaultId: vaultWithoutCollateral1,
//         //   to: address
//         // })
//         // await tGroup.get(0).generate(1)
//         //
//         // const addressAccountAfter = await tGroup.get(0).rpc.account.getAccount(address)
//         // expect(addressAccountAfter).toStrictEqual(['0.50000000@DFI']) // 0.5 DFI (Get back fee only)
//         //
//         // expect(typeof txId).toStrictEqual('string')
//         // expect(txId.length).toStrictEqual(64)
//      // }
//     })
//   //
//   //   // it('should closeVault as vault does not exist', async () => {
//   //   //   const promise = tGroup.get(0).rpc.loan.closeVault({ vaultId: '0'.repeat(64), to: await tGroup.get(0).generateAddress() })
//   //   //   await expect(promise).rejects.toThrow(`RpcApiError: 'Vault <${'0'.repeat(64)}> does not found', code: -5, method: closevault`)
//   //   // })
//   //   //
//   //   // it('should not closeVault for liquidated vault', async () => {
//   //   //   const liqVault = await tGroup.get(0).container.call('getvault', [vaultWithLiquidation])
//   //   //   expect(liqVault.isUnderLiquidation).toStrictEqual(true)
//   //   //
//   //   //   const promise = tGroup.get(0).rpc.loan.closeVault({ vaultId: vaultWithLiquidation, to: await tGroup.get(0).generateAddress() })
//   //   //   await expect(promise).rejects.toThrow('RpcApiError: \'Vault is under liquidation.\', code: -26, method: closevault')
//   //   // })
//   //   //
//   //   // it('should not closeVault by anyone other than the vault owner', async () => {
//   //   //   const address = await tGroup.get(1).generateAddress()
//   //   //   const promise = tGroup.get(1).rpc.loan.closeVault({ vaultId: vaultWithoutCollateral2, to: address })
//   //   //   await expect(promise).rejects.toThrow(`RpcApiError: 'Incorrect authorization for ${vaultAddresstWithoutCollateral2}', code: -5, method: closevault`)
//   //   // })
//   //   //
//   //   // it('should closeVault with utxos', async () => {
//   //   //   const utxo = await tGroup.get(0).container.fundAddress(vaultAddresstWithoutCollateral2, 10)
//   //   //   const txId = await tGroup.get(0).rpc.loan.closeVault({ vaultId: vaultWithoutCollateral2, to: await tGroup.get(0).generateAddress() }, [utxo])
//   //   //   expect(typeof txId).toStrictEqual('string')
//   //   //   expect(txId.length).toStrictEqual(64)
//   //   //   const rawtx = await tGroup.get(0).container.call('getrawtransaction', [txId, true])
//   //   //   expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
//   //   //   expect(rawtx.vin[0].vout).toStrictEqual(utxo.vout)
//   //   // })
//   //   //
//   //   // it('should not closeVault with arbitrary utxos', async () => {
//   //   //   const utxo = await tGroup.get(0).container.fundAddress(await tGroup.get(0).generateAddress(), 10)
//   //   //   const promise = tGroup.get(0).rpc.loan.closeVault({ vaultId: vaultWithoutCollateral3, to: await tGroup.get(0).generateAddress() }, [utxo])
//   //   //   await expect(promise).rejects.toThrow('tx must have at least one input from token owner')
//   //   // })
//   })
// })
