import { LoanMasterNodeRegTestContainer } from '../loan/loan_container'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'
import { poolpair } from '@defichain/jellyfish-api-core'
import { Testing } from '@defichain/jellyfish-testing'

describe('compositeSwap', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
    await testing.token.dfi({ amount: 30000 })
    await container.generate(1)

    await testing.token.create({ symbol: 'CAT' })
    await container.generate(1)
    await testing.poolpair.create({ tokenA: 'CAT', tokenB: 'DFI' })
    await container.generate(1)
    await testing.token.mint({ symbol: 'CAT', amount: 30000 })
    await container.generate(1)
    await testing.poolpair.add({
      a: { symbol: 'CAT', amount: 25000 },
      b: { symbol: 'DFI', amount: 10000 }
    })

    await testing.token.create({ symbol: 'DOG' })
    await container.generate(1)
    await testing.poolpair.create({ tokenA: 'DOG', tokenB: 'DFI' })
    await container.generate(1)
    await testing.token.mint({ symbol: 'DOG', amount: 30000 })
    await container.generate(1)
    await testing.poolpair.add({
      a: { symbol: 'DOG', amount: 28000 },
      b: { symbol: 'DFI', amount: 10000 }
    })
    await container.generate(1)
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should compositeSwap', async () => {
    const [toAddress, fromAddress] = await testing.generateAddress(2)
    await testing.token.send({ symbol: 'CAT', amount: 456, address: fromAddress })
    await testing.generate(1)

    { // before swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('456.00000000@CAT')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(0)
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'CAT',
      amountFrom: 123,
      to: toAddress,
      tokenTo: 'DOG'
    }

    const hex = await client.poolpair.compositeSwap(metadata)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)
    await container.generate(1)

    { // after swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('333.00000000@CAT')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(1)
      expect(toBalances[0]).toStrictEqual('136.41765034@DOG') // (123 * 28000 / 25000 = ~137.7) ~136.4 as result include slope
    }
  })

  it('should compositeSwap with max price', async () => {
    const [toAddress, fromAddress] = await testing.generateAddress(2)
    await testing.token.send({ symbol: 'CAT', amount: 45.6, address: fromAddress })
    await testing.generate(1)

    { // before swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('45.60000000@CAT')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(0)
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'CAT',
      amountFrom: 12.3,
      to: toAddress,
      tokenTo: 'DOG',
      maxPrice: 1.2
    }

    const hex = await client.poolpair.compositeSwap(metadata)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)
    await container.generate(1)

    { // after swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('33.30000000@CAT')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(1)
      console.log('output:', toBalances[0])
      const [amount, symbol] = toBalances[0].split('@')
      expect(symbol).toStrictEqual('DOG')
      // allow test to run standalone, with first case success swap, TokenTo/TokenFrom price reduced
      expect(Number(amount)).toBeGreaterThan(13)
      expect(Number(amount)).toBeLessThan(14)
    }
  })

  it('should not compositeSwap - lack of liquidity', async () => {
    const fromAddress = await testing.generateAddress()

    await testing.token.create({ symbol: 'EMPTY' })
    await container.generate(1)
    await testing.poolpair.create({ tokenA: 'EMPTY', tokenB: 'DFI' })
    await container.generate(1)
    await testing.token.mint({ symbol: 'EMPTY', amount: 100 })
    await container.generate(1)

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'EMPTY',
      amountFrom: 50,
      to: await testing.generateAddress(),
      tokenTo: 'DOG'
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Lack of liquidity')
  })

  it('should not compositeSwap - Price is higher than indicated', async () => {
    const fromAddress = await testing.generateAddress()
    await testing.token.send({ symbol: 'CAT', amount: 100, address: fromAddress })
    await testing.generate(1)

    { // before swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('100.00000000@CAT')
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'CAT',
      amountFrom: 50,
      to: await testing.generateAddress(),
      tokenTo: 'DOG',
      maxPrice: 0.8// current price ~25000/28000 = ~0.89
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Price is higher than indicated')
  })

  it('should not compositeSwap - TokenFrom was not found', async () => {
    const fromAddress = await testing.generateAddress()

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'INVALID',
      amountFrom: 50,
      to: await testing.generateAddress(),
      tokenTo: 'DOG',
      maxPrice: 0.8// current price ~25000/28000 = ~0.89
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('TokenFrom was not found')
  })

  it('should not compositeSwap - TokenTo was not found', async () => {
    const fromAddress = await testing.generateAddress()
    await testing.token.send({ symbol: 'CAT', amount: 100, address: fromAddress })
    await testing.generate(1)

    { // before swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('100.00000000@CAT')
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'CAT',
      amountFrom: 50,
      to: await testing.generateAddress(),
      tokenTo: 'INVALID',
      maxPrice: 0.8// current price ~25000/28000 = ~0.89
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('TokenTo was not found')
  })
})
