import { Column, Entity, Index, PrimaryColumn, Between, FindManyOptions, Repository, MoreThan, LessThan } from 'typeorm'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { SingleIndexDb, Schema, FindOptions, CrawledBlock } from '@defichain/rich-list-core'

@Entity()
@Index(['height'])
export class CrawledBlockModel implements CrawledBlock {
  @PrimaryColumn()
  hash!: string

  @Column()
  height!: number

  partition!: 'NONE'
}

@Injectable()
export class CrawledBlockDbService implements SingleIndexDb<CrawledBlock> {
  constructor (
    @InjectRepository(CrawledBlockModel)
    private readonly repo: Repository<CrawledBlockModel>
  ) {}

  async put (block: Schema<CrawledBlock>): Promise<void> {
    await this.repo.save({
      // NONE: addressBalance.partition, // no partitioning is required
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
    const where: FindManyOptions<CrawledBlockModel>['where'] = {}

    if (option.gt !== undefined && option.lt !== undefined) {
      where.height = Between(option.gt, option.lt)
    } else if (option.gt !== undefined) {
      where.height = MoreThan(option.gt)
    } else if (option.lt !== undefined) {
      where.height = LessThan(option.lt)
    }

    const findOpt: FindManyOptions<CrawledBlockModel> = {
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

  private _map (block: CrawledBlockModel): Schema<CrawledBlock> {
    return {
      id: block.hash,
      partition: block.partition,
      sort: block.height,
      data: block
    }
  }
}
