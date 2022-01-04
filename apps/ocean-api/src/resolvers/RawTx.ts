import { RawTxFeeEstimateModel } from '../models/RawTxModel'
import { Resolver, Args, Query } from '@nestjs/graphql'
import { ApiClient, mining } from '@defichain/jellyfish-api-core'

@Resolver(() => RawTxFeeEstimateModel)
export class RawTxResolver {
  constructor (private readonly client: ApiClient) {
  }

  @Query(() => RawTxFeeEstimateModel)
  async feeEstimate (@Args('confirmationTarget') confirmationTarget: number = 10): Promise<RawTxFeeEstimateModel> {
    const estimation = await this.client.mining.estimateSmartFee(confirmationTarget, mining.EstimateMode.CONSERVATIVE)
    if (estimation.feerate !== undefined) {
      return {
        confirmationTarget: confirmationTarget,
        feeRate: estimation.feerate
      }
    }

    return {
      confirmationTarget: confirmationTarget,
      feeRate: 0.00005000
    }
  }
}
