import { Column, Entity, PrimaryColumn } from 'typeorm'
import { HeightIndexedModel } from './_abstract'

@Entity('TOKEN')
export class TokenModel extends HeightIndexedModel {
  @PrimaryColumn()
  txid!: string

  @Column()
  id!: string

  @Column()
  symbol!: string

  @Column()
  displaySymbol!: string

  @Column()
  symbolKey!: string

  @Column()
  name!: string

  @Column()
  decimal!: number

  @Column()
  limit!: string // BigNumber

  @Column()
  mintable!: boolean

  @Column()
  tradeable!: boolean

  @Column()
  isDAT!: boolean

  @Column()
  isLPS!: boolean

  @Column()
  finalized!: boolean

  // @Field()
  // minted!: string // BigNumber

  // @Column()
  // creation!: {
  //   tx: string
  //   height: number
  // }

  // @Column()
  // destruction!: {
  //   tx: string
  //   height: number
  // }

  @Column()
  collateralAddress?: string
}
