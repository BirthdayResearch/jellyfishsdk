import { Global, Module } from '@nestjs/common'
import { MemoryDatabase } from './MemoryDatabase'
import { Database } from '../Database'

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
