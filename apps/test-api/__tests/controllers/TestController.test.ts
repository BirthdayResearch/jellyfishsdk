import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { RootModule } from '../../src/modules/RootModule'

describe('TestController (e2e)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RootModule]
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it('/error (GET)', async () => {
    const res = await request(app.getHttpServer()).get('/error')
    console.log('res: ', res.text)
  })
})
