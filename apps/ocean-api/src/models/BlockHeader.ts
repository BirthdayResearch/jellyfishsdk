import { ObjectType, Field } from '@nestjs/graphql'
import { Column, Entity, PrimaryColumn } from 'typeorm'

@ObjectType()
@Entity()
export class BlockHeaderModel {
  @Field()
  @PrimaryColumn()
  id!: string // hash

  @Field()
  @Column()
  height!: number

  @Field()
  @Column()
  time!: number

  @Field()
  @Column()
  medianTime!: number
}
