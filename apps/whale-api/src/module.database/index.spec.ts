import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from '@src/module.database'
import { Database } from '@src/module.database/database'
import { MemoryDatabase } from '@src/module.database/provider.memory/memory.database'

describe('memory module', () => {
  let app: TestingModule
  let database: Database

  beforeEach(async () => {
    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            database: {
              provider: 'memory'
            }
          })]
        }),
        DatabaseModule
      ]
    }).compile()

    database = app.get<Database>(Database)
  })

  it('dynamically injected database should be memory database', () => {
    expect(database instanceof MemoryDatabase).toBe(true)
  })

  it('should be a singleton module', () => {
    expect(app.get<Database>(Database).get('1')).toBeFalsy()
    expect(app.get<Database>(Database).get('2')).toBeFalsy()

    app.get<Database>(Database).put('1', 'a-1')
    app.get<Database>(Database).put('2', { b: 2 })

    expect(app.get<Database>(Database).get('1')).toBe('a-1')
    expect(app.get<Database>(Database).get('2')).toEqual({
      b: 2
    })
  })
})

describe('invalid module', () => {
  it('should fail module instantiation as database provider is invalid', async () => {
    const initModule = async (): Promise<void> => {
      await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({
              database: {
                provider: 'invalid'
              }
            })]
          }),
          DatabaseModule
        ]
      }).compile()
    }

    await expect(initModule)
      .rejects
      .toThrow('bootstrapping error: invalid database.provider - invalid')
  })
})
