import { DfTxIndexer, DfTxTransaction } from './_abstract'
import { CTokenCreate, TokenCreate } from '@defichain/jellyfish-transaction'
import { RawBlock } from '../_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { HexEncoder } from '../../../module.model/_hex.encoder'
import { MAX_TOKEN_NAME_LENGTH, MAX_TOKEN_SYMBOL_LENGTH, TokenMapper } from '../../../module.model/token'

@Injectable()
export class CreateTokenIndexer extends DfTxIndexer<TokenCreate> {
  OP_CODE: number = CTokenCreate.OP_CODE
  private readonly logger = new Logger(CreateTokenIndexer.name)

  constructor (
    private readonly tokenMapper: TokenMapper
  ) {
    super()
  }

  async indexBlockEnd (block: RawBlock): Promise<void> {
    // https://defiscan.live/tokens/dAMZN

    // {
    //   "89": {
    //     "symbol": "AMZN",
    //     "symbolKey": "AMZN",
    //     "name": "dAMZN",
    //     "decimal": 8,
    //     "limit": 0,
    //     "mintable": true,
    //     "tradeable": true,
    //     "isDAT": true,
    //     "isLPS": false,
    //     "finalized": false,
    //     "isLoanToken": true,
    //     "minted": 25607.56425640,
    //     "creationTx": "aca8e1ec71d832c151fad94d221c45d5a81acb22723f71a82e14dfa17aaed29e",
    //     "creationHeight": 1948150,
    //     "destructionTx": "0000000000000000000000000000000000000000000000000000000000000000",
    //     "destructionHeight": -1,
    //     "collateralAddress": ""
    //   }
    // }

    if (block.height === 1948150) {
      await this.tokenMapper.put({
        id: 'aca8e1ec71d832c151fad94d221c45d5a81acb22723f71a82e14dfa17aaed29e',
        tokenId: 89,
        sort: HexEncoder.encodeHeight(89),
        symbol: 'AMZN',
        name: 'AMZN',
        isDAT: true,
        isLPS: false,
        limit: (0).toFixed(8),
        mintable: true,
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
