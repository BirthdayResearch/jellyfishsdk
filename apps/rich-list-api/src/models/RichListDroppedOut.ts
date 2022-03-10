import { Column, Entity, Between, FindManyOptions, Repository, MoreThan, LessThan } from 'typeorm'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { SingleIndexDb, Schema, FindOptions } from '@defichain/rich-list-core'
import { BaseModel } from './BaseModel'

@Entity()
export class RichListDroppedOutModel extends BaseModel {
  @Column()
  address!: string
}

@Injectable()
export class RichListDroppedOutRepo implements SingleIndexDb<string> {
  constructor (
    @InjectRepository(RichListDroppedOutModel)
    private readonly repo: Repository<RichListDroppedOutModel>
  ) {}

  async put (address: Schema<string>): Promise<void> {
    await this.repo.save({
      id: address.id,
      partition: address.partition,
      sort: address.sort,
      address: address.data
    })
  }

  async get (id: string): Promise<Schema<string> | undefined> {
    const raw = await this.repo.findOne(id)
    if (raw === undefined) {
      return undefined
    }
    return this._map(raw)
  }

  async list (option: FindOptions): Promise<Array<Schema<string>>> {
    const where: FindManyOptions<RichListDroppedOutModel>['where'] = {
      partition: option.partition
    }

    if (option.gt !== undefined && option.lt !== undefined) {
      where.sort = Between(option.gt, option.lt)
    } else if (option.gt !== undefined) {
      where.sort = MoreThan(option.gt)
    } else if (option.lt !== undefined) {
      where.sort = LessThan(option.lt)
    }

    const findOpt: FindManyOptions<RichListDroppedOutModel> = {
      where: where,
      order: { sort: option.order },
      skip: option.limit
    }

    const raw = await this.repo.find(findOpt)
    return raw.map(ab => this._map(ab))
  }

  async delete (hash: string): Promise<void> {
    await this.repo.delete(hash)
  }

  private _map (droppedOut: RichListDroppedOutModel): Schema<string> {
    return {
      id: droppedOut.id,
      partition: droppedOut.partition,
      sort: droppedOut.sort,
      data: droppedOut.address
    }
  }
}
