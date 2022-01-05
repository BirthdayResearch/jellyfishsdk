import { ObjectType, Field } from '@nestjs/graphql'

@ObjectType()
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
  creation!: {
    tx: string
    height: number
  }

  @Field()
  destruction!: {
    tx: string
    height: number
  }

  @Field()
  collateralAddress?: string
}
