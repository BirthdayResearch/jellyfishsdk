import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { createTestingApp, stopTestingApp, waitForIndexedHeight } from '@src/e2e.module'
import { createToken, getNewAddress } from '@defichain/testing'
import { TokenMapper } from '@src/module.model/token'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

beforeAll(async () => {
  await container.start()
  await container.waitForWalletCoinbaseMaturity()
  await container.waitForWalletBalanceGTE(100)

  app = await createTestingApp(container)
  await createToken(container, 'DBTC')

  const metadata = {
    symbol: 'MT',
    name: 'MYTOKEN',
    isDAT: false,
    mintable: true,
    tradeable: true,
    collateralAddress: await getNewAddress(container)
  }

  await container.waitForWalletBalanceGTE(101) // token creation fee
  await container.call('createtoken', [metadata])
  await container.generate(1)
})

afterAll(async () => {
  await stopTestingApp(container, app)
})

describe('create token', () => {
  it('should index tokens', async () => {
    await container.generate(1)
    const height = await container.call('getblockcount')
    await container.generate(1)
    await waitForIndexedHeight(app, height)

    const tokenMapper = app.get(TokenMapper)
    const result = await tokenMapper.query(30)
    expect(result.length).toStrictEqual(3)

    expect(result[0]).toStrictEqual({
      id: '128',
      symbol: 'MT',
      name: 'MYTOKEN',
      decimal: 8,
      limit: '0.00000000',
      sort: '00000080',
      mintable: true,
      tradeable: true,
      isDAT: false,
      isLPS: false,
      block: expect.any(Object)
    })

    expect(result[1]).toStrictEqual({
      id: '1',
      symbol: 'DBTC',
      name: 'DBTC',
      decimal: 8,
      limit: '0.00000000',
      sort: '00000001',
      mintable: true,
      tradeable: true,
      isDAT: true,
      isLPS: false,
      block: expect.any(Object)
    })
  })
})
