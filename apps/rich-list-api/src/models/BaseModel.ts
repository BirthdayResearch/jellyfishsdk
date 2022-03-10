import { Column, Entity, Index, PrimaryColumn } from 'typeorm'

@Entity()
@Index(['partition', 'sort'])
export class BaseModel {
  @PrimaryColumn()
  id!: string

  @Column()
  partition!: string

  @Column()
  sort!: number
}
