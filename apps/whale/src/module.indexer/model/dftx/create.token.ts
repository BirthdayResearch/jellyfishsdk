import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { TokenCreate, CTokenCreate } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { DCT_ID_START, TokenMapper } from '@src/module.model/token'
import BigNumber from 'bignumber.js'
import { IndexerError } from '@src/module.indexer/error'

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
      const tokenId = await this.getNextTokenID(data.isDAT)
      await this.tokenMapper.put({
        id: `${tokenId}`,
        sort: HexEncoder.encodeHeight(tokenId),
        symbol: data.symbol,
        name: data.name,
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
      const tokenId = await this.getNextTokenID(data.isDAT)
      await this.tokenMapper.delete(`${tokenId - 1}`)
    }
  }

  async getNextTokenID (isDAT: boolean): Promise<number> {
    if (isDAT) {
      const latest = await this.tokenMapper.getLatestDAT()
      if (latest === undefined) {
        throw new IndexerError('Latest DAT by ID not found')
      }

      const latestId = new BigNumber(latest.id)
      if (!latestId.lt(DCT_ID_START - 1)) {
        const latestDST = await this.tokenMapper.getLatestDST()
        return latestDST !== undefined ? latestId.plus(1).toNumber() : DCT_ID_START
      }

      return latestId.plus(1).toNumber()
    } else {
      const latest = await this.tokenMapper.getLatestDST()
      if (latest === undefined) {
        // Default to DCT_ID_START if no existing DST
        return DCT_ID_START
      }

      const latestId = new BigNumber(latest.id)
      return latestId.plus(1).toNumber()
    }
  }
}
