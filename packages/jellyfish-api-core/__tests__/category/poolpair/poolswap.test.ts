import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import {
  addPoolLiquidity,
  createPoolPair,
  createToken,
  getNewAddress,
  mintTokens,
  utxosToAccount
} from '@defichain/testing'
import { RpcApiError } from '../../../src'
import { PoolSwapMetadata, PoolPairInfo } from '@defichain/jellyfish-api-core/category/poolpair'

describe('poolSwap', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should poolSwap with UTXOS ', async () => {
    const tokenAddress = await getNewAddress(container)
    const dfiAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, 'ETH', { collateralAddress: tokenAddress })
    await utxosToAccount(container, 1000, { address: dfiAddress })
    await mintTokens(container, 'ETH', { address: dfiAddress })
    await createPoolPair(container, 'ETH', 'DFI')

    const { txid } = await container.fundAddress(dfiAddress, 100)

    await addPoolLiquidity(container, {
      tokenA: 'ETH',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: poolLiquidityAddress
    })

    const metadata: PoolSwapMetadata = {
      from: dfiAddress,
      tokenFrom: 'DFI',
      amountFrom: 492,
      to: await getNewAddress(container),
      tokenTo: 'ETH',
      maxPrice: 10
    }

    const utxos = (await container.call('listunspent'))
      .filter((utxos: any) => utxos.txid === txid)
      .map((utxos: any) => {
        return {
          txid: utxos.txid,
          vout: utxos.vout
        }
      })

    const hex = await client.poolpair.poolSwap(metadata, utxos)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)
  })

  it('should poolSwap', async () => {
    const addressReceiver = await getNewAddress(container)
    const tokenAddress = await getNewAddress(container)
    const dfiAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, 'CAT', { collateralAddress: tokenAddress })
    await utxosToAccount(container, 1000, { address: dfiAddress })
    await mintTokens(container, 'CAT', { address: dfiAddress })
    await createPoolPair(container, 'CAT', 'DFI')

    await addPoolLiquidity(container, {
      tokenA: 'CAT',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: poolLiquidityAddress
    })

    const metadata: PoolSwapMetadata = {
      from: dfiAddress,
      tokenFrom: 'DFI',
      amountFrom: 150,
      to: addressReceiver,
      tokenTo: 'CAT'
    }

    const poolpairResultBefore = Object.values(await container.call('getpoolpair', ['CAT-DFI']))[0] as PoolPairInfo

    const hex = await client.poolpair.poolSwap(metadata)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    const poolpairResultAfter = Object.values(await container.call('getpoolpair', ['CAT-DFI']))[0] as PoolPairInfo
    const reserveAAfter = new BigNumber(poolpairResultBefore.reserveB).plus(150)
    const reserveBAfter = new BigNumber(poolpairResultBefore.totalLiquidity).pow(2).div(reserveAAfter) // sqrt(a * b)^2/b

    expect(poolpairResultAfter.reserveB.toFixed(0)).toStrictEqual(reserveAAfter.toFixed(0))
    expect(poolpairResultAfter.reserveA.toFixed(0)).toStrictEqual(reserveBAfter.toFixed(0))
  })

  it('should poolSwap with max price', async () => {
    const tokenAddress = await getNewAddress(container)
    const dfiAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, 'HEN', { collateralAddress: tokenAddress })
    await utxosToAccount(container, 1000, { address: dfiAddress })
    await mintTokens(container, 'HEN', { address: dfiAddress })
    await createPoolPair(container, 'HEN', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'HEN',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: poolLiquidityAddress
    })

    const metadata: PoolSwapMetadata = {
      from: dfiAddress,
      tokenFrom: 'DFI',
      amountFrom: 492,
      to: await getNewAddress(container),
      tokenTo: 'HEN',
      maxPrice: 10
    }

    const hex = await client.poolpair.poolSwap(metadata)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)
  })

  it('should test against max price protection', async () => {
    const tokenAddress = await getNewAddress(container)
    const dfiAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, 'BAT', { collateralAddress: tokenAddress })
    await utxosToAccount(container, 500, { address: dfiAddress })
    await mintTokens(container, 'BAT', { address: dfiAddress })
    await createPoolPair(container, 'BAT', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'BAT',
      amountA: 500,
      tokenB: 'DFI',
      amountB: 300,
      shareAddress: poolLiquidityAddress
    })

    const metadata: PoolSwapMetadata = {
      from: dfiAddress,
      tokenFrom: 'DFI',
      amountFrom: 150,
      to: await getNewAddress(container),
      tokenTo: 'BAT',
      maxPrice: 0.4
    }

    const promise = client.poolpair.poolSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Price is higher than indicated')
  })

  it('should not poolswap transaction with pool pair status set as false', async () => {
    const tokenAddress = await getNewAddress(container)
    const dfiAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, 'DOG', { collateralAddress: tokenAddress })
    await utxosToAccount(container, 1000, { address: dfiAddress })
    await mintTokens(container, 'DOG', { address: dfiAddress })
    await createPoolPair(container, 'DOG', 'DFI', { status: false })
    await addPoolLiquidity(container, {
      tokenA: 'DOG',
      amountA: 1000,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: poolLiquidityAddress

    })
    const metadata: PoolSwapMetadata = {
      from: dfiAddress,
      amountFrom: 2,
      tokenFrom: 'DFI',
      tokenTo: 'DOG',
      to: await getNewAddress(container)
    }
    await expect(client.poolpair.poolSwap(metadata)).rejects.toThrow('Pool trading is turned off!')
  })

  it('should not poolSwap with invalid token', async () => {
    const tokenAddress = await getNewAddress(container)
    const dfiAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, 'FOX', { collateralAddress: tokenAddress })
    await utxosToAccount(container, 500, { address: dfiAddress })
    await mintTokens(container, 'FOX', { address: dfiAddress })
    await createPoolPair(container, 'FOX', 'DFI', { status: false })
    await addPoolLiquidity(container, {
      tokenA: 'FOX',
      amountA: 500,
      tokenB: 'DFI',
      amountB: 200,
      shareAddress: poolLiquidityAddress

    })
    const metadata: PoolSwapMetadata = {
      from: dfiAddress,
      amountFrom: 2,
      tokenFrom: 'INVALIDTOKEN',
      tokenTo: 'FOX',
      to: await client.wallet.getNewAddress()
    }
    await expect(client.poolpair.poolSwap(metadata)).rejects.toThrow('TokenFrom was not found')
  })
})
