import { Module } from '@nestjs/common'
import { MemoryDatabase } from '@src/module.database/provider.memory/memory.database'

/**
 * Provides the memory database module where all data is stored in memory in NodeJS
 */
@Module({
  providers: [
    MemoryDatabase
  ]
})
export class MemoryDatabaseModule {
}
