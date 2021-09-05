import { BlockHeader, CBlockHeader } from './blockHeader'
import { BufferComposer, ComposableBuffer } from '@defichain/jellyfish-buffer'
import {
  TransactionSegWit,
  Transaction,
  CTransaction,
  CTransactionSegWit
} from '@defichain/jellyfish-transaction'
import { SmartBuffer } from 'smart-buffer'

export interface Block {
  blockHeader: BlockHeader // -------------| 124 bytes + signature (n = VarUInt{1-9 bytes} + n bytes)
  transactions: Array<TransactionSegWit | Transaction> // ----| n = VarUInt{1-9 bytes}, + n transactions, list of transactions
}

/**
 * Composable Block, C stands for Composable.
 * Immutable by design, bi-directional fromBuffer, toBuffer deep composer.
 */
export class CBlock extends ComposableBuffer<Block> {
  composers (block: Block): BufferComposer[] {
    return [
      ComposableBuffer.single<BlockHeader>(() => block.blockHeader, v => block.blockHeader = v, v => new CBlockHeader(v)),
      ComposableBuffer.varUIntArray<TransactionSegWit | Transaction>(() => block.transactions, v => block.transactions = v, v => {
        /**
         * Has to read the marker from buffer in order to determine wether it is a Transaction or TransactionSegWit.
         */
        if (v instanceof SmartBuffer) {
          const readOffset = v.readOffset // Keep current offset in order to reset to this point once marker is read.
          v.readUInt32LE() // Read 4 bytes from version and discard it.
          const marker = v.readUInt8()
          v.readOffset = readOffset
          if (marker > 0x00) {
            return new CTransaction(v)
          } else {
            return new CTransactionSegWit(v)
          }
        } else {
          if ((v as TransactionSegWit).marker === 0x00) {
            return new CTransactionSegWit(v as TransactionSegWit)
          } else {
            return new CTransaction(v)
          }
        }
      })
    ]
  }
}
