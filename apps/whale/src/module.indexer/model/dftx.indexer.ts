import { OP_DEFI_TX, OPCode } from '@defichain/jellyfish-transaction'
import { Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { toOPCodes } from '@defichain/jellyfish-transaction/dist/script/_buffer'
import { SmartBuffer } from 'smart-buffer'
import { AppointOracleIndexer } from '@src/module.indexer/model/dftx/appoint.oracle'
import { RemoveOracleIndexer } from '@src/module.indexer/model/dftx/remove.oracle'
import { UpdateOracleIndexer } from '@src/module.indexer/model/dftx/update.oracle'
import { SetOracleDataIndexer } from '@src/module.indexer/model/dftx/set.oracle.data'
import { Injectable } from '@nestjs/common'
import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'

@Injectable()
export class MainDfTxIndexer extends Indexer {
  private readonly indexers: Array<DfTxIndexer<any>>

  constructor (
    private readonly appointOracle: AppointOracleIndexer,
    private readonly removeOracle: RemoveOracleIndexer,
    private readonly updateOracle: UpdateOracleIndexer,
    private readonly setOracleData: SetOracleDataIndexer
  ) {
    super()
    this.indexers = [
      appointOracle,
      updateOracle,
      removeOracle,
      setOracleData
    ]
  }

  async index (block: RawBlock): Promise<void> {
    const transactions = getDfTxTransactions(block)

    for (const indexer of this.indexers) {
      const filtered = transactions.filter(value => value.dftx.type === indexer.OP_CODE)
      await indexer.index(block, filtered)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const transactions = getDfTxTransactions(block)

    for (const indexer of this.indexers) {
      const filtered = transactions.filter(value => value.dftx.type === indexer.OP_CODE)
      await indexer.invalidate(block, filtered)
    }
  }
}

export function getDfTxTransactions (block: RawBlock): Array<DfTxTransaction<any>> {
  const transactions: Array<DfTxTransaction<any>> = []

  for (const txn of block.tx) {
    for (const vout of txn.vout) {
      if (!vout.scriptPubKey.asm.startsWith('OP_RETURN 44665478')) {
        continue
      }

      const stack: OPCode[] = toOPCodes(SmartBuffer.fromBuffer(Buffer.from(vout.scriptPubKey.hex, 'hex')))
      if (stack[1].type !== 'OP_DEFI_TX') {
        continue
      }
      transactions.push({ txn: txn, dftx: (stack[1] as OP_DEFI_TX).tx })
    }
  }

  return transactions
}
