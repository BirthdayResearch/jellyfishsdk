import { CSetLoanToken, SetLoanToken } from '@defichain/jellyfish-transaction'
import { Injectable, Logger } from '@nestjs/common'

import { MAX_TOKEN_NAME_LENGTH, MAX_TOKEN_SYMBOL_LENGTH, TokenMapper } from '../../../models/Token'
import { HexEncoder } from '../../../utilities/HexEncoder'
import { RawBlock } from '../Indexer'
import { DfTxIndexer, DfTxTransaction } from './DfTxIndexer'

@Injectable()
export class SetLoanTokenIndexer extends DfTxIndexer<SetLoanToken> {
  OP_CODE: number = CSetLoanToken.OP_CODE
  private readonly logger = new Logger(SetLoanTokenIndexer.name)

  constructor (
    private readonly tokenMapper: TokenMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<SetLoanToken>): Promise<void> {
    const txid = transaction.txn.txid
    const data = transaction.dftx.data
    const tokenId = await this.tokenMapper.getNextTokenID(true)

    const symbol = data.symbol.trim().substr(0, MAX_TOKEN_SYMBOL_LENGTH)
    const name = data?.name?.trim().substr(0, MAX_TOKEN_NAME_LENGTH) ?? data.symbol.trim().substr(0, MAX_TOKEN_NAME_LENGTH)

    await this.tokenMapper.put({
      id: txid,
      tokenId: tokenId,
      sort: HexEncoder.encodeHeight(tokenId),
      symbol: symbol,
      name: name,
      isDAT: true,
      isLPS: false,
      limit: '0.00000000',
      mintable: false,
      decimal: 8,
      tradeable: true,
      block: {
        hash: block.hash,
        height: block.height,
        medianTime: block.mediantime,
        time: block.time
      }
    })
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<SetLoanToken>): Promise<void> {
    const txid = transaction.txn.txid
    await this.tokenMapper.delete(txid)
  }
}
