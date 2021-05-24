import { DynamicModule, Module, Type } from '@nestjs/common'
import { LevelDatabaseModule } from '@src/module.database/provider.level/module'
import { MemoryDatabaseModule } from '@src/module.database/provider.memory/module'

const PROVIDER = process.env.WHALE_DATABASE_PROVIDER

/**
 * DeFi Whale Database Module for service agnostic storage layer.
 * @see Database
 * @see MemoryDatabase
 * @see LevelDatabase
 */
@Module({})
export class DatabaseModule {
  static forRoot (provider: string | undefined = PROVIDER): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        this.getModule(provider ?? 'level')
      ]
    }
  }

  private static getModule (provider: string): Type {
    if (provider === 'memory') {
      return MemoryDatabaseModule
    }
    if (provider === 'level') {
      return LevelDatabaseModule
    }

    throw new Error(`bootstrapping error: invalid database.provider - ${provider}`)
  }
}
