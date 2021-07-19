import { BigNumber, RpcApiError } from '@defichain/jellyfish-api-core'
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

  it('should getGov LP_DAILY_DFI_REWARD', async () => {
    const gov = await client.masternode.getGov('LP_DAILY_DFI_REWARD')
    expect(gov.LP_DAILY_DFI_REWARD instanceof BigNumber).toStrictEqual(true)
  })

  it('should getGov LP_SPLITS', async () => {
    await createToken(container, 'CAT')
    await createToken(container, 'DOG')
    await createPoolPair(container, 'CAT', 'DFI')
    await createPoolPair(container, 'DOG', 'DFI')

    const hash = await client.masternode.setGov({ LP_SPLITS: { 3: 0.2, 4: 0.8 } })
    expect(hash.length).toStrictEqual(64)
    await container.generate(1)

    const gov = await client.masternode.getGov('LP_SPLITS')
    expect(gov.LP_SPLITS['3'].toString()).toStrictEqual('0.2')
    expect(gov.LP_SPLITS['4'].toString()).toStrictEqual('0.8')
  })

  it('should be failed as variable REWARD is not registered', async () => {
    const promise = client.masternode.getGov('REWARD')
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Variable \'REWARD\' not registered')
  })
})
