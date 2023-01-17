import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { poolpair, BigNumber } from '@defichain/jellyfish-api-core'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '../../../src'

describe('poolpair update', () => {
  const container = new MasterNodeRegTestContainer()
  const testing = Testing.create(container)
  const client = new ContainerAdapterClient(container)

  beforeEach(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterEach(async () => {
    await container.stop()
  })

  it('should update pool commission', async () => {
    const poolPairBefore = await testing.fixture.createPoolPair({
      a: { amount: 1000, symbol: 'CAT' },
      b: { amount: 500, symbol: 'DFI' }
    })
    const metadata: poolpair.UpdatePoolPairMetadata = {
      pool: poolPairBefore.symbol,
      status: poolPairBefore.status,
      commission: 0.2,
      ownerAddress: poolPairBefore.ownerAddress
    }

    await client.poolpair.updatePoolPair(metadata)
    await container.generate(1)
    const poolPairAfter = await testing.poolpair.get('CAT-DFI')
    expect(poolPairAfter).toStrictEqual({
      symbol: poolPairBefore.symbol,
      name: poolPairBefore.name,
      status: poolPairBefore.status,
      idTokenA: poolPairBefore.idTokenA,
      idTokenB: poolPairBefore.idTokenB,
      reserveA: poolPairBefore.reserveA,
      reserveB: poolPairBefore.reserveB,
      commission: new BigNumber(0.2),
      totalLiquidity: poolPairBefore.totalLiquidity,
      'reserveA/reserveB': poolPairBefore['reserveA/reserveB'],
      'reserveB/reserveA': poolPairBefore['reserveB/reserveA'],
      tradeEnabled: poolPairBefore.tradeEnabled,
      ownerAddress: poolPairBefore.ownerAddress,
      blockCommissionA: poolPairBefore.blockCommissionA,
      blockCommissionB: poolPairBefore.blockCommissionB,
      rewardPct: poolPairBefore.rewardPct,
      rewardLoanPct: poolPairBefore.rewardLoanPct,
      creationTx: poolPairBefore.creationTx,
      creationHeight: poolPairBefore.creationHeight
    })
  })

  it('should update pool ownerAddress', async () => {
    const poolPairBefore = await testing.fixture.createPoolPair({
      a: { amount: 1000, symbol: 'CAT' },
      b: { amount: 500, symbol: 'DFI' }
    })
    const newAddress = await testing.generateAddress()
    const metadata: poolpair.UpdatePoolPairMetadata = {
      pool: poolPairBefore.symbol,
      status: poolPairBefore.status,
      commission: 0,
      ownerAddress: newAddress
    }

    await client.poolpair.updatePoolPair(metadata)
    await container.generate(1)
    const poolPairAfter = await testing.poolpair.get('CAT-DFI')
    expect(poolPairAfter).toStrictEqual({
      symbol: poolPairBefore.symbol,
      name: poolPairBefore.name,
      status: poolPairBefore.status,
      idTokenA: poolPairBefore.idTokenA,
      idTokenB: poolPairBefore.idTokenB,
      reserveA: poolPairBefore.reserveA,
      reserveB: poolPairBefore.reserveB,
      commission: poolPairBefore.commission,
      totalLiquidity: poolPairBefore.totalLiquidity,
      'reserveA/reserveB': poolPairBefore['reserveA/reserveB'],
      'reserveB/reserveA': poolPairBefore['reserveB/reserveA'],
      tradeEnabled: poolPairBefore.tradeEnabled,
      ownerAddress: newAddress,
      blockCommissionA: poolPairBefore.blockCommissionA,
      blockCommissionB: poolPairBefore.blockCommissionB,
      rewardPct: poolPairBefore.rewardPct,
      rewardLoanPct: poolPairBefore.rewardLoanPct,
      creationTx: poolPairBefore.creationTx,
      creationHeight: poolPairBefore.creationHeight
    })
  })

  it('should update pool status', async () => {
    const poolPairBefore = await testing.fixture.createPoolPair({
      a: { amount: 1000, symbol: 'CAT' },
      b: { amount: 500, symbol: 'DFI' }
    })
    const metadata: poolpair.UpdatePoolPairMetadata = {
      pool: poolPairBefore.symbol,
      status: !poolPairBefore.status,
      commission: 0,
      ownerAddress: poolPairBefore.ownerAddress
    }

    await client.poolpair.updatePoolPair(metadata)
    await container.generate(1)
    const poolPairAfter = await testing.poolpair.get('CAT-DFI')
    expect(poolPairAfter).toStrictEqual({
      symbol: poolPairBefore.symbol,
      name: poolPairBefore.name,
      status: !poolPairBefore.status,
      idTokenA: poolPairBefore.idTokenA,
      idTokenB: poolPairBefore.idTokenB,
      reserveA: poolPairBefore.reserveA,
      reserveB: poolPairBefore.reserveB,
      commission: poolPairBefore.commission,
      totalLiquidity: poolPairBefore.totalLiquidity,
      'reserveA/reserveB': poolPairBefore['reserveA/reserveB'],
      'reserveB/reserveA': poolPairBefore['reserveB/reserveA'],
      tradeEnabled: poolPairBefore.tradeEnabled,
      ownerAddress: poolPairBefore.ownerAddress,
      blockCommissionA: poolPairBefore.blockCommissionA,
      blockCommissionB: poolPairBefore.blockCommissionB,
      rewardPct: poolPairBefore.rewardPct,
      rewardLoanPct: poolPairBefore.rewardLoanPct,
      creationTx: poolPairBefore.creationTx,
      creationHeight: poolPairBefore.creationHeight
    })
  })

  it('should throw an error if the commission is too high', async () => {
    const poolPairBefore = await testing.fixture.createPoolPair({
      a: { amount: 1000, symbol: 'ETH' },
      b: { amount: 500, symbol: 'BTC' }
    })

    const metadata: poolpair.UpdatePoolPairMetadata = {
      pool: poolPairBefore.symbol,
      status: poolPairBefore.status,
      commission: 2,
      ownerAddress: poolPairBefore.ownerAddress
    }
    await expect(client.poolpair.updatePoolPair(metadata)).rejects.toThrow(RpcApiError)
  })

  it('should throw an error if the address is not valid', async () => {
    const poolPairBefore = await testing.fixture.createPoolPair({
      a: { amount: 1000, symbol: 'ETH' },
      b: { amount: 500, symbol: 'BTC' }
    })

    const metadata: poolpair.UpdatePoolPairMetadata = {
      pool: poolPairBefore.symbol,
      status: poolPairBefore.status,
      commission: 0,
      ownerAddress: 'testAdress'
    }
    await expect(client.poolpair.updatePoolPair(metadata)).rejects.toThrow(RpcApiError)
  })
})
