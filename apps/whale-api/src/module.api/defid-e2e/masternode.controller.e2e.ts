import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, DelayedEunosPayaTestContainer, stopTestingApp, waitForIndexedHeight } from '../../e2e.module'
import { NotFoundException } from '@nestjs/common'
import { MasternodeController } from '../masternode.controller'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { MasternodeState } from '@defichain/whale-api-client/dist/api/masternodes'
import { MasternodeTimeLock } from '@defichain/jellyfish-api-core/dist/category/masternode'

describe('list', () => {
  const container = new MasterNodeRegTestContainer()
  let app: NestFastifyApplication
  let controller: MasternodeController
  let client: JsonRpcClient

  beforeAll(async () => {
    await container.start()

    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())
    controller = app.get(MasternodeController)

    await container.generate(1)
    const height = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should list masternodes', async () => {
    const result = await controller.list({ size: 4 })
    expect(result.data.length).toStrictEqual(4)
    expect(Object.keys(result.data[0]).length).toStrictEqual(9)
  })

  it('should list masternodes with pagination', async () => {
    const first = await controller.list({ size: 4 })
    expect(first.data.length).toStrictEqual(4)

    const next = await controller.list({
      size: 4,
      next: first.page?.next
    })
    expect(next.data.length).toStrictEqual(4)
    expect(next.page?.next).toStrictEqual(`00000000${next.data[3].id}`)

    const last = await controller.list({
      size: 4,
      next: next.page?.next
    })
    expect(last.data.length).toStrictEqual(0)
    expect(last.page).toStrictEqual(undefined)
  })
})

describe('get', () => {
  const container = new MasterNodeRegTestContainer()
  let app: NestFastifyApplication
  let controller: MasternodeController
  let client: JsonRpcClient

  beforeAll(async () => {
    await container.start()

    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())
    controller = app.get(MasternodeController)

    await container.generate(1)
    const height = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should get a masternode with id', async () => {
    // get a masternode from list
    const masternode = (await controller.list({ size: 1 })).data[0]

    const result = await controller.get(masternode.id)
    expect(Object.keys(result).length).toStrictEqual(9)
    expect(result).toStrictEqual({ ...masternode, mintedBlocks: expect.any(Number) })
  })

  it('should fail due to non-existent masternode', async () => {
    expect.assertions(2)
    try {
      await controller.get('8d4d987dee688e400a0cdc899386f243250d3656d802231755ab4d28178c9816')
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException)
      expect(err.response).toStrictEqual({
        statusCode: 404,
        message: 'Unable to find masternode',
        error: 'Not Found'
      })
    }
  })
})

describe('resign', () => {
  const container = new DelayedEunosPayaTestContainer()
  let app: NestFastifyApplication
  let controller: MasternodeController
  let client: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())
    controller = app.get(MasternodeController)

    await container.generate(1)
    const height = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should get masternode with pre-resigned state', async () => {
    await container.generate(1)

    const ownerAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress)
    await container.generate(1)

    const height = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const resignTx = await client.masternode.resignMasternode(masternodeId)

    await container.generate(1)
    const resignHeight = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, resignHeight)

    const result = await controller.get(masternodeId)
    expect(result.state).toStrictEqual(MasternodeState.PRE_RESIGNED)
    expect(result?.resign?.tx).toStrictEqual(resignTx)
    expect(result?.resign?.height).toStrictEqual(resignHeight)
  })
})

describe('timelock', () => {
  const container = new MasterNodeRegTestContainer()
  let app: NestFastifyApplication
  let controller: MasternodeController
  let client: JsonRpcClient

  beforeAll(async () => {
    await container.start()
    await container.waitForWalletCoinbaseMaturity()

    app = await createTestingApp(container)
    client = new JsonRpcClient(await container.getCachedRpcUrl())
    controller = app.get(MasternodeController)

    await container.generate(1)
    const height = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)
  })

  afterAll(async () => {
    await stopTestingApp(container, app)
  })

  it('should get masternode with timelock', async () => {
    await container.generate(1)

    const ownerAddress = await client.wallet.getNewAddress()
    const masternodeId = await client.masternode.createMasternode(ownerAddress, undefined, {
      timelock: MasternodeTimeLock.TEN_YEAR,
      utxos: []
    })

    await container.generate(1)
    const height = await client.blockchain.getBlockCount()
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const result = await controller.get(masternodeId)
    expect(result.timelock).toStrictEqual(520)
  })
})
