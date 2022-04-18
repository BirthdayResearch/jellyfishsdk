import { FindOptions, Schema, SingleIndexDb } from '@defichain/rich-list-core'
import { Between, Column, Entity, FindManyOptions, Index, LessThan, MoreThan, PrimaryColumn, Repository } from 'typeorm'

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

export abstract class SingleIndexRepo<M extends BaseModel, T> implements SingleIndexDb<T> {
  protected abstract repo: Repository<M>

  abstract _toModel (data: Schema<T>): M
  abstract _fromModel (dbRow: M): Schema<T>

  async put (data: Schema<T>): Promise<void> {
    await this.repo.save(this._toModel(data) as any)
  }

  async delete (id: string): Promise<void> {
    await this.repo.delete(id)
  }

  async get (id: string): Promise<Schema<T> | undefined> {
    const raw = await this.repo.findOne(id)
    if (raw === undefined) {
      return undefined
    }
    return this._fromModel(raw)
  }

  async list (option: FindOptions): Promise<Array<Schema<T>>> {
    const where: FindManyOptions<M>['where'] = {
      partition: option.partition
    }

    if (option.gt !== undefined && option.lt !== undefined) {
      where.sort = Between(option.gt, option.lt)
    } else if (option.gt !== undefined) {
      where.sort = MoreThan(option.gt)
    } else if (option.lt !== undefined) {
      where.sort = LessThan(option.lt)
    }

    const order: FindManyOptions<BaseModel>['order'] = {
      sort: option.order
    }

    const findOpt: FindManyOptions<M> = {
      where: where,
      order: order,
      skip: option.limit
    }

    const raw = await this.repo.find(findOpt)
    return raw.map(ab => this._fromModel(ab))
  }
}
