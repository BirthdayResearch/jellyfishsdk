import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { AddressController } from '@src/module.api/address.controller'
import { createToken, mintTokens, sendTokensToAddress } from '@defichain/testing'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { CacheModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { DatabaseModule } from '@src/module.database/_module'
import { ModelModule } from '@src/module.model/_module'
import { DeFiDModule } from '@src/module.defid/_module'
import { IndexerModule } from '@src/module.indexer/_module'
import { RpcApiError } from '@defichain/jellyfish-api-core'

const container = new MasterNodeRegTestContainer()
let controller: AddressController

const tokens = ['A', 'B', 'C', 'D', 'E', 'F']

beforeAll(async () => {
  await container.start()
  await container.waitForReady()
  await container.waitForWalletCoinbaseMaturity()
  const defidUrl = await container.getCachedRpcUrl()

  const app: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({ defid: { url: defidUrl } })]
      }),
      CacheModule.register(),
      ScheduleModule.forRoot(),
      DatabaseModule.forRoot('memory'),
      ModelModule,
      DeFiDModule,
      IndexerModule
    ],
    controllers: [AddressController],
    providers: [
      DeFiDCache
    ]
  }).compile()

  controller = app.get(AddressController)
})

afterAll(async () => {
  await container.stop()
})

describe('listTokens', () => {
  const address = 'bcrt1qf5v8n3kfe6v5mharuvj0qnr7g74xnu9leut39r'

  beforeAll(async () => {
    for (const token of tokens) {
      await container.waitForWalletBalanceGTE(110)
      await createToken(container, token)
      await mintTokens(container, token, { mintAmount: 1000 })
      await sendTokensToAddress(container, address, 10, token)
    }
    await container.generate(1)
  })

  it('should listTokens', async () => {
    const response = await controller.listTokens(address, {
      size: 30
    })

    expect(response.data.length).toStrictEqual(6)
    expect(response.page).toBeUndefined()

    expect(response.data[5]).toStrictEqual({
      id: '6',
      amount: '10.00000000',
      symbol: 'F',
      symbolKey: 'F',
      name: 'F',
      isDAT: true,
      isLPS: false
    })
  })

  it('should listTokens with pagination', async () => {
    const first = await controller.listTokens(address, {
      size: 2
    })
    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('2')
    expect(first.data[0].symbol).toStrictEqual('A')
    expect(first.data[1].symbol).toStrictEqual('B')

    const next = await controller.listTokens(address, {
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toStrictEqual(4)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].symbol).toStrictEqual('C')
    expect(next.data[1].symbol).toStrictEqual('D')
    expect(next.data[2].symbol).toStrictEqual('E')
    expect(next.data[3].symbol).toStrictEqual('F')
  })

  it('should listTokens with undefined next pagination', async () => {
    const first = await controller.listTokens(address, {
      size: 2,
      next: undefined
    })

    expect(first.data.length).toStrictEqual(2)
    expect(first.page?.next).toStrictEqual('2')
  })

  it('should throw error while listTokens with invalid address', async () => {
    await expect(controller.listTokens('invalid', { size: 30 }))
      .rejects.toThrow(RpcApiError)

    await expect(controller.listTokens('invalid', { size: 30 }))
      .rejects.toThrow('recipient (invalid) does not refer to any valid address')
  })
})
