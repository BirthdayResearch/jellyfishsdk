import { Column, Entity, PrimaryColumn, Between, FindManyOptions, Repository, MoreThan, LessThan } from 'typeorm'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { SingleIndexDb, Schema, FindOptions, CrawledBlock } from '@defichain/rich-list-core'
import { BaseModel } from './BaseModel'

@Entity()
export class CrawledBlockModel extends BaseModel implements CrawledBlock {
  @PrimaryColumn()
  hash!: string

  @Column()
  height!: number
}

@Injectable()
export class CrawledBlockRepo implements SingleIndexDb<CrawledBlock> {
  constructor (
    @InjectRepository(CrawledBlockModel)
    private readonly repo: Repository<CrawledBlockModel>
  ) {}

  async put (block: Schema<CrawledBlock>): Promise<void> {
    await this.repo.save({
      id: block.id,
      partition: block.partition,
      sort: block.sort,
      hash: block.data.hash,
      height: block.data.height
    })
  }

  async get (hash: string): Promise<Schema<CrawledBlock> | undefined> {
    const raw = await this.repo.findOne(hash)
    if (raw === undefined) {
      return undefined
    }
    return this._map(raw)
  }

  async list (option: FindOptions): Promise<Array<Schema<CrawledBlock>>> {
    const where: FindManyOptions<CrawledBlockModel>['where'] = {
      partition: option.partition
    }

    if (option.gt !== undefined && option.lt !== undefined) {
      where.sort = Between(option.gt, option.lt)
    } else if (option.gt !== undefined) {
      where.sort = MoreThan(option.gt)
    } else if (option.lt !== undefined) {
      where.sort = LessThan(option.lt)
    }

    const findOpt: FindManyOptions<CrawledBlockModel> = {
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

  private _map (block: CrawledBlockModel): Schema<CrawledBlock> {
    return {
      id: block.hash,
      partition: block.partition,
      sort: block.height,
      data: block
    }
  }
}
