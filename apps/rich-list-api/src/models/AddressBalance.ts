import { Column, Entity, Between, FindManyOptions, Repository, MoreThan, LessThan } from 'typeorm'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { SingleIndexDb, AddressBalance, Schema, FindOptions } from '@defichain/rich-list-core'
import { BaseModel } from './BaseModel'

@Entity()
export class AddressBalanceModel extends BaseModel {
  @Column()
  address!: string

  @Column()
  amount!: number
}

@Injectable()
export class AddressBalanceRepo implements SingleIndexDb<AddressBalance> {
  constructor (
    @InjectRepository(AddressBalanceModel)
    private readonly repo: Repository<AddressBalanceModel>
  ) {}

  async put (addressBalance: Schema<AddressBalance>): Promise<void> {
    await this.repo.save({
      id: addressBalance.id,
      sort: addressBalance.sort,
      partition: addressBalance.partition,
      address: addressBalance.data.address,
      amount: addressBalance.data.amount
    })
  }

  async get (id: string): Promise<Schema<AddressBalance> | undefined> {
    const raw = await this.repo.findOne(id)
    if (raw === undefined) {
      return undefined
    }
    return this._map(raw)
  }

  async list (option: FindOptions): Promise<Array<Schema<AddressBalance>>> {
    const where: FindManyOptions<AddressBalanceModel>['where'] = {
      partition: option.partition
    }

    if (option.gt !== undefined && option.lt !== undefined) {
      where.sort = Between(option.gt, option.lt)
    } else if (option.gt !== undefined) {
      where.sort = MoreThan(option.gt)
    } else if (option.lt !== undefined) {
      where.sort = LessThan(option.lt)
    }

    const findOpt: FindManyOptions<AddressBalanceModel>['where'] = {
      where: where,
      order: { sort: option.order },
      skip: option.limit
    }

    const raw = await this.repo.find(findOpt)
    return raw.map(ab => this._map(ab))
  }

  async delete (id: string): Promise<void> {
    await this.repo.delete(id)
  }

  private _map (ab: AddressBalanceModel): Schema<AddressBalance> {
    return {
      id: ab.id,
      partition: ab.partition,
      sort: ab.sort,
      data: ab
    }
  }
}
