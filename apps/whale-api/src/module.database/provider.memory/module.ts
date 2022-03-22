import { Global, Module } from '@nestjs/common'
import { MemoryDatabase } from '../../module.database/provider.memory/memory.database'
import { Database } from '../../module.database/database'

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
