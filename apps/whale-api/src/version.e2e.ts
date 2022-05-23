import { MasterNodeRegTestContainer } from '@defichain/testcontainers'
import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { newFastifyAdapter } from './fastify'
import { AppModule } from './app.module'
import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'

const container = new MasterNodeRegTestContainer()
let app: NestFastifyApplication

class VersionConfigService extends ConfigService {
  constructor (rpcUrl: string) {
    super({
      defid: {
        url: rpcUrl
      },
      version: 'v0',
      network: 'regtest',
      database: {
        provider: 'memory'
      }
    })
  }
}

beforeAll(async () => {
  await container.start()
  await container.generate(1)

  const url = await container.getCachedRpcUrl()
  const module = await Test.createTestingModule({
    imports: [AppModule.forRoot('memory')]
  })
    .overrideProvider(ConfigService).useValue(new VersionConfigService(url))
    .compile()

  app = module.createNestApplication<NestFastifyApplication>(
    newFastifyAdapter({ logger: false })
  )
  AppModule.configure(app)
  await app.init()
})

afterAll(async () => {
  try {
    await app.close()
  } finally {
    await container.stop()
  }
})

it('should GET /v0/regtest/tokens with overridden endpoint', async () => {
  const res = await app.inject({
    method: 'GET',
    url: '/v0/regtest/tokens'
  })

  expect(res.statusCode).toStrictEqual(200)
  expect(res.json()).toStrictEqual({
    data: [
      expect.objectContaining({
        id: '0',
        symbol: 'DFI',
        symbolKey: 'DFI'
      })
    ]
  })
})

it('should fail GET with /v0.0/regtest/tokens as endpoint is overridden', async () => {
  const res = await app.inject({
    method: 'GET',
    url: '/v0.0/regtest/tokens'
  })

  expect(res.statusCode).toStrictEqual(404)
})
