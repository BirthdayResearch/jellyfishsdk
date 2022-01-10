import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType('Token')
export class TokenModel {
  @Field()
  id!: string

  @Field()
  symbol!: string

  @Field()
  displaySymbol!: string

  @Field()
  symbolKey!: string

  @Field()
  name!: string

  @Field()
  decimal!: number

  @Field()
  limit!: string // BigNumber

  @Field()
  mintable!: boolean

  @Field()
  tradeable!: boolean

  @Field()
  isDAT!: boolean

  @Field()
  isLPS!: boolean

  @Field()
  finalized!: boolean

  @Field()
  minted!: string // BigNumber

  @Field()
  creationTx!: string

  @Field()
  creationHeight!: number

  @Field()
  destructionTx!: string

  @Field()
  destructionHeight!: number

  @Field()
  collateralAddress?: string
}
