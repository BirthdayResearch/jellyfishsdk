import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('BLOCK')
export class BlockHeaderModel {
  @PrimaryColumn({ name: 'ID' })
  id!: string // hash

  @Column({ name: 'HEIGHT' })
  height!: number

  @Column({ name: 'TIME' })
  time!: number

  @Column({ name: 'MEDIAN_TIME' })
  medianTime!: number
}
