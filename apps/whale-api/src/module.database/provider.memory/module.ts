import { Global, Module } from '@nestjs/common'
import { MemoryDatabase } from '@src/module.database/provider.memory/memory.database'
import { Database } from '@src/module.database/database'

@Global()
@Module({
  providers: [
    {
      provide: Database,
      useClass: MemoryDatabase
    }
  ],
  exports: [
    Database
  ]
})
export class MemoryDatabaseModule {
}
