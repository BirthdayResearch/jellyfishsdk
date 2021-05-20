import { Test, TestingModule } from '@nestjs/testing'
import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { AddressController } from '@src/module.api/address.controller'
import { createToken, mintTokens, sendTokensToAddress } from '@defichain/testing'
import { TokenInfoCache } from '@src/module.api/cache/token.info.cache'
import { CacheModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { DatabaseModule } from '@src/module.database/module'
import { ModelModule } from '@src/module.model/_module'
import { DeFiDModule } from '@src/module.defid'
import { IndexerModule } from '@src/module.indexer/module'

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
      TokenInfoCache
    ]
  }).compile()

  controller = app.get(AddressController)
})

afterAll(async () => {
  await container.stop()
})

describe('tokens', () => {
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

  it('should listToken', async () => {
    const response = await controller.listToken(address, {
      size: 30
    })

    expect(response.data.length).toBe(6)
    expect(response.page).toBeUndefined()

    expect(response.data[5]).toEqual({
      id: '6',
      amount: '10.00000000',
      symbol: 'F',
      symbolKey: 'F',
      name: 'F',
      isDAT: true,
      isLPS: false
    })
  })

  it('should listToken with pagination', async () => {
    const first = await controller.listToken(address, {
      size: 2
    })
    expect(first.data.length).toBe(2)
    expect(first.page?.next).toBe('2')
    expect(first.data[0].symbol).toBe('A')
    expect(first.data[1].symbol).toBe('B')

    const next = await controller.listToken(address, {
      size: 10,
      next: first.page?.next
    })

    expect(next.data.length).toBe(4)
    expect(next.page?.next).toBeUndefined()
    expect(next.data[0].symbol).toBe('C')
    expect(next.data[1].symbol).toBe('D')
    expect(next.data[2].symbol).toBe('E')
    expect(next.data[3].symbol).toBe('F')
  })

  it('should listToken with undefined next pagination', async () => {
    const first = await controller.listToken(address, {
      size: 2,
      next: undefined
    })

    expect(first.data.length).toBe(2)
    expect(first.page?.next).toBe('2')
  })
})
