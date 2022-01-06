import { Column, Entity, Index, ManyToOne, PrimaryColumn } from 'typeorm'
import { BlockHeaderModel } from './BlockHeader'

@Entity()
export abstract class HeightIndexedModel {
  @Index()
  @ManyToOne(
    () => BlockHeaderModel, { onDelete: 'CASCADE' }
  )
  blockHeader!: BlockHeaderModel
}
