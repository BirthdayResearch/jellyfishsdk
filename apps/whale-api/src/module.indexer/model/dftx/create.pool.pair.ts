import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CPoolCreatePair, PoolCreatePair } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { PoolPairHistoryMapper } from '@src/module.model/pool.pair.history'
import { PoolPairTokenMapper } from '@src/module.model/pool.pair.token'
import { MAX_TOKEN_SYMBOL_LENGTH, Token, TokenMapper } from '@src/module.model/token'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { IndexerError } from '@src/module.indexer/error'
import { NetworkName } from '@defichain/jellyfish-network'

const ConsensusParams = {
  mainnet: {
    FortCanningHeight: 1367000
  },
  testnet: {
    FortCanningHeight: 686200
  },
  regtest: {
    FortCanningHeight: 10000000
  }
}

const MAX_TOKEN_SYMBOL_LENGTH_POST_FC = 16

@Injectable()
export class CreatePoolPairIndexer extends DfTxIndexer<PoolCreatePair> {
  OP_CODE: number = CPoolCreatePair.OP_CODE
  private readonly logger = new Logger(CreatePoolPairIndexer.name)

  constructor (
    private readonly poolPairHistoryMapper: PoolPairHistoryMapper,
    private readonly poolPairTokenMapper: PoolPairTokenMapper,
    private readonly tokenMapper: TokenMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<PoolCreatePair>): Promise<void> {
    const txid = transaction.txn.txid
    const data = transaction.dftx.data
    const tokenId = await this.tokenMapper.getNextTokenID(true)

    const tokenA = await this.tokenMapper.getByTokenId(data.tokenA)
    const tokenB = await this.tokenMapper.getByTokenId(data.tokenB)

    if (tokenA === undefined || tokenB === undefined) {
      throw new IndexerError(`Tokens (${data.tokenA}, ${data.tokenB}) referenced by PoolPair (${tokenId}) do not exist`)
    }

    const pairSymbol = this.getPairSymbol(tokenA, tokenB, block, transaction)

    // due to hard fork upgrades on PoolPair Data this is not representative of actual DfTx
    await this.poolPairHistoryMapper.put({
      id: txid,
      sort: HexEncoder.encodeHeight(block.height) + HexEncoder.encodeHeight(transaction.txnNo),
      poolPairId: `${tokenId}`,
      pairSymbol: pairSymbol,
      name: `${tokenA.name}-${tokenB.name}`,
      tokenA: {
        id: data.tokenA,
        symbol: tokenA.symbol
      },
      tokenB: {
        id: data.tokenB,
        symbol: tokenB.symbol
      },
      block: {
        hash: block.hash,
        height: block.height,
        medianTime: block.mediantime,
        time: block.time
      },
      status: data.status,
      commission: data.commission.toFixed(8)
    })

    await this.poolPairTokenMapper.put({
      id: `${data.tokenA}-${data.tokenB}`,
      sort: HexEncoder.encodeHeight(tokenId),
      poolPairId: tokenId,
      block: {
        hash: block.hash,
        height: block.height,
        medianTime: block.mediantime,
        time: block.time
      }
    })

    await this.tokenMapper.put({
      id: txid,
      tokenId: tokenId,
      sort: HexEncoder.encodeHeight(tokenId),
      symbol: data.pairSymbol,
      name: `${tokenA.symbol}-${tokenB.symbol} LP Token`,
      isDAT: true,
      isLPS: true,
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

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<PoolCreatePair>): Promise<void> {
    const txid = transaction.txn.txid
    const data = transaction.dftx.data

    await this.tokenMapper.delete(txid)
    await this.poolPairHistoryMapper.delete(txid)
    await this.poolPairTokenMapper.delete(`${data.tokenA}-${data.tokenB}`)
  }

  private getPairSymbol (tokenA: Token, tokenB: Token, block: RawBlock, transaction: DfTxTransaction<PoolCreatePair>): string {
    const data = transaction.dftx.data

    if (data.pairSymbol.length === 0) {
      return (tokenA?.symbol + '-' + tokenB?.symbol).trim().substr(0, MAX_TOKEN_SYMBOL_LENGTH)
    }
    const symbolLength = block.height >= ConsensusParams[this.network].FortCanningHeight
      ? MAX_TOKEN_SYMBOL_LENGTH_POST_FC
      : MAX_TOKEN_SYMBOL_LENGTH

    return data.pairSymbol.trim().substr(0, symbolLength)
  }
}
