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
    await createToken('DBCH')
    await createPoolPair('DBCH')
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

  async function createPoolPair (tokenB: string, metadata?: any): Promise<void> {
    const address = await container.call('getnewaddress')
    const defaultMetadata = {
      tokenA: 'DFI',
      tokenB,
      commission: 0,
      status: true,
      ownerAddress: address
    }
    await client.poolpair.createPoolPair({ ...defaultMetadata, ...metadata })
    await container.generate(1)
  }

  it('should getPoolPair', async () => {
    const poolpair = await client.poolpair.getPoolPair('DFI-DBCH')

    for (const k in poolpair) {
      const data = poolpair[k]
      expect(data.symbol).toStrictEqual('DFI-DBCH')
      expect(data.name).toStrictEqual('Default Defi token-DBCH')
      expect(data.status).toStrictEqual(true)
      expect(typeof data.idTokenA).toStrictEqual('string')
      expect(typeof data.idTokenB).toStrictEqual('string')
      expect(data.reserveA instanceof BigNumber).toStrictEqual(true)
      expect(data.reserveB instanceof BigNumber).toStrictEqual(true)
      expect(typeof data['reserveA/reserveB']).toStrictEqual('string')
      expect(typeof data['reserveB/reserveA']).toStrictEqual('string')
      expect(data.tradeEnabled).toStrictEqual(false)
      expect(data.blockCommissionA instanceof BigNumber).toStrictEqual(true)
      expect(data.blockCommissionB instanceof BigNumber).toStrictEqual(true)
      expect(data.rewardPct instanceof BigNumber).toStrictEqual(true)
      expect(typeof data.creationTx).toStrictEqual('string')
      expect(data.creationHeight instanceof BigNumber).toStrictEqual(true)
    }
  })

  it('should getPoolPair with verbose false', async () => {
    const poolpair = await client.poolpair.getPoolPair('DFI-DBCH', false)

    for (const k in poolpair) {
      const data = poolpair[k]
      expect(data.symbol).toStrictEqual('DFI-DBCH')
      expect(data.name).toStrictEqual('Default Defi token-DBCH')
      expect(data.status).toStrictEqual(true)
      expect(typeof data.idTokenA).toStrictEqual('string')
      expect(typeof data.idTokenB).toStrictEqual('string')
    }
  })

  it('should be failed as getting non-existent pair', async () => {
    const promise = client.poolpair.getPoolPair('DFI-NONEXIST')

    await expect(promise).rejects.toThrow('Pool not found')
  })
})
