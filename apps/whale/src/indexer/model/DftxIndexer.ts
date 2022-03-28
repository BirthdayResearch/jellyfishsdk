import { OP_DEFI_TX, OPCode } from '@defichain/jellyfish-transaction'
import { Indexer, RawBlock } from './_abstract'
import { toOPCodes } from '@defichain/jellyfish-transaction/src/script/_buffer'
import { SmartBuffer } from 'smart-buffer'
import { AppointOracleIndexer } from './dftx/AppointOracle'
import { RemoveOracleIndexer } from './dftx/RemoveOracle'
import { UpdateOracleIndexer } from './dftx/UpdateOracle'
import { SetOracleDataIndexer } from './dftx/SetOracleData'
import { SetOracleDataIntervalIndexer } from './dftx/SetOracleDataInterval'
import { CreateMasternodeIndexer } from './dftx/CreateMasternode'
import { ResignMasternodeIndexer } from './dftx/ResignMasternode'
import { Injectable, Logger } from '@nestjs/common'
import { DfTxIndexer, DfTxTransaction } from './dftx/_abstract'
import { CreatePoolPairIndexer } from './dftx/CreatePoolPair'
import { CreateTokenIndexer } from './dftx/CreateToken'
import { PoolSwapIndexer } from './dftx/PoolSwap'
import { SetLoanTokenIndexer } from './dftx/SetLoanToken'
import { UpdatePoolPairIndexer } from './dftx/UpdatePoolPair'
import { CompositeSwapIndexer } from './dftx/CompositeSwap'
import { ActivePriceIndexer } from './dftx/ActivePrice'
import { PlaceAuctionBidIndexer } from './dftx/PlaceAuctionBid'
import { PoolSwapAggregatedIndexer } from './dftx/PoolSwapAggregated'

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
