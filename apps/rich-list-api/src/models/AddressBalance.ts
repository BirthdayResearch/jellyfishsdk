import { Column, Entity, Repository } from 'typeorm'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { SingleIndexDb, AddressBalance, Schema } from '@defichain/rich-list-core'
import { BaseModel, SingleIndexRepo } from './_abstract'

@Entity()
export class AddressBalanceModel extends BaseModel {
  @Column()
  address!: string

  @Column()
  amount!: number
}

@Injectable()
export class AddressBalanceRepo extends SingleIndexRepo<AddressBalanceModel, AddressBalance> implements SingleIndexDb<AddressBalance> {
  constructor (
    @InjectRepository(AddressBalanceModel)
    protected readonly repo: Repository<AddressBalanceModel>
  ) {
    super()
  }

  _fromModel (ab: AddressBalanceModel): Schema<AddressBalance> {
    return {
      id: ab.id,
      partition: ab.partition,
      sort: ab.sort,
      data: ab
    }
  }

  _toModel (data: Schema<AddressBalance>): AddressBalanceModel {
    return {
      id: data.id,
      partition: data.partition,
      sort: data.sort,
      address: data.data.address,
      amount: data.data.amount
    }
  }
}
