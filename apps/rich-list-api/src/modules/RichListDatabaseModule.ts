import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AddressBalanceModel, AddressBalanceDbService } from '../models/AddressBalance'
import { CrawledBlockDbService, CrawledBlockModel } from '../models/CrawledBlock'
import { RichListDroppedOutModel, RichListDroppedOutService } from '../models/RichListDroppedOut'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CrawledBlockModel,
      AddressBalanceModel,
      RichListDroppedOutModel
    ])
  ],
  providers: [
    CrawledBlockDbService,
    AddressBalanceDbService,
    RichListDroppedOutService
  ]
})
export class RichListDatabaseModule {
}
