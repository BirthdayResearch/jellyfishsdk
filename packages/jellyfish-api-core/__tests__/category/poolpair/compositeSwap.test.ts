import { LoanMasterNodeRegTestContainer } from '../loan/loan_container'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'
import { poolpair } from '@defichain/jellyfish-api-core'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'

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

    // consensus should pick the path with better rate
    await testing.token.create({ symbol: 'ABC' })
    await testing.token.create({ symbol: 'PATHA' })
    await testing.token.create({ symbol: 'PATHB' })
    await testing.token.create({ symbol: 'XYZ' })
    await container.generate(1)

    await testing.poolpair.create({ tokenA: 'ABC', tokenB: 'PATHA' })
    await testing.poolpair.create({ tokenA: 'XYZ', tokenB: 'PATHA' })
    await testing.poolpair.create({ tokenA: 'ABC', tokenB: 'PATHB' })
    await testing.poolpair.create({ tokenA: 'XYZ', tokenB: 'PATHB' })
    await container.generate(1)
    await testing.token.mint({ symbol: 'ABC', amount: 10000 })
    await testing.token.mint({ symbol: 'PATHA', amount: 10000 })
    await testing.token.mint({ symbol: 'PATHB', amount: 10000 })
    await testing.token.mint({ symbol: 'XYZ', amount: 10000 })
    await container.generate(1)

    // PATH A: expensive
    await testing.poolpair.add({
      a: { symbol: 'ABC', amount: 3000 },
      b: { symbol: 'PATHA', amount: 1 }
    })
    await testing.poolpair.add({
      a: { symbol: 'XYZ', amount: 5 },
      b: { symbol: 'PATHA', amount: 1 }
    })

    // PATH B: 10x cheaper than PATH A
    await testing.poolpair.add({
      a: { symbol: 'ABC', amount: 3000 },
      b: { symbol: 'PATHB', amount: 1 }
    })
    await testing.poolpair.add({
      a: { symbol: 'XYZ', amount: 5 },
      b: { symbol: 'PATHB', amount: 1 }
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
      const [amount, symbol] = toBalances[0].split('@')
      expect(symbol).toStrictEqual('DOG')
      // allow test to run standalone, with first case success swap, TokenTo/TokenFrom price reduced
      expect(Number(amount)).toBeGreaterThan(13)
      expect(Number(amount)).toBeLessThan(14)
    }
  })

  it('Should compositeSwap with lower rate path', async () => {
    const [toAddress, fromAddress] = await testing.generateAddress(2)
    await testing.token.send({ symbol: 'ABC', amount: 3001, address: fromAddress })
    await testing.generate(1)

    { // before swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('3001.00000000@ABC')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(0)
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'ABC',
      amountFrom: 3000,
      to: toAddress,
      tokenTo: 'XYZ'
    }
    await client.poolpair.compositeSwap(metadata)
    await container.generate(1)

    { // after swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('1.00000000@ABC')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(1)
      expect(toBalances[0]).toStrictEqual('1.66666667@XYZ')
    }
  })

  it('should not compositeSwap - invalid auth', async () => {
    const anotherMn = new LoanMasterNodeRegTestContainer(GenesisKeys[1])
    await anotherMn.start()
    const notMine = await anotherMn.getNewAddress()
    await testing.token.send({ symbol: 'CAT', amount: 45.6, address: notMine })
    await testing.generate(1)

    { // has balance
      const fromBalances = await client.account.getAccount(notMine)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('45.60000000@CAT')
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: notMine,
      tokenFrom: 'CAT',
      amountFrom: 1,
      to: await testing.generateAddress(),
      tokenTo: 'DOG'
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Incorrect authorization')
  })

  it('should not compositeSwap - Cannot find usable pool pair', async () => {
    const fromAddress = await testing.generateAddress()

    await testing.token.create({ symbol: 'TSLA' })
    await testing.token.create({ symbol: 'APPL' })
    await container.generate(1)
    await testing.poolpair.create({ tokenA: 'TSLA', tokenB: 'DFI' })
    await container.generate(1)
    await testing.token.mint({ symbol: 'TSLA', amount: 100 })
    await container.generate(1)

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'TSLA',
      amountFrom: 50,
      to: await testing.generateAddress(),
      tokenTo: 'APPL'
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot find usable pool pair')
  })

  it('should not compositeSwap - status false poolpair equivalent to not exist', async () => {
    const fromAddress = await testing.generateAddress()
    await testing.token.create({ symbol: 'FALSE' })
    await container.generate(1)
    await testing.poolpair.create({ tokenA: 'FALSE', tokenB: 'DFI', status: false })
    await container.generate(1)

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'FALSE',
      amountFrom: 50,
      to: await testing.generateAddress(),
      tokenTo: 'DOG'
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot find usable pool pair')
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
