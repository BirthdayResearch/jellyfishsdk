import { SupportedNetwork } from '../../../legacy-api/src/pipes/NetworkValidationPipe'
import { parseHeight } from './block.controller'
import { BlockTxn, encodeBase64 } from '../../../legacy-api/src/controllers/PoolPairController'
import { Block } from '@defichain/whale-api-client/dist/api/blocks'
import { Transaction, TransactionVout } from '@defichain/whale-api-client/dist/api/transactions'
import {
  CCompositeSwap,
  CompositeSwap,
  CPoolSwap,
  OP_DEFI_TX,
  PoolSwap,
  toOPCodes
} from '@defichain/jellyfish-transaction'
import { fromScript } from '@defichain/jellyfish-address'
import { AccountHistory } from '@defichain/jellyfish-api-core/dist/category/account'
import { requireValue } from './stats.controller'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { BlockMapper } from '../module.model/block'
import { TransactionMapper } from '../module.model/transaction'
import { TransactionVoutMapper } from '../module.model/transaction.vout'
import { BigNumber } from 'bignumber.js'
import { SmartBuffer } from 'smart-buffer'
import { Logger } from '@nestjs/common'

export class LegacySubgraphService {
  private readonly logger = new Logger(LegacySubgraphService.name)

  constructor (
    protected readonly rpcClient: JsonRpcClient,
    protected readonly blockMapper: BlockMapper,
    protected readonly transactionMapper: TransactionMapper,
    protected readonly transactionVoutMapper: TransactionVoutMapper
  ) {
  }

  async getSwapsHistory (
    network: SupportedNetwork,
    limit: number,
    nextToken: NextToken
  ): Promise<{ swaps: LegacySubgraphSwap[], next: NextToken }> {
    const allSwaps: LegacySubgraphSwap[] = []

    while (allSwaps.length <= limit) {
      const height = parseHeight(nextToken?.height)

      for (const block of await this.blockMapper.queryByHeight(200, height)) {
        const blockTxns: BlockTxn[] = await this.getBlockTransactionsWithNonSwapsAsNull(block, network, nextToken)

        for (let i = Number(nextToken.order ?? '0'); i < blockTxns.length; i++) {
          const blockTxn = blockTxns[i]
          if (blockTxn.swap === null) {
            continue
          }
          allSwaps.push(blockTxn.swap)

          const isLastSwapInBlock = ((i + 1) === blockTxns.length)
          if (isLastSwapInBlock) {
            // Pagination fix: since this is the last swap in the block, we will point
            // the pagination cursor to skip the current block. We also reset 'order' to 0
            // (the start of the block).
            nextToken = {
              height: block.height.toString(),
              order: '0'
            }
          } else {
            // Pagination fix: since this isn't the last pool swap in the block,
            // we move the cursor to the previous block (1 above), as there might still be
            // pool swaps in the current block, and we don't want to skip them (setting
            // the next.height value to N will result in block N being skipped).
            nextToken = {
              height: (blockTxn.height + 1).toString(),
              order: blockTxn.order.toString()
            }
          }

          if (allSwaps.length === limit) {
            this.logger.debug(`[${network}] Block ${block.height} - pagination ${JSON.stringify(nextToken)}`)
            return {
              swaps: allSwaps,
              next: nextToken
            }
          }
        }

        // Move cursor to next block, as we're done with it
        nextToken = {
          height: block.height.toString(),
          order: '0'
        }
      }
    }
    // Highly unlikely to reach here, but for completeness
    return {
      swaps: allSwaps,
      next: nextToken
    }
  }

  private async getBlockTransactionsWithNonSwapsAsNull (
    block: Block,
    network: SupportedNetwork,
    next: NextToken
  ): Promise<BlockTxn[]> {
    const swaps: BlockTxn[] = []

    for (const transaction of await this.transactionMapper.queryByBlockHash(block.hash, 200, parseHeight(next?.order))) {
      const swap = await this.getSwapFromTransaction(transaction, network)
      swaps.push({
        swap: swap,
        height: transaction.block.height,
        order: transaction.order
      })
    }
    return swaps
  }

  /**
   * Caches at the transaction level, so that we can avoid calling expensive rpc calls for newer blocks
   */
  private async getSwapFromTransaction (transaction: Transaction, network: SupportedNetwork): Promise<LegacySubgraphSwap | null> {
    if (transaction.voutCount !== 2) {
      return null
    }
    if (transaction.weight === 605) {
      return null
    }

    const vouts = await this.transactionVoutMapper.query(transaction.txid, 1)
    const dftx = this.findPoolSwapDfTx(vouts)
    if (dftx === undefined) {
      return null
    }

    const swap = await this.findSwap(network, dftx, transaction)
    if (swap === undefined) {
      return null
    }

    return swap
  }

  private async findSwap (network: SupportedNetwork, poolSwap: PoolSwap, transaction: Transaction): Promise<LegacySubgraphSwap | undefined> {
    const fromAddress = fromScript(poolSwap.fromScript, network)?.address
    const toAddress = fromScript(poolSwap.toScript, network)?.address

    if (
      toAddress === undefined || toAddress === '' ||
      fromAddress === undefined || fromAddress === ''
    ) {
      return undefined
    }

    const fromHistory = await this.rpcClient.account.getAccountHistory(fromAddress, transaction.block.height, transaction.order)
    let toHistory: AccountHistory
    if (toAddress === fromAddress) {
      toHistory = fromHistory
    } else {
      toHistory = await this.rpcClient.account.getAccountHistory(toAddress, transaction.block.height, transaction.order)
    }

    const from = this.findAmountSymbol(fromHistory, true)
    const to = this.findAmountSymbol(toHistory, false)

    if (from === undefined || to === undefined) {
      return undefined
    }

    return {
      id: transaction.txid,
      timestamp: transaction.block.medianTime.toString(),
      from: from,
      to: to
    }
  }

  private async isRecentBlock (block: Block): Promise<boolean> {
    // TODO(): Can consider using MasternodeStatsMapper.getLatest()
    const chainHeight = requireValue(await this.blockMapper.getHighest(), 'block').height
    return chainHeight - block.height <= 2
  }

  private findPoolSwapDfTx (vouts: TransactionVout[]): PoolSwap | undefined {
    if (vouts.length === 0) {
      return undefined // reject because not yet indexed, cannot be found
    }

    const hex = vouts[0].script.hex
    const buffer = SmartBuffer.fromBuffer(Buffer.from(hex, 'hex'))
    const stack = toOPCodes(buffer)
    if (stack.length !== 2 || stack[1].type !== 'OP_DEFI_TX') {
      return undefined
    }

    const dftx = (stack[1] as OP_DEFI_TX).tx
    if (dftx === undefined) {
      return undefined
    }

    switch (dftx.name) {
      case CPoolSwap.OP_NAME:
        return (dftx.data as PoolSwap)

      case CCompositeSwap.OP_NAME:
        return (dftx.data as CompositeSwap).poolSwap

      default:
        return undefined
    }
  }

  private findAmountSymbol (history: AccountHistory, outgoing: boolean): LegacySubgraphSwapFromTo | undefined {
    for (const amount of history.amounts ?? []) {
      const [value, symbol] = amount.split('@')
      const isNegative = value.startsWith('-')

      if (isNegative && outgoing) {
        return {
          amount: new BigNumber(value).absoluteValue().toFixed(8),
          symbol: symbol
        }
      }

      if (!isNegative && !outgoing) {
        return {
          amount: new BigNumber(value).absoluteValue().toFixed(8),
          symbol: symbol
        }
      }
    }

    return undefined
  }

  decodeNextToken (nextString: string): NextToken {
    return JSON.parse(Buffer.from(nextString, 'base64url').toString())
  }

  encodeNextToken (next: NextToken): string {
    return encodeBase64(next)
  }
}

export interface NextToken {
  height?: string
  order?: string
}

export interface LegacySubgraphSwap {
  id: string
  timestamp: string
  from: LegacySubgraphSwapFromTo
  to: LegacySubgraphSwapFromTo
}

export interface LegacySubgraphSwapFromTo {
  amount: string
  symbol: string
}

export interface LegacySubgraphSwapsResponse {
  data: {
    swaps: LegacySubgraphSwap[]
  }
  page?: {
    next: string
  }
}
