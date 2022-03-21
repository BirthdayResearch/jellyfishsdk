import { Global, Module } from '@nestjs/common'

import { Database } from '../Database'
import { MemoryDatabase } from '../providers/MemoryDatabase'

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
