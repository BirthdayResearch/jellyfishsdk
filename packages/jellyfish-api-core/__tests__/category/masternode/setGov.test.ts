import { RpcApiError } from '@defichain/jellyfish-api-core'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { createPoolPair, createToken } from '@defichain/testing'
import { ContainerAdapterClient } from '../../container_adapter_client'

describe('Masternode', () => {
  const container = new MasterNodeRegTestContainer()
  const client = new ContainerAdapterClient(container)

  beforeAll(async () => {
    await container.start()
    await container.waitForReady()
    await container.waitForWalletCoinbaseMaturity()
  })

  afterAll(async () => {
    await container.stop()
  })

  it('should setGov LP_SPLITS', async () => {
    const govBefore = await client.masternode.getGov('LP_SPLITS')
    expect(govBefore.length).toStrictEqual(1)
    expect(Object.keys(govBefore).length).toStrictEqual(1)
    expect(Object.keys(govBefore[0].LP_SPLITS).length).toStrictEqual(0)

    await createToken(container, 'CAT')
    await createToken(container, 'DOG')
    await createPoolPair(container, 'CAT', 'DFI')
    await createPoolPair(container, 'DOG', 'DFI')

    await client.masternode.setGov({ LP_SPLITS: { 3: 0.2, 4: 0.8 } })
    await container.generate(1)

    const govAfter = await client.masternode.getGov('LP_SPLITS')
    expect(govAfter[0].LP_SPLITS['3'].toString()).toStrictEqual('0.2')
    expect(govAfter[0].LP_SPLITS['4'].toString()).toStrictEqual('0.8')
  })

  it('should be failed to setGov LP_REWARD as manually set after Eunos hard fork is not allowed', async () => {
    const promise = client.masternode.setGov({ LP_DAILY_DFI_REWARD: 999.00293001 })
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('LP_DAILY_DFI_REWARD: Cannot be set manually after Eunos hard fork')
  })
})
