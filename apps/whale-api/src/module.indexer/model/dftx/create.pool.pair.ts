import { DfTxIndexer, DfTxTransaction } from './_abstract'
import { CPoolCreatePair, PoolCreatePair } from '@defichain/jellyfish-transaction'
import { RawBlock } from '../_abstract'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { PoolPairHistoryMapper } from '../../../module.model/pool.pair.history'
import { PoolPairTokenMapper } from '../../../module.model/pool.pair.token'
import { MAX_TOKEN_SYMBOL_LENGTH, Token, TokenMapper } from '../../../module.model/token'
import { HexEncoder } from '../../../module.model/_hex.encoder'
import { IndexerError } from '../../error'
import { NetworkName } from '@defichain/jellyfish-network'

const ConsensusParams = {
  mainnet: {
    FortCanningHeight: 1367000
  },
  testnet: {
    FortCanningHeight: 686200
  },
  devnet: {
    FortCanningHeight: Number.MAX_SAFE_INTEGER
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

  async indexBlockEnd (block: RawBlock): Promise<void> {
    // {
    //   "90": {
    //     "symbol": "AMZN-DUSD",
    //     "name": "dAMZN-Decentralized USD",
    //     "status": true,
    //     "idTokenA": "89",
    //     "idTokenB": "15",
    //     "dexFeePctTokenA": 0.00100000,
    //     "dexFeeInPctTokenA": 0.00100000,
    //     "dexFeePctTokenB": 0.00100000,
    //     "dexFeeOutPctTokenB": 0.00100000,
    //     "dexFeeInPctTokenB": 0.00100000,
    //     "dexFeeOutPctTokenA": 0.00100000,
    //     "reserveA": 23610.96677637,
    //     "reserveB": 2970783.28265054,
    //     "commission": 0.00200000,
    //     "totalLiquidity": 264845.36091854,
    //     "reserveA/reserveB": 0.00794772,
    //     "reserveB/reserveA": 125.82217876,
    //     "tradeEnabled": true,
    //     "ownerAddress": "8UAhRuUFCyFUHEPD7qvtj8Zy2HxF5HH5nb",
    //     "blockCommissionA": 0.00000000,
    //     "blockCommissionB": 0.00000000,
    //     "rewardPct": 0.00000000,
    //     "rewardLoanPct": 0.02230000,
    //     "creationTx": "b929750896550d830ce9a44485a256741d3fae9abf5db289e87934b920767807",
    //     "creationHeight": 1948150
    //   }
    // }

    if (block.height === 1948150) {
      console.log('Creating dAMZN-DUSD')
      // https://defiscan.live/tokens/dAMZN-DUSD
      await this.poolPairHistoryMapper.put({
        id: 'b929750896550d830ce9a44485a256741d3fae9abf5db289e87934b920767807',
        sort: HexEncoder.encodeHeight(block.height) + HexEncoder.encodeHeight(0),
        poolPairId: '90',
        pairSymbol: 'AMZN-DUSD',
        name: 'AMZN-DUSD',
        tokenA: {
          id: 89,
          symbol: 'AMZN'
        },
        tokenB: {
          id: 15,
          symbol: 'DUSD'
        },
        block: {
          hash: block.hash,
          height: block.height,
          medianTime: block.mediantime,
          time: block.time
        },
        status: true,
        commission: (0.00200000).toFixed(8)
      })

      await this.poolPairTokenMapper.put({
        id: '89-15',
        sort: HexEncoder.encodeHeight(90),
        poolPairId: 90,
        block: {
          hash: block.hash,
          height: block.height,
          medianTime: block.mediantime,
          time: block.time
        }
      })

      // {
      //   "id": "90",
      //   "symbol": "AMZN-DUSD",
      //   "symbolKey": "AMZN-DUSD",
      //   "name": "dAMZN-Decentralized USD",
      //   "decimal": 8,
      //   "limit": "0",
      //   "mintable": false,
      //   "tradeable": true,
      //   "isDAT": true,
      //   "isLPS": true,
      //   "isLoanToken": false,
      //   "finalized": true,
      //   "minted": "0",
      //   "creation": {
      //     "tx": "b929750896550d830ce9a44485a256741d3fae9abf5db289e87934b920767807",
      //     "height": 1948150
      //   },
      //   "destruction": {
      //     "tx": "0000000000000000000000000000000000000000000000000000000000000000",
      //     "height": -1
      //   },
      //   "collateralAddress": "undefined",
      //   "displaySymbol": "dAMZN-DUSD"
      // }
      await this.tokenMapper.put({
        id: 'b929750896550d830ce9a44485a256741d3fae9abf5db289e87934b920767807',
        tokenId: 90,
        sort: HexEncoder.encodeHeight(90),
        symbol: 'AMZN-DUSD',
        name: 'AMZN-DUSD LP Token',
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
      return (`${tokenA?.symbol}-${tokenB?.symbol}`).trim().substr(0, MAX_TOKEN_SYMBOL_LENGTH)
    }
    const symbolLength = block.height >= ConsensusParams[this.network].FortCanningHeight
      ? MAX_TOKEN_SYMBOL_LENGTH_POST_FC
      : MAX_TOKEN_SYMBOL_LENGTH

    return data.pairSymbol.trim().substr(0, symbolLength)
  }
}
