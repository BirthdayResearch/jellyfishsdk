import { ObjectType, Field } from '@nestjs/graphql'
import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm'
import { BlockHeaderModel } from './BlockHeader'
import { HeightIndexedModel } from './_abstract'

@ObjectType()
@Entity()
export class TokenModel {
  @PrimaryColumn()
  txid!: string

  @Field()
  @Column()
  id!: string

  @Field()
  @Column()
  symbol!: string

  @Field()
  @Column()
  displaySymbol!: string

  @Field()
  @Column()
  symbolKey!: string

  @Field()
  @Column()
  name!: string

  @Field()
  @Column()
  decimal!: number

  @Field()
  @Column()
  limit!: string // BigNumber

  @Field()
  @Column()
  mintable!: boolean

  @Field()
  @Column()
  tradeable!: boolean

  @Field()
  @Column()
  isDAT!: boolean

  @Field()
  @Column()
  isLPS!: boolean

  @Field()
  @Column()
  finalized!: boolean

  // @Field()
  // minted!: string // BigNumber

  @Field()
  @Column()
  creation!: {
    tx: string
    height: number
  }

  @Field()
  @Column()
  destruction!: {
    tx: string
    height: number
  }

  @Field()
  @Column()
  collateralAddress?: string

  @ManyToOne(
    () => BlockHeaderModel, { onDelete: 'CASCADE' }
  )
  blockHeader!: BlockHeaderModel
}
