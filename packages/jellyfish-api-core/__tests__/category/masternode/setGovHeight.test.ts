import { RpcApiError } from '@defichain/jellyfish-api-core'
import { LoanMasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createPoolPair, createToken } from '@defichain/testing'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Masternode', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should setGovHeight', async () => {
    { // before any value set
      const govVar = await client.masternode.getGov('LP_SPLITS')
      expect(govVar.length).toStrictEqual(1)
      expect(Object.keys(govVar[0]).length).toStrictEqual(1)
      expect(Object.keys(govVar[0].LP_SPLITS).length).toStrictEqual(0)
    }

    await createToken(container, 'CAT')
    await createToken(container, 'DOG')
    await createPoolPair(container, 'CAT', 'DFI')
    await createPoolPair(container, 'DOG', 'DFI')

    await client.masternode.setGov({ LP_SPLITS: { 3: 0.2, 4: 0.8 } })
    await container.generate(1)

    {
      const govVar = await client.masternode.getGov('LP_SPLITS')
      expect(govVar.length).toStrictEqual(1)
      expect(Object.keys(govVar[0]).length).toStrictEqual(1)
      expect(Object.keys(govVar[0].LP_SPLITS).length).toStrictEqual(2)

      expect(govVar[0].LP_SPLITS['3'].toString()).toStrictEqual('0.2')
      expect(govVar[0].LP_SPLITS['4'].toString()).toStrictEqual('0.8')
    }

    const currentHeight = await client.blockchain.getBlockCount()
    const activationHeight = currentHeight + 3
    await client.masternode.setGovHeight({ LP_SPLITS: { 3: 0.4, 4: 0.6 } }, activationHeight)
    await container.generate(1)

    { // before new GovVar activated
      const govVar = await client.masternode.getGov('LP_SPLITS')
      expect(govVar.length).toStrictEqual(2)
      expect(Object.keys(govVar[0]).length).toStrictEqual(1)
      expect(Object.keys(govVar[0].LP_SPLITS).length).toStrictEqual(2)
      expect(Object.keys(govVar[1][activationHeight]).length).toStrictEqual(2)

      expect(govVar[0].LP_SPLITS['3'].toString()).toStrictEqual('0.2')
      expect(govVar[0].LP_SPLITS['4'].toString()).toStrictEqual('0.8')
      expect(govVar[1][activationHeight]['3'].toString()).toStrictEqual('0.4')
      expect(govVar[1][activationHeight]['4'].toString()).toStrictEqual('0.6')
    }

    await container.generate(2)

    { // after new GovVar activated
      const govVar = await client.masternode.getGov('LP_SPLITS')
      expect(govVar.length).toStrictEqual(1)
      expect(Object.keys(govVar[0]).length).toStrictEqual(1)
      expect(Object.keys(govVar[0].LP_SPLITS).length).toStrictEqual(2)

      expect(govVar[0].LP_SPLITS['3'].toString()).toStrictEqual('0.4')
      expect(govVar[0].LP_SPLITS['4'].toString()).toStrictEqual('0.6')
    }
  })

  it('should fail if set activation height is lower than current height', async () => {
    const currentHeight = await client.blockchain.getBlockCount()
    const activationHeight = currentHeight - 2
    const promise = client.masternode.setGovHeight({ LP_SPLITS: { 3: 0.4, 4: 0.6 } }, activationHeight)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('startHeight must be above the current block height')
  })
})
