import { createTestingApp, DelayedEunosPayaTestContainer, invalidateFromHeight, stopTestingApp, waitForIndexedHeight } from '../../../e2e.module'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasternodeMapper } from '../../../module.model/masternode'
import { MasternodeStatsMapper } from '../../../module.model/masternode.stats'

describe('resign masternode (pre eunos paya)', () => {
  const container = new DelayedEunosPayaTestContainer()
  let app: NestFastifyApplication
  let client: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should index resign masternode', async () => {
    await container.generate(1)

    const ownerAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress)
    await container.generate(1)

    const height = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const masternodeMapper = app.get(MasternodeMapper)

    const masternode = await masternodeMapper.get(masternodeId)

    expect(masternode).not.toStrictEqual(undefined)

    const resignTx = await client.masternode.resignMasternode(masternodeId)

    await container.generate(1)
    const resignHeight = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, resignHeight)

    const resignedMasternode = await masternodeMapper.get(masternodeId)

    expect(resignedMasternode?.resignHeight).toStrictEqual(resignHeight)
    expect(resignedMasternode?.resignTx).toStrictEqual(resignTx)

    const masternodeStatsMapper = app.get(MasternodeStatsMapper)
    const masternodeStats = await masternodeStatsMapper.getLatest()
    expect(masternodeStats?.stats).toStrictEqual({
      count: 8,
      tvl: '80.00000000',
      locked: [
        {
          weeks: 0,
          count: 8,
          tvl: '80.00000000'
        }
      ]
    })
  })
})

describe('invalidate', () => {
  const container = new DelayedEunosPayaTestContainer()
  let app: NestFastifyApplication
  let client: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should resign masternode and invalidate', async () => {
    await container.generate(1)

    const ownerAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress)

    await container.generate(1)
    const height = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const masternodeMapper = app.get(MasternodeMapper)

    const masternode = await masternodeMapper.get(masternodeId)

    expect(masternode).not.toStrictEqual(undefined)

    const resignTx = await client.masternode.resignMasternode(masternodeId)

    await container.generate(1)
    const resignHeight = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, resignHeight)

    const resignedMasternode = await masternodeMapper.get(masternodeId)

    expect(resignedMasternode?.resignHeight).toStrictEqual(resignHeight)
    expect(resignedMasternode?.resignTx).toStrictEqual(resignTx)

    await invalidateFromHeight(app, container, resignHeight)
    await container.generate(2)
    await waitForIndexedHeight(app, resignHeight)

    {
      const invalidatedMasternode = await masternodeMapper.get(masternodeId)
      expect(invalidatedMasternode?.resignHeight).toStrictEqual(-1)
      expect(invalidatedMasternode?.resignTx).toStrictEqual(undefined)
    }
  })
})
