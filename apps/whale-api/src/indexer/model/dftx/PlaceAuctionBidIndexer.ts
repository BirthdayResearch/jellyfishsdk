import { PlaceAuctionBid, CPlaceAuctionBid } from '@defichain/jellyfish-transaction'
import { Injectable, Logger } from '@nestjs/common'

import { toBuffer } from '@defichain/jellyfish-transaction/src/script/_buffer'

import { VaultAuctionHistoryMapper } from '../../../models/VaultAuctionBatchHistory'
import { HexEncoder } from '../../../utilities/HexEncoder'
import { RawBlock } from '../Indexer'
import { DfTxIndexer, DfTxTransaction } from './DfTxIndexer'

@Injectable()
export class PlaceAuctionBidIndexer extends DfTxIndexer<PlaceAuctionBid> {
  OP_CODE: number = CPlaceAuctionBid.OP_CODE
  private readonly logger = new Logger(PlaceAuctionBidIndexer.name)

  constructor (
    private readonly vaultAuctionHistoryMapper: VaultAuctionHistoryMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<PlaceAuctionBid>): Promise<void> {
    const data = transaction.dftx.data

    await this.vaultAuctionHistoryMapper.put({
      id: `${data.vaultId}-${data.index}-${transaction.txn.txid}`,
      key: `${data.vaultId}-${data.index}`,
      sort: `${HexEncoder.encodeHeight(block.height)}-${transaction.txn.txid}`,
      vaultId: data.vaultId,
      index: data.index,
      from: toBuffer(data.from.stack).toString('hex'),
      amount: data.tokenAmount.amount.toString(),
      tokenId: data.tokenAmount.token,
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
    })
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<PlaceAuctionBid>): Promise<void> {
    const data = transaction.dftx.data

    await this.vaultAuctionHistoryMapper.delete(`${data.vaultId}-${data.index}-${transaction.txn.txid}`)
  }
}
