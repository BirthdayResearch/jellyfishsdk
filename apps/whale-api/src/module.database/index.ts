import { ModuleRef } from '@nestjs/core'
import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FactoryProvider } from '@nestjs/common/interfaces/modules/provider.interface'
import { Database } from '@src/module.database/database'
import { MemoryDatabaseModule } from '@src/module.database/provider.memory'
import { MemoryDatabase } from '@src/module.database/provider.memory/memory.database'

/**
 * Runtime DatabaseProvider, dynamically inject a database type based on config in the database.provider.
 * @see Database
 * @see MemoryDatabase
 */
const DatabaseProvider: FactoryProvider = {
  provide: Database,
  useFactory: async (configService: ConfigService, moduleRef: ModuleRef) => {
    const provider = configService.get<string>('database.provider', '')
    switch (provider) {
      case 'memory':
        return await moduleRef.create(MemoryDatabase)
      default:
        throw new Error(`bootstrapping error: invalid database.provider - ${provider}`)
    }
  },
  inject: [ConfigService, ModuleRef]
}

/**
 * DeFi Whale Database Module for service agnostic storage layer.
 */
@Global()
@Module({
  imports: [
    MemoryDatabaseModule
  ],
  providers: [
    DatabaseProvider
  ],
  exports: [Database]
})
export class DatabaseModule {
}
