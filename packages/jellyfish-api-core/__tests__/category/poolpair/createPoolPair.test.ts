import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

describe('Pool', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
    await container.waitForWalletBalanceGTE(200)
    await createToken('DBTC')
  })

  afterAll(async () => {
    await container.stop()
  })

  async function createToken (symbol: string): Promise<void> {
    const address = await container.call('getnewaddress')
    const metadata = {
      symbol,
      name: symbol,
      isDAT: true,
      mintable: true,
      tradeable: true,
      collateralAddress: address
    }
    await container.call('createtoken', [metadata])
    await container.generate(1)
  }

  it('should createPoolPair', async () => {
    let assertions = 0
    const poolpairsBefore = await client.poolpair.listPoolPairs()
    const poolpairsLengthBefore = Object.keys(poolpairsBefore).length

    const address = await container.call('getnewaddress')
    const metadata = {
      tokenA: 'DFI',
      tokenB: 'DBTC',
      commission: 1,
      status: true,
      ownerAddress: address
    }
    const data = await client.poolpair.createPoolPair(metadata)
    expect(typeof data).toStrictEqual('string')

    await container.generate(1)

    const poolpairsAfter = await client.poolpair.listPoolPairs()
    expect(Object.keys(poolpairsAfter).length).toStrictEqual(poolpairsLengthBefore + 1)

    for (const k in poolpairsAfter) {
      const poolpair = poolpairsAfter[k]
      if (poolpair.name === 'Default Defi token-DBTC') {
        expect(poolpair.symbol).toStrictEqual(`${metadata.tokenA}-${metadata.tokenB}`)
        expect(poolpair.status).toStrictEqual(metadata.status)
        expect(poolpair.commission.toString()).toStrictEqual(new BigNumber(metadata.commission).toString())
        expect(poolpair.ownerAddress).toStrictEqual(metadata.ownerAddress)
        expect(poolpair.totalLiquidity instanceof BigNumber).toStrictEqual(true)
        expect(typeof poolpair.idTokenA).toStrictEqual('string')
        expect(typeof poolpair.idTokenB).toStrictEqual('string')
        expect(poolpair.reserveA instanceof BigNumber).toStrictEqual(true)
        expect(poolpair.reserveB instanceof BigNumber).toStrictEqual(true)
        expect(typeof poolpair['reserveA/reserveB']).toStrictEqual('string')
        expect(typeof poolpair['reserveB/reserveA']).toStrictEqual('string')
        expect(poolpair.tradeEnabled).toStrictEqual(false)
        expect(poolpair.blockCommissionA instanceof BigNumber).toStrictEqual(true)
        expect(poolpair.blockCommissionB instanceof BigNumber).toStrictEqual(true)
        expect(poolpair.rewardPct instanceof BigNumber).toStrictEqual(true)
        expect(typeof poolpair.creationTx).toStrictEqual('string')
        expect(poolpair.creationHeight instanceof BigNumber).toStrictEqual(true)
        assertions += 1
      }
    }
    expect(assertions).toStrictEqual(1)
  })
})
