import { Column, Entity, PrimaryColumn, Repository } from 'typeorm'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { SingleIndexDb, Schema, CrawledBlock } from '@defichain/rich-list-core'
import { BaseModel, SingleIndexRepo } from './_abstract'

@Entity()
export class CrawledBlockModel extends BaseModel implements CrawledBlock {
  @PrimaryColumn()
  hash!: string

  @Column()
  height!: number
}

@Injectable()
export class CrawledBlockRepo extends SingleIndexRepo<CrawledBlockModel, CrawledBlock> implements SingleIndexDb<CrawledBlock> {
  constructor (
    @InjectRepository(CrawledBlockModel)
    protected readonly repo: Repository<CrawledBlockModel>
  ) {
    super()
  }

  _fromModel (dbRow: CrawledBlockModel): Schema<CrawledBlock> {
    return {
      id: dbRow.hash,
      partition: dbRow.partition,
      sort: dbRow.height,
      data: dbRow
    }
  }

  _toModel (data: Schema<CrawledBlock>): CrawledBlockModel {
    return {
      id: data.id,
      partition: data.partition,
      sort: data.sort,
      hash: data.data.hash,
      height: data.data.height
    }
  }
}
