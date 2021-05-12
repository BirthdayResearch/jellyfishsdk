import { Global, Module } from '@nestjs/common'
import { RawBlockMapper } from '@src/module.model/raw.block'
import { BlockMapper } from '@src/module.model/block'
import { ScriptActivityMapper } from '@src/module.model/script.activity'
import { ScriptAggregationMapper } from '@src/module.model/script.aggregation'
import { ScriptUnspentMapper } from '@src/module.model/script.unspent'
import { TransactionMapper } from '@src/module.model/transaction'
import { TransactionVinMapper } from '@src/module.model/transaction.vin'
import { TransactionVoutMapper } from '@src/module.model/transaction.vout'

@Global()
@Module({
  providers: [
    RawBlockMapper,
    BlockMapper,
    ScriptActivityMapper,
    ScriptAggregationMapper,
    ScriptUnspentMapper,
    TransactionMapper,
    TransactionVinMapper,
    TransactionVoutMapper
  ],
  exports: [
    RawBlockMapper,
    BlockMapper,
    ScriptActivityMapper,
    ScriptAggregationMapper,
    ScriptUnspentMapper,
    TransactionMapper,
    TransactionVinMapper,
    TransactionVoutMapper
  ]
})
export class ModelModule {
}
