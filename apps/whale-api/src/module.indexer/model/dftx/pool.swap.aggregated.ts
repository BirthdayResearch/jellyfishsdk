import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { PoolSwap } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'
import { PoolSwapAggregated, PoolSwapAggregatedMapper } from '@src/module.model/pool.swap.aggregated'
import { PoolPairTokenMapper } from '@src/module.model/pool.pair.token'

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
    private readonly poolPairTokenMapper: PoolPairTokenMapper
  ) {
    super()
  }

  async indexBlockStart (block: RawBlock): Promise<void> {
    const poolPairs = await this.poolPairTokenMapper.listAllDesc()

    for (const poolPair of poolPairs) {
      for (const interval of AggregatedIntervals) {
        const previous = await this.aggregatedMapper.query(`${poolPair.poolPairId}-${interval as number}`, 1)
        const bucket = getBucket(block, interval)

        if (previous.length === 1 && previous[0].bucket >= bucket) {
          // Going from a desc-ing order, we can just check if the most recent PoolSwap Aggregation Bucket is added.
          return
        }

        await this.createNewBucket(block, poolPair.poolPairId, interval)
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
    const poolPairs = await this.poolPairTokenMapper.listAllDesc()

    for (const poolPair of poolPairs) {
      for (const interval of AggregatedIntervals) {
        // Delete internally checks for key existence, so we can always call it here
        await this.aggregatedMapper.delete(getAggregatedId(block, poolPair.poolPairId, interval))
      }
    }
  }

  async indexTransaction (_: RawBlock, __: DfTxTransaction<PoolSwap>): Promise<void> {
  }

  async invalidateTransaction (_: RawBlock, __: DfTxTransaction<PoolSwap>): Promise<void> {
  }
}

function getBucket (block: RawBlock, interval: PoolSwapAggregatedInterval): number {
  return block.mediantime - (block.mediantime % interval)
}

function getAggregatedId (block: RawBlock, poolPairId: number, interval: PoolSwapAggregatedInterval): string {
  return `${poolPairId}-${interval as number}-${block.hash}`
}
