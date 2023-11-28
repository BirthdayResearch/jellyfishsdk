// import BigNumber from 'bignumber.js'
import { getProviders, MockProviders } from '../provider.mock'
// import { P2WPKHTransactionBuilder } from '../../src'
// import { calculateTxid, findOut, fundEllipticPair, sendTransaction } from '../test.utils'
import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
// import { Testing } from '@defichain/jellyfish-testing'
// import { fromScript, P2WPKH } from '@defichain/jellyfish-address'
// import { AccountToAccount, ICXCreateOrder, ICXOrderType, OP_CODES } from '@defichain/jellyfish-transaction'
import { WIF } from '@defichain/jellyfish-crypto'
// import { ICXOrderInfo } from '@defichain/jellyfish-api-core/dist/category/icxorderbook'
import { describeWithDefid, generate } from '../util'

let providers: MockProviders
// let builder: P2WPKHTransactionBuilder

// interface Pair {
//   tokenId: number
//   poolId: number
// }

// const pairs: Record<string, Pair> = {
//   PIG: {
//     tokenId: Number.NaN,
//     poolId: Number.NaN
//   },
//   CAT: {
//     tokenId: Number.NaN,
//     poolId: Number.NaN
//   },
//   DOG: {
//     tokenId: Number.NaN,
//     poolId: Number.NaN
//   },
//   GOAT: {
//     tokenId: Number.NaN,
//     poolId: Number.NaN
//   }
// }

// beforeEach(async () => {
//   await container.start()
//   await container.waitForWalletCoinbaseMaturity()
//   jsonRpc = new JsonRpcClient(await container.getCachedRpcUrl())

//   providers = await getProviders(container)
//   providers.setEllipticPair(
//     WIF.asEllipticPair(RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.privKey)
//   )

//   builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)
//   testing = Testing.create(container)

//   // create a DCT token
//   {
//     const dctAddr = await testing.generateAddress()
//     await testing.token.create({ symbol: 'FISH', isDAT: false, collateralAddress: dctAddr })
//     await testing.generate(1)

//     await testing.token.create({ symbol: 'FROG', isDAT: false, collateralAddress: dctAddr })
//     await testing.generate(1)

//     await testing.token.mint({
//       symbol: 'FISH#128',
//       amount: 10000
//     })
//     await testing.token.mint({
//       symbol: 'FROG#129',
//       amount: 10000
//     })
//     await testing.generate(1)

//     await testing.poolpair.create({
//       tokenA: 'FROG#129',
//       tokenB: 'DFI'
//     })
//     await testing.generate(1)
//   }

//   for (let i = 0; i < 64; i++) {
//     await testing.token.create({ symbol: `A${i}` })
//     await testing.token.create({ symbol: `B${i}` })
//     await testing.generate(1)
//   }

//   // creating DFI-* pool pairs and funding liquidity
//   for (const symbol of Object.keys(pairs)) {
//     await testing.token.create({ symbol })
//     await testing.generate(1)

//     const token = await testing.rpc.token.getToken(symbol)
//     pairs[symbol].tokenId = Number.parseInt(Object.keys(token)[0])

//     await testing.token.mint({
//       symbol,
//       amount: 10000
//     })
//     await testing.poolpair.create({
//       tokenA: symbol,
//       tokenB: 'DFI'
//     })
//     await testing.generate(1)

//     const pool = await container.call('getpoolpair', [`${symbol}-DFI`])
//     pairs[symbol].poolId = Number.parseInt(Object.keys(pool)[0])
//   }

//   // Prep 1000 DFI Token for testing
//   await testing.token.dfi({ amount: 1000 })
//   await testing.rpc.masternode.setGov({
//     ATTRIBUTES: {
//       'v0/params/feature/icx': 'true'
//     }
//   })
//   await testing.generate(1)
// })

describeWithDefid('transferDomain', (context) => {
  it('should createPoolPair and removeLiquidity', async () => {
    providers = await getProviders(context.client)
    providers.setEllipticPair(WIF.asEllipticPair(RegTestFoundationKeys[RegTestFoundationKeys.length - 1].owner.privKey))

    // builder = new P2WPKHTransactionBuilder(providers.fee, providers.prevout, providers.elliptic, RegTest)

    // create a DCT token
    {
      const dctAddr = await providers.getAddress()
      await context.client.token.createToken({ name: 'FISH', symbol: 'FISH', isDAT: false, mintable: true, tradeable: true, collateralAddress: dctAddr })
      await generate(context.client, 1)

      await context.client.token.createToken({ name: 'FROG', symbol: 'FROG', isDAT: false, mintable: true, tradeable: true, collateralAddress: dctAddr })
      await generate(context.client, 1)

      await context.client.token.mintTokens({
        amounts: ['10000@FISH#128']
      })
      await context.client.token.mintTokens({
        amounts: ['10000@FROG#129']
      })
      await generate(context.client, 1)

      await context.client.poolpair.createPoolPair({
        tokenA: 'FROG#129',
        tokenB: 'DFI',
        commission: 0,
        status: true,
        ownerAddress: await providers.getAddress()
      })
      await generate(context.client, 1)
    }

    // const script = await providers.elliptic.script()
    // await fundEllipticPair(container, providers.ellipticPair, 10)
    // await providers.setupMocks()

    // const catId = Number(await testing.token.getTokenId('CAT'))

    // // test DCT and >128 DAT token on create pool pair
    // {
    //   const txn = await builder.liqPool.create({
    //     tokenA: 128,
    //     tokenB: catId,
    //     commission: new BigNumber(0.1),
    //     ownerAddress: script,
    //     status: true,
    //     pairSymbol: 'FISH-CAT',
    //     customRewards: [{ token: 0, amount: new BigNumber(1) }]
    //   }, script)

    //   // Ensure the created txn is correct.
    //   const outs = await sendTransaction(container, txn)
    //   expect(outs[0].value).toStrictEqual(0)

    //   const pair = await testing.poolpair.get('FISH-CAT')
    //   expect(pair).toBeDefined()
    // }

    // const addr = fromScript(script, 'regtest')!.address
    // await testing.poolpair.add({
    //   a: {
    //     symbol: 'FISH#128',
    //     amount: 10
    //   },
    //   b: {
    //     symbol: 'CAT',
    //     amount: 100
    //   },
    //   address: addr
    // })
    // await testing.generate(1)

    // // test >128 token id on remove liq
    // {
    //   const pairBefore = await testing.rpc.poolpair.getPoolPair('FISH-CAT')
    //   const pairId = Number(Object.keys(pairBefore)[0])
    //   expect(pairId).toBeGreaterThan(128)

    //   const txn = await builder.liqPool.removeLiquidity({
    //     script: script,
    //     tokenId: pairId,
    //     amount: pairBefore[pairId].totalLiquidity.minus(1)
    //   }, script)
    //   const outs = await sendTransaction(container, txn)
    //   expect(outs[0].value).toStrictEqual(0)

    //   const pairAfter = await testing.poolpair.get('FISH-CAT')
    //   expect(pairBefore[pairId].totalLiquidity.toNumber()).toBeGreaterThan(pairAfter.totalLiquidity.toNumber())
    // }
  })
})
