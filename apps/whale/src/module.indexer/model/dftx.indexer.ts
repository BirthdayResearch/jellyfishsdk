import { OP_DEFI_TX, OPCode } from '@defichain/jellyfish-transaction'
import { Indexer, RawBlock } from '../../module.indexer/model/_abstract'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { SmartBuffer } from 'smart-buffer'
import { AppointOracleIndexer } from '../../module.indexer/model/dftx/appoint.oracle'
import { RemoveOracleIndexer } from '../../module.indexer/model/dftx/remove.oracle'
import { UpdateOracleIndexer } from '../../module.indexer/model/dftx/update.oracle'
import { SetOracleDataIndexer } from '../../module.indexer/model/dftx/set.oracle.data'
import { SetOracleDataIntervalIndexer } from '../../module.indexer/model/dftx/set.oracle.data.interval'
import { CreateMasternodeIndexer } from '../../module.indexer/model/dftx/create.masternode'
import { ResignMasternodeIndexer } from '../../module.indexer/model/dftx/resign.masternode'
import { Injectable, Logger } from '@nestjs/common'
import { DfTxIndexer, DfTxTransaction } from '../../module.indexer/model/dftx/_abstract'
import { CreatePoolPairIndexer } from './dftx/create.pool.pair'
import { CreateTokenIndexer } from './dftx/create.token'
import { PoolSwapIndexer } from './dftx/pool.swap'
import { SetLoanTokenIndexer } from './dftx/set.loan.token'
import { UpdatePoolPairIndexer } from './dftx/update.pool.pair'
import { CompositeSwapIndexer } from './dftx/composite.swap'
import { ActivePriceIndexer } from './dftx/active.price'
import { PlaceAuctionBidIndexer } from './dftx/place.auction.bid'
import { PoolSwapAggregatedIndexer } from './dftx/pool.swap.aggregated'

@Injectable()
export class MainDfTxIndexer extends Indexer {
  private readonly logger = new Logger(MainDfTxIndexer.name)
  private readonly indexers: Array<DfTxIndexer<any>>

  constructor (
    appointOracle: AppointOracleIndexer,
    removeOracle: RemoveOracleIndexer,
    updateOracle: UpdateOracleIndexer,
    setOracleData: SetOracleDataIndexer,
    setOracleDataInterval: SetOracleDataIntervalIndexer,
    createMasternode: CreateMasternodeIndexer,
    resignMasternode: ResignMasternodeIndexer,
    createToken: CreateTokenIndexer,
    createPoolPair: CreatePoolPairIndexer,
    updatePoolPair: UpdatePoolPairIndexer,
    poolSwapIndexer: PoolSwapIndexer,
    compositeSwapIndexer: CompositeSwapIndexer,
    poolSwapIntervalIndexer: PoolSwapAggregatedIndexer,
    setLoanToken: SetLoanTokenIndexer,
    activePriceIndexer: ActivePriceIndexer,
    placeAuctionBidIndexer: PlaceAuctionBidIndexer
  ) {
    super()
    this.indexers = [
      appointOracle,
      updateOracle,
      removeOracle,
      setOracleData,
      setOracleDataInterval,
      createMasternode,
      resignMasternode,
      createToken,
      createPoolPair,
      updatePoolPair,
      poolSwapIndexer,
      compositeSwapIndexer,
      poolSwapIntervalIndexer,
      setLoanToken,
      activePriceIndexer,
      placeAuctionBidIndexer
    ]
  }

  async index (block: RawBlock): Promise<void> {
    for (const indexer of this.indexers) {
      await indexer.indexBlockStart(block)
    }

    const transactions = this.getDfTxTransactions(block)
    for (const transaction of transactions) {
      const filtered = this.indexers.filter(value => transaction.dftx.type === value.OP_CODE)
      for (const indexer of filtered) {
        await indexer.indexTransaction(block, transaction)
      }
    }

    for (const indexer of this.indexers) {
      await indexer.indexBlockEnd(block)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    // When invalidating reverse the order of block indexing
    for (const indexer of this.indexers) {
      await indexer.invalidateBlockEnd(block)
    }

    // Invalidate backwards
    const transactions = this.getDfTxTransactions(block).reverse()
    for (const transaction of transactions) {
      const filtered = this.indexers.filter(value => transaction.dftx.type === value.OP_CODE).reverse()
      for (const indexer of filtered) {
        await indexer.invalidateTransaction(block, transaction)
      }
    }

    for (const indexer of this.indexers) {
      await indexer.invalidateBlockStart(block)
    }
  }

  private getDfTxTransactions (block: RawBlock): Array<DfTxTransaction<any>> {
    const transactions: Array<DfTxTransaction<any>> = []

    for (let i = 0; i < block.tx.length; i++) {
      const txn = block.tx[i]
      for (const vout of txn.vout) {
        if (!vout.scriptPubKey.asm.startsWith('OP_RETURN 44665478')) {
          continue
        }

        try {
          const stack: OPCode[] = toOPCodes(SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex')))
          if (stack[1].type !== 'OP_DEFI_TX') {
            continue
          }
          transactions.push({
            txn: txn,
            txnNo: i,
            dftx: (stack[1] as OP_DEFI_TX).tx
          })
        } catch (err) {
          // TODO(fuxingloh): we can improve on this design by having separated indexing pipeline where
          //  a failed pipeline won't affect another indexer pipeline.
          this.logger.error(`Failed to parse a DfTx Transaction with txid: ${txn.txid}`, err)
        }
      }
    }

    return transactions
  }
}
