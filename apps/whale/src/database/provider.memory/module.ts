import { Global, Module } from '@nestjs/common'
import { MemoryDatabase } from '../provider.memory/memory.database'
import { Database } from '../database'

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
