import { Column, Entity, Index, PrimaryColumn, Between, FindManyOptions, Repository, MoreThan, LessThan } from 'typeorm'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { SingleIndexDb, Schema, FindOptions } from '@defichain/rich-list-core'

@Entity()
@Index(['height'])
export class RichListDroppedOutModel {
  @PrimaryColumn()
  id!: string

  @Column()
  height!: number

  @Column()
  address!: string

  partition!: 'NONE'
}

@Injectable()
export class RichListDroppedOutService implements SingleIndexDb<string> {
  constructor (
    @InjectRepository(RichListDroppedOutModel)
    private readonly repo: Repository<RichListDroppedOutModel>
  ) {}

  async put (address: Schema<string>): Promise<void> {
    await this.repo.save({
      // NONE: addressBalance.partition, // no partitioning is required
      hash: address.data,
      height: address.sort
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
    const where: FindManyOptions<RichListDroppedOutModel>['where'] = {}

    if (option.gt !== undefined && option.lt !== undefined) {
      where.height = Between(option.gt, option.lt)
    } else if (option.gt !== undefined) {
      where.height = MoreThan(option.gt)
    } else if (option.lt !== undefined) {
      where.height = LessThan(option.lt)
    }

    const findOpt: FindManyOptions<RichListDroppedOutModel> = {
      where: where,
      order: { height: option.order },
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
      sort: droppedOut.height,
      data: droppedOut.address
    }
  }
}
