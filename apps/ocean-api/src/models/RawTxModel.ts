import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
export class RawTxFeeEstimateModel {
  @Field()
  confirmationTarget!: number

  @Field()
  feeRate!: number
}
