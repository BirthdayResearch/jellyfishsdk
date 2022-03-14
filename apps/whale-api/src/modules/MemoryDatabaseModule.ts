import { Global, Module } from '@nestjs/common'

import { MemoryDatabase } from '../database/providers/MemoryDatabase'
import { Database } from '../database/Database'

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
