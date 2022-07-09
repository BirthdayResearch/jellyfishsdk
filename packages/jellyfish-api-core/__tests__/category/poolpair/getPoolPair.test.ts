import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { ContainerAdapterClient } from '../../container_adapter_client'
import BigNumber from 'bignumber.js'

describe('Poolpair', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
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

  async function createPoolPair (tokenB: string): Promise<void> {
    const address = await container.call('getnewaddress')
    const defaultMetadata = {
      tokenA: 'DFI',
      tokenB,
      commission: 0,
      status: true,
      ownerAddress: address
    }
    await client.poolpair.createPoolPair({ ...defaultMetadata })
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

  it('should getPoolPair test token fee direction', async () => {
    const ppTokenID = Object.keys(await client.token.getToken('DFI-DBCH'))[0]

    // without any fee percentage and direction
    {
      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH')

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.dexFeePctTokenA).toBeUndefined()
        expect(data.dexFeeInPctTokenA).toBeUndefined()
        expect(data.dexFeeOutPctTokenA).toBeUndefined()
        expect(data.dexFeePctTokenB).toBeUndefined()
        expect(data.dexFeeInPctTokenB).toBeUndefined()
        expect(data.dexFeeOutPctTokenB).toBeUndefined()
      }
    }

    // default token_a_fee_direction should be both
    {
      await client.masternode.setGov({
        ATTRIBUTES: {
          [`v0/poolpairs/${ppTokenID}/token_a_fee_pct`]: '0.05'
        }
      })
      await container.generate(1)

      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH')

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.dexFeePctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeInPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeOutPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeePctTokenB).toBeUndefined()
        expect(data.dexFeeInPctTokenB).toBeUndefined()
        expect(data.dexFeeOutPctTokenB).toBeUndefined()
      }
    }

    // token_a_fee_direction should be in
    {
      await client.masternode.setGov({
        ATTRIBUTES: {
          [`v0/poolpairs/${ppTokenID}/token_a_fee_pct`]: '0.05',
          [`v0/poolpairs/${ppTokenID}/token_a_fee_direction`]: 'in'
        }
      })
      await container.generate(1)

      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH')

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.dexFeePctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeInPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeOutPctTokenA).toBeUndefined()
        expect(data.dexFeePctTokenB).toBeUndefined()
        expect(data.dexFeeInPctTokenB).toBeUndefined()
        expect(data.dexFeeOutPctTokenB).toBeUndefined()
      }
    }

    // token_a_fee_direction should be out
    {
      await client.masternode.setGov({
        ATTRIBUTES: {
          [`v0/poolpairs/${ppTokenID}/token_a_fee_pct`]: '0.05',
          [`v0/poolpairs/${ppTokenID}/token_a_fee_direction`]: 'out'
        }
      })
      await container.generate(1)

      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH')

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.dexFeePctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeInPctTokenA).toBeUndefined()
        expect(data.dexFeeOutPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeePctTokenB).toBeUndefined()
        expect(data.dexFeeInPctTokenB).toBeUndefined()
        expect(data.dexFeeOutPctTokenB).toBeUndefined()
      }
    }

    // token_a_fee_direction should be both
    {
      await client.masternode.setGov({
        ATTRIBUTES: {
          [`v0/poolpairs/${ppTokenID}/token_a_fee_pct`]: '0.05',
          [`v0/poolpairs/${ppTokenID}/token_a_fee_direction`]: 'both'
        }
      })
      await container.generate(1)

      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH')

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.dexFeePctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeInPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeOutPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeePctTokenB).toBeUndefined()
        expect(data.dexFeeInPctTokenB).toBeUndefined()
        expect(data.dexFeeOutPctTokenB).toBeUndefined()
      }
    }

    // default token_b_fee_direction should be both
    {
      await client.masternode.setGov({
        ATTRIBUTES: {
          [`v0/poolpairs/${ppTokenID}/token_b_fee_pct`]: '0.05'
        }
      })
      await container.generate(1)

      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH')

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.dexFeePctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeInPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeOutPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeePctTokenB).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeInPctTokenB).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeOutPctTokenB).toStrictEqual(new BigNumber(0.05))
      }
    }

    // token_b_fee_direction should be in
    {
      await client.masternode.setGov({
        ATTRIBUTES: {
          [`v0/poolpairs/${ppTokenID}/token_b_fee_pct`]: '0.05',
          [`v0/poolpairs/${ppTokenID}/token_b_fee_direction`]: 'in'
        }
      })
      await container.generate(1)

      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH')

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.dexFeePctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeInPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeOutPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeePctTokenB).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeInPctTokenB).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeOutPctTokenB).toBeUndefined()
      }
    }

    // token_b_fee_direction should be out
    {
      await client.masternode.setGov({
        ATTRIBUTES: {
          [`v0/poolpairs/${ppTokenID}/token_b_fee_pct`]: '0.05',
          [`v0/poolpairs/${ppTokenID}/token_b_fee_direction`]: 'out'
        }
      })
      await container.generate(1)

      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH')

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.dexFeePctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeInPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeOutPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeePctTokenB).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeInPctTokenB).toBeUndefined()
        expect(data.dexFeeOutPctTokenB).toStrictEqual(new BigNumber(0.05))
      }
    }

    // token_b_fee_direction should be both
    {
      await client.masternode.setGov({
        ATTRIBUTES: {
          [`v0/poolpairs/${ppTokenID}/token_b_fee_pct`]: '0.05',
          [`v0/poolpairs/${ppTokenID}/token_b_fee_direction`]: 'both'
        }
      })
      await container.generate(1)

      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH')

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.dexFeePctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeInPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeOutPctTokenA).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeePctTokenB).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeInPctTokenB).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeOutPctTokenB).toStrictEqual(new BigNumber(0.05))
      }
    }

    // token_a_fee_direction should be undefined
    {
      await client.masternode.setGov({
        ATTRIBUTES: {
          [`v0/poolpairs/${ppTokenID}/token_a_fee_pct`]: '0'
        }
      })
      await container.generate(1)

      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH')

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.dexFeePctTokenA).toBeUndefined()
        expect(data.dexFeeInPctTokenA).toBeUndefined()
        expect(data.dexFeeOutPctTokenA).toBeUndefined()
        expect(data.dexFeePctTokenB).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeInPctTokenB).toStrictEqual(new BigNumber(0.05))
        expect(data.dexFeeOutPctTokenB).toStrictEqual(new BigNumber(0.05))
      }
    }

    // token_b_fee_direction should be undefined
    {
      await client.masternode.setGov({
        ATTRIBUTES: {
          [`v0/poolpairs/${ppTokenID}/token_b_fee_pct`]: '0'
        }
      })
      await container.generate(1)

      const poolpair = await client.poolpair.getPoolPair('DFI-DBCH')

      for (const k in poolpair) {
        const data = poolpair[k]
        expect(data.dexFeePctTokenA).toBeUndefined()
        expect(data.dexFeeInPctTokenA).toBeUndefined()
        expect(data.dexFeeOutPctTokenA).toBeUndefined()
        expect(data.dexFeePctTokenB).toBeUndefined()
        expect(data.dexFeeInPctTokenB).toBeUndefined()
        expect(data.dexFeeOutPctTokenB).toBeUndefined()
      }
    }
  })

  it('should be failed as getting non-existent pair', async () => {
    const promise = client.poolpair.getPoolPair('DFI-NONEXIST')

    await expect(promise).rejects.toThrow('Pool not found')
  })
})
