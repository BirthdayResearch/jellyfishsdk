import { DfTxIndexer, DfTxTransaction } from './_abstract'
import { PoolSwap } from '@defichain/jellyfish-transaction'
import { RawBlock } from '../_abstract'
import { Injectable } from '@nestjs/common'
import { PoolSwapAggregated, PoolSwapAggregatedMapper } from '../../../module.model/pool.swap.aggregated'
import { PoolPairInfoWithId } from '../../../module.api/cache/defid.cache'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'

export enum PoolSwapAggregatedInterval {
  ONE_HOUR = 60 * 60,
  ONE_DAY = ONE_HOUR * 24
}

export const AggregatedIntervals: PoolSwapAggregatedInterval[] = [
  PoolSwapAggregatedInterval.ONE_HOUR,
  PoolSwapAggregatedInterval.ONE_DAY
]

@Injectable()
export class PoolSwapAggregatedIndexer extends DfTxIndexer<PoolSwap> {
  OP_CODE: number = 0

  constructor (
    private readonly aggregatedMapper: PoolSwapAggregatedMapper,
    private readonly rpcClient: JsonRpcClient
  ) {
    super()
  }

  async indexBlockStart (block: RawBlock): Promise<void> {
    const poolPairs = await this.getPoolPairs(block)

    for (const interval of AggregatedIntervals) {
      for (const poolPair of poolPairs) {
        const previous = await this.aggregatedMapper.query(`${poolPair.id}-${interval as number}`, 1)
        const bucket = getBucket(block, interval)

        if (previous.length === 1 && previous[0].bucket >= bucket) {
          // Going from a desc-ing order, we can just check if the most recent PoolSwap Aggregation Bucket is added.
          break
        }

        await this.createNewBucket(block, Number(poolPair.id), interval)
      }
    }
  }

  private async createNewBucket (block: RawBlock, poolPairId: number, interval: PoolSwapAggregatedInterval): Promise<void> {
    const aggregate: PoolSwapAggregated = {
      id: getAggregatedId(block, poolPairId, interval),
      key: `${poolPairId}-${interval as number}`,
      bucket: getBucket(block, interval),

      aggregated: {
        amounts: {}
      },

      block: {
        medianTime: block.mediantime
      }
    }

    await this.aggregatedMapper.put(aggregate)
  }

  async invalidateBlockStart (block: RawBlock): Promise<void> {
    const poolPairs = await this.getPoolPairs(block)
    const poolIds = Object.keys(poolPairs)

    for (const poolId of poolIds) {
      for (const interval of AggregatedIntervals) {
        // Delete internally checks for key existence, so we can always call it here
        await this.aggregatedMapper.delete(getAggregatedId(block, Number(poolId), interval))
      }
    }
  }

  async indexTransaction (_: RawBlock, __: DfTxTransaction<PoolSwap>): Promise<void> {
  }

  async invalidateTransaction (_: RawBlock, __: DfTxTransaction<PoolSwap>): Promise<void> {
  }

  async getPoolPairs (block: RawBlock): Promise<PoolPairInfoWithId[]> {
    const poolPairs = await this.rpcClient.poolpair.listPoolPairs({
      start: 0,
      limit: 1000000,
      including_start: true
    })
    return Object.entries(poolPairs)
      .map(([id, pair]): PoolPairInfoWithId => {
        return { id, ...pair }
      })
      .filter(pair => {
        return pair.creationHeight.lte(block.height)
      })
      .sort((a, b) => {
        // Need to be sort by descending order otherwise aggregate indexer bucket will exit without creating a bucket
        return b.creationHeight.comparedTo(a.creationHeight)
      })
  }
}

function getBucket (block: RawBlock, interval: PoolSwapAggregatedInterval): number {
  return block.mediantime - (block.mediantime % interval)
}

function getAggregatedId (block: RawBlock, poolPairId: number, interval: PoolSwapAggregatedInterval): string {
  return `${poolPairId}-${interval as number}-${block.hash}`
}
