import { MasterNodeRegTestContainer } from '@defichain/testcontainers/dist/index'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { poolpair, BigNumber } from '@defichain/jellyfish-api-core'
import { Testing } from '@defichain/jellyfish-testing'
import { RpcApiError } from '../../../src'

describe('poolpair update', () => {
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

  it('should update a pool', async () => {
    const poolPairBefore = await testing.fixture.createPoolPair({
      a: { amount: 1000, symbol: 'CAT' },
      b: { amount: 500, symbol: 'DFI' }
    })
    const metadata: poolpair.UpdatePoolPairMetadata = {
      pool: poolPairBefore.symbol,
      status: !poolPairBefore.status,
      commission: 0.2,
      ownerAddress: poolPairBefore.ownerAddress
    }

    await client.poolpair.updatePoolPair(metadata)
    await container.generate(1)
    const poolPairAfter = await testing.poolpair.get('CAT-DFI')
    expect(poolPairAfter.commission.toString()).toStrictEqual(new BigNumber(metadata.commission).toString())
    expect(poolPairAfter.status).toStrictEqual(false)
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
})
