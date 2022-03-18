import { DfTxIndexer, DfTxTransaction } from './RootDfTxIndexer'
import { ApiClient, blockchain as defid } from '@defichain/jellyfish-api-core'
import { CTokenCreate, TokenCreate } from '@defichain/jellyfish-transaction'
import { Injectable } from '@nestjs/common'
import { Token, TokenMapper } from '../../models/dftx/Token'
import { Block } from '../../models/block/Block'

/**
 * Indexes dex swaps to support performant queries
 */
@Injectable()
export class CreateTokenIndexer implements DfTxIndexer<TokenCreate> {
  OP_CODE = CTokenCreate.OP_CODE

  constructor (
    private readonly apiClient: ApiClient,
    private readonly tokenService: TokenMapper
  ) {
  }

  async index (block: defid.Block<defid.Transaction>, dfTx: DfTxTransaction<TokenCreate>): Promise<void> {
    await this.tokenService.put(await this.map(block, dfTx))
  }

  async invalidate (block: Block, dfTx: DfTxTransaction<TokenCreate>): Promise<void> {
    const token = await this.tokenService.getBySymbol(dfTx.dftx.data.symbol)
    if (token === undefined || token.id === undefined) {
      throw new Error('Could not delete token - failed to find token in database')
    }
    await this.tokenService.delete(token.id)
  }

  async map (block: defid.Block<defid.Transaction>, dfTx: DfTxTransaction<TokenCreate>): Promise<Token> {
    const tokenCreate = dfTx.dftx.data
    return {
      id: (await this.tokenService.getNextTokenID(tokenCreate.isDAT)).toString(),
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
