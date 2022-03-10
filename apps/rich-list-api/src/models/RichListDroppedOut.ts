import { Column, Entity, Repository } from 'typeorm'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { SingleIndexDb, Schema } from '@defichain/rich-list-core'
import { BaseModel, SingleIndexRepo } from './_abstract'

@Entity()
export class RichListDroppedOutModel extends BaseModel {
  @Column()
  address!: string
}

@Injectable()
export class RichListDroppedOutRepo extends SingleIndexRepo<RichListDroppedOutModel, string> implements SingleIndexDb<string> {
  constructor (
    @InjectRepository(RichListDroppedOutModel)
    protected readonly repo: Repository<RichListDroppedOutModel>
  ) {
    super()
  }

  _fromModel (droppedOut: RichListDroppedOutModel): Schema<string> {
    return {
      id: droppedOut.id,
      partition: droppedOut.partition,
      sort: droppedOut.sort,
      data: droppedOut.address
    }
  }

  _toModel (data: Schema<string>): RichListDroppedOutModel {
    return {
      id: data.id,
      partition: data.partition,
      sort: data.sort,
      address: data.data
    }
  }
}
