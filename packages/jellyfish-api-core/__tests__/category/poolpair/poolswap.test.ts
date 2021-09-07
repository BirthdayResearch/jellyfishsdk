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
import { PoolSwapMetadata } from '@defichain/jellyfish-api-core/category/poolpair'
import { Testing } from '@defichain/jellyfish-testing'

describe('poolSwap', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should poolSwap', async () => {
    const poolPairBefore = await testing.fixture.createPoolPair({
      a: { amount: 1000, symbol: 'CAT' },
      b: { amount: 500, symbol: 'DFI' }
    })

    const [addressReceiver, dfiAddress] = await testing.generateAddress(2)
    await testing.token.dfi({ amount: 700, address: dfiAddress })
    await testing.generate(1)

    const metadata: PoolSwapMetadata = {
      from: dfiAddress,
      tokenFrom: 'DFI',
      amountFrom: 555,
      to: addressReceiver,
      tokenTo: 'CAT'
    }

    const hex = await client.poolpair.poolSwap(metadata)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    await container.generate(1)

    const poolPairAfter = await testing.poolpair.get('CAT-DFI')
    const reserveBAfter = new BigNumber(poolPairBefore.reserveB).plus(555) // 1055
    const reserveAAfter = new BigNumber(poolPairBefore.totalLiquidity).pow(2).div(reserveBAfter) // 473.93364928032265610654

    expect(new BigNumber(poolPairAfter.reserveB)).toStrictEqual(reserveBAfter)
    expect(poolPairAfter.reserveA.toFixed(8)).toStrictEqual(reserveAAfter.toFixed(8))

    const accountReceiver = (await client.account.getAccount(addressReceiver))[0]
    const accountReceiverBalance = new BigNumber(accountReceiver.split('@')[0]) // 526.06635072
    const amountReceived = new BigNumber(poolPairBefore.reserveA).minus(reserveAAfter) // 526.06635071967734389346

    expect(accountReceiverBalance.toFixed(8)).toStrictEqual(amountReceived.toFixed(8))
  })

  it('should poolSwap with utxos', async () => {
    const tokenAddress = await getNewAddress(container)
    const dfiAddress = await getNewAddress(container)
    const poolLiquidityAddress = await getNewAddress(container)

    await createToken(container, 'ETH', { collateralAddress: tokenAddress })
    await utxosToAccount(container, 1000, { address: dfiAddress })
    await mintTokens(container, 'ETH', { address: dfiAddress })
    await createPoolPair(container, 'ETH', 'DFI')

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

    await container.fundAddress(dfiAddress, 25)
    const utxos = await container.call('listunspent')
    const utxo = utxos.find((utxo: any) => utxo.address === dfiAddress)

    const hex = await client.poolpair.poolSwap(metadata, [utxo])
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)

    const rawtx = await container.call('getrawtransaction', [hex, true])
    expect(rawtx.vin[0].txid).toStrictEqual(utxo.txid)
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
    const address = await getNewAddress(container)
    const metadata: PoolSwapMetadata = {
      from: address,
      amountFrom: 2,
      tokenFrom: 'INVALIDTOKEN',
      tokenTo: 'FOX',
      to: address
    }
    await expect(client.poolpair.poolSwap(metadata)).rejects.toThrow('TokenFrom was not found')
  })
})
