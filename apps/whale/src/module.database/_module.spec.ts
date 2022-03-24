import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from '../module.database/_module'
import { Database } from '../module.database/database'
import { LevelDatabase } from '../module.database/provider.level/level.database'
import { MemoryDatabase } from '../module.database/provider.memory/memory.database'

describe('provided module: level', () => {
  let app: TestingModule
  let database: Database

  beforeEach(async () => {
    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule.forRoot('level')
      ]
    }).compile()

    database = app.get<Database>(Database)
  })

  it('dynamically injected database should be level database', () => {
    expect(database instanceof LevelDatabase).toStrictEqual(true)
  })

  it('should be a singleton module', () => {
    const a = app.get<Database>(Database)
    const b = app.get<Database>(Database)
    expect(a).toStrictEqual(b)
  })
})

describe('provided module: memory', () => {
  let app: TestingModule
  let database: Database

  beforeEach(async () => {
    app = await Test.createTestingModule({
      imports: [
        DatabaseModule.forRoot('memory')
      ]
    }).compile()

    database = app.get<Database>(Database)
  })

  it('dynamically injected database should be memory database', () => {
    expect(database instanceof MemoryDatabase).toStrictEqual(true)
  })

  it('should be a singleton module', () => {
    const a = app.get<Database>(Database)
    const b = app.get<Database>(Database)
    expect(a).toStrictEqual(b)
  })
})

describe('provided module: invalid', () => {
  it('should fail module instantiation as database provider is invalid', async () => {
    async function initModule (): Promise<void> {
      await Test.createTestingModule({
        imports: [DatabaseModule.forRoot('invalid')]
      }).compile()
    }

    await expect(initModule)
      .rejects.toThrow('bootstrapping error: invalid database.provider - invalid')
  })
})
