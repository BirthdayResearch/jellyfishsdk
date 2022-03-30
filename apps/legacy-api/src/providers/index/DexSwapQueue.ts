import { SupportedNetwork } from '../../pipes/NetworkValidationPipe'
import {
  CCompositeSwap,
  CompositeSwap,
  CPoolSwap,
  OP_DEFI_TX,
  PoolSwap,
  toOPCodes
} from '@defichain/jellyfish-transaction'
import { Transaction, TransactionVout } from '@defichain/whale-api-client/src/api/Transactions'
import { fromScript } from '@defichain/jellyfish-address'
import { AccountHistory } from '@defichain/jellyfish-api-core/src/category/account'
import { SmartBuffer } from 'smart-buffer'
import BigNumber from 'bignumber.js'
import { WhaleApiClientProvider } from '../WhaleApiClientProvider'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { DeFiDBlock } from './BlockProvider'

@Injectable()
export class DexSwapFinder {
  constructor (
    private readonly whaleApiClientProvider: WhaleApiClientProvider,
    @Inject('NETWORK') private readonly network: SupportedNetwork
  ) {
  }

  async getSwapsHistory (blockHash: string): Promise<LegacySubgraphSwap[]> {
    const api = this.whaleApiClientProvider.getClient(this.network)
    const swaps: LegacySubgraphSwap[] = []

    for (const transaction of await api.blocks.getTransactions(blockHash, Number.MAX_SAFE_INTEGER)) {
      if (transaction.voutCount !== 2) {
        continue
      }
      if (transaction.weight === 605) {
        continue
      }

      const vouts = await api.transactions.getVouts(transaction.txid, 1)
      const dftx = findPoolSwapDfTx(vouts)
      if (dftx === undefined) {
        continue
      }

      const swap = await this.findSwap(this.network, dftx, transaction)
      if (swap === undefined) {
        continue
      }

      swaps.push(swap)
    }

    return swaps
  }

  async findSwap (
    network: SupportedNetwork,
    poolSwap: PoolSwap,
    transaction: Transaction
  ): Promise<LegacySubgraphSwap | undefined> {
    const api = this.whaleApiClientProvider.getClient(network)
    const fromAddress = fromScript(poolSwap.fromScript, network)?.address
    const toAddress = fromScript(poolSwap.toScript, network)?.address

    const fromHistory: AccountHistory = await api.rpc.call<AccountHistory>('getaccounthistory', [fromAddress, transaction.block.height, transaction.order], 'number')
    let toHistory: AccountHistory
    if (toAddress === fromAddress) {
      toHistory = fromHistory
    } else {
      toHistory = await api.rpc.call<AccountHistory>('getaccounthistory', [toAddress, transaction.block.height, transaction.order], 'number')
    }

    const from = findAmountSymbol(fromHistory, true)
    const to = findAmountSymbol(toHistory, false)

    if (from === undefined || to === undefined) {
      return undefined
    }

    return {
      id: transaction.txid,
      timestamp: transaction.block.medianTime.toString(),
      from: from,
      to: to,
      block: {
        hash: transaction.block.hash,
        height: transaction.block.height
      }
    }
  }
}

function findPoolSwapDfTx (vouts: TransactionVout[]): PoolSwap | undefined {
  if (vouts.length === 0) {
    return
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

function findAmountSymbol (history: AccountHistory, outgoing: boolean): LegacySubgraphSwapFromTo | undefined {
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

@Injectable()
export class DexSwapQueue {
  private readonly logger: Logger = new Logger(DexSwapQueue.name + ':' + this.network)
  private swapsSorted: LegacySubgraphSwap[] = []

  isReady: boolean = false

  constructor (
    private readonly dexSwapFinder: DexSwapFinder,
    @Inject('NETWORK') readonly network: SupportedNetwork
  ) {
  }

  async onBlock (block: DeFiDBlock): Promise<void> {
    const swaps = await this.dexSwapFinder.getSwapsHistory(block.hash)
    if (swaps.length === 0) {
      return
    }

    for (const swap of swaps) {
      this.swapsSorted.push(swap)
    }
    this.logger.log(`Cached ${swaps.length} swaps from block ${block.height}`)

    // Maybe unnecessary
    this.swapsSorted.sort((a, b) => {
      if (a.timestamp > b.timestamp) {
        return 1
      }
      if (a.timestamp < b.timestamp) {
        return -1
      }
      return 0
    })
  }

  async invalidate (blockHash: string): Promise<void> {
    const originalSize = this.swapsSorted.length
    this.swapsSorted = this.swapsSorted.filter(swap => swap.block.hash !== blockHash)
    const newSize = this.swapsSorted.length

    const diff = originalSize - newSize
    if (diff > 0) {
      this.logger.log(`Removed ${originalSize - newSize} swaps from cache. Remaining: ${newSize}`)
    }
  }

  getAll (): LegacySubgraphSwap[] {
    return this.swapsSorted
  }

  /**
   * Returns the last N swaps, sorted by timestamp
   * @param {number} count - the last N swaps to return
   */
  getLast (count: number): LegacySubgraphSwap[] {
    return this.swapsSorted.slice(this.swapsSorted.length - count).reverse()
  }
}

export interface LegacySubgraphSwap {
  id: string
  timestamp: string
  from: LegacySubgraphSwapFromTo
  to: LegacySubgraphSwapFromTo
  block: {
    hash: string
    height: number
  }
}

export interface LegacySubgraphSwapFromTo {
  amount: string
  symbol: string
}
