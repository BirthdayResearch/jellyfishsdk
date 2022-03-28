import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CTokenCreate, TokenCreate } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { MAX_TOKEN_NAME_LENGTH, MAX_TOKEN_SYMBOL_LENGTH, TokenMapper } from '@src/module.model/token'

@Injectable()
export class CreateTokenIndexer extends DfTxIndexer<TokenCreate> {
  OP_CODE: number = CTokenCreate.OP_CODE
  private readonly logger = new Logger(CreateTokenIndexer.name)

  constructor (
    private readonly tokenMapper: TokenMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<TokenCreate>): Promise<void> {
    const txid = transaction.txn.txid
    const data = transaction.dftx.data
    const tokenId = await this.tokenMapper.getNextTokenID(data.isDAT)

    const symbol = data.symbol.trim().substr(0, MAX_TOKEN_SYMBOL_LENGTH)
    const name = data.name.trim().substr(0, MAX_TOKEN_NAME_LENGTH)

    await this.tokenMapper.put({
      id: txid,
      tokenId: tokenId,
      sort: HexEncoder.encodeHeight(tokenId),
      symbol: symbol,
      name: name,
      isDAT: data.isDAT,
      isLPS: false,
      limit: data.limit.toFixed(8),
      mintable: data.mintable,
      decimal: data.decimal,
      tradeable: data.tradeable,
      block: {
        hash: block.hash,
        height: block.height,
        medianTime: block.mediantime,
        time: block.time
      }
    })
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<TokenCreate>): Promise<void> {
    const txid = transaction.txn.txid
    await this.tokenMapper.delete(txid)
  }
}
