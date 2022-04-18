import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AddressBalanceModel, AddressBalanceRepo } from '../models/AddressBalance'
import { CrawledBlockRepo, CrawledBlockModel } from '../models/CrawledBlock'
import { RichListDroppedOutModel, RichListDroppedOutRepo } from '../models/RichListDroppedOut'

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrawledBlockModel,
      AddressBalanceModel,
      RichListDroppedOutModel
    ])
  ],
  providers: [
    CrawledBlockRepo,
    AddressBalanceRepo,
    RichListDroppedOutRepo
  ],
  exports: [
    TypeOrmModule,
    CrawledBlockRepo,
    AddressBalanceRepo,
    RichListDroppedOutRepo
  ]
})
export class RichListDatabaseModule {
}
