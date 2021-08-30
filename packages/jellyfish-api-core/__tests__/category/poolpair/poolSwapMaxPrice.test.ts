import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'
import { addPoolLiquidity, createPoolPair, createToken, getNewAddress, mintTokens } from '@defichain/testing'
import { RpcApiError } from '../../../src'

describe('Poolpair', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  let tokenAddress: string
  let toAddress: string
  let dfiAddress: string
  let poolLiquidityAddress: string

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()

    tokenAddress = await getNewAddress(container)
    toAddress = await getNewAddress(container)
    dfiAddress = await getNewAddress(container)
    poolLiquidityAddress = await getNewAddress(container)

    await setup()
  })

  async function setup (): Promise<void> {
    await createToken(container, 'ELF', { collateralAddress: tokenAddress })
    await mintTokens(container, 'ELF', { address: dfiAddress })
    await createPoolPair(container, 'ELF', 'DFI')
    await addPoolLiquidity(container, {
      tokenA: 'ELF',
      amountA: 200,
      tokenB: 'DFI',
      amountB: 500,
      shareAddress: poolLiquidityAddress
    })
  }

  afterAll(async () => {
    await container.stop()
  })

  it('should poolswap maxPrice MAX DFI supply 1200000000', async () => {
    const promise = client.call('poolswap', [{
      from: tokenAddress,
      tokenFrom: 'ELF',
      amountFrom: 666,
      to: toAddress,
      tokenTo: 'DFI',
      maxPrice: new BigNumber('1200000000')
    }], 'bignumber')

    await expect(promise).resolves.not.toThrow()
  })

  it('should throw Amount out of range when poolswap maxPrice MAX DFI supply 1200000000 + 1 satoshi', async () => {
    const promise = client.call('poolswap', [{
      from: tokenAddress,
      tokenFrom: 'ELF',
      amountFrom: 666,
      to: toAddress,
      tokenTo: 'DFI',
      maxPrice: new BigNumber('1200000000').plus('0.00000001')
    }], 'bignumber')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: poolswap')
  })

  it('should throw Amount out of range when poolswap maxPrice < 0', async () => {
    const promise = client.call('poolswap', [{
      from: tokenAddress,
      tokenFrom: 'ELF',
      amountFrom: 666,
      to: toAddress,
      tokenTo: 'DFI',
      maxPrice: new BigNumber('0').minus('0.00000001')
    }], 'bignumber')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Amount out of range\', code: -3, method: poolswap')
  })

  it('should not throw when poolswap maxPrice has 8 decimals', async () => {
    const promise = client.call('poolswap', [{
      from: tokenAddress,
      tokenFrom: 'ELF',
      amountFrom: 666,
      to: toAddress,
      tokenTo: 'DFI',
      maxPrice: new BigNumber('100.00000001')
    }], 'bignumber')
    await expect(promise).resolves.not.toThrow()
  })

  it('should throw Invalid Amount when poolswap maxPrice has more than 8 decimals', async () => {
    const promise = client.call('poolswap', [{
      from: tokenAddress,
      tokenFrom: 'ELF',
      amountFrom: 666,
      to: toAddress,
      tokenTo: 'DFI',
      maxPrice: new BigNumber('100.000000001')
    }], 'bignumber')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('RpcApiError: \'Invalid amount\', code: -3, method: poolswap')
  })
})
