import { DfTxIndexer, DfTxTransaction } from '../RootDfTxIndexer'
import { ApiClient, blockchain as defid } from '@defichain/jellyfish-api-core'
import { CTokenCreate, TokenCreate } from '@defichain/jellyfish-transaction'
import { Injectable } from '@nestjs/common'
import { Token, TokenService } from '../../models/Token'

/**
 * Indexes dex swaps to support performant queries
 */
@Injectable()
export class TokenIndexer implements DfTxIndexer<TokenCreate> {
  OP_CODE = CTokenCreate.OP_CODE

  constructor (
    private readonly apiClient: ApiClient,
    private readonly tokenService: TokenService
  ) {
  }

  async index (block: defid.Block<defid.Transaction>, dfTx: DfTxTransaction<TokenCreate>): Promise<void> {
    await this.tokenService.upsert(await this.map(block, dfTx))
  }

  async invalidate (block: defid.Block<defid.Transaction>, dfTx: DfTxTransaction<TokenCreate>): Promise<void> {
    // TODO(eli-lim)
  }

  async map (block: defid.Block<defid.Transaction>, dfTx: DfTxTransaction<TokenCreate>): Promise<Token> {
    const tokenCreate = dfTx.dftx.data
    return {
      id: await this.tokenService.getNextTokenID(tokenCreate.isDAT),
      decimal: tokenCreate.decimal,
      isDAT: tokenCreate.isDAT,
      isLPS: false,
      limit: tokenCreate.limit.toFixed(8),
      mintable: tokenCreate.mintable,
      name: tokenCreate.name,
      symbol: tokenCreate.symbol,
      tradeable: tokenCreate.tradeable,
      block: {
        hash: block.hash,
        height: block.height,
        medianTime: block.mediantime,
        time: block.time
      }
    }
  }
}
