import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { TokenCreate, CTokenCreate } from '@defichain/jellyfish-transaction'
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

  async index (block: RawBlock, txns: Array<DfTxTransaction<TokenCreate>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const tokenId = await this.tokenMapper.getNextTokenID(data.isDAT)
      await this.tokenMapper.put({
        id: `${tokenId}`,
        sort: HexEncoder.encodeHeight(tokenId),
        symbol: data.symbol.trim().substr(0, MAX_TOKEN_SYMBOL_LENGTH),
        name: data.name.trim().substr(0, MAX_TOKEN_NAME_LENGTH),
        isDAT: data.isDAT,
        isLPS: false,
        limit: data.limit.toFixed(8),
        mintable: data.mintable,
        decimal: data.decimal,
        tradeable: data.tradeable,
        block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
      })
    }
  }

  async invalidate (_: RawBlock, txns: Array<DfTxTransaction<TokenCreate>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const tokenId = await this.tokenMapper.getNextTokenID(data.isDAT)
      await this.tokenMapper.delete(`${tokenId - 1}`)
    }
  }
}
