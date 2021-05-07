import sub from 'subleveldown'
import level from 'level'
import { LevelUp } from 'levelup'
import lexicographic from 'lexicographic-integer-encoding'
import { Inject } from '@nestjs/common'
import { QueryOptions, Database, SortOrder } from '@src/module.database/database'
import { Model, ModelIndex, ModelKey, ModelMapping } from '@src/module.database/model'

const lexint = lexicographic('hex')

export abstract class LevelUpDatabase extends Database {
  protected constructor (protected readonly root: LevelUp) {
    super()
  }

  /**
   * Clear database, only for testing/debugging purpose.
   */
  async clear (): Promise<void> {
    await this.root.clear()
  }

  async close (): Promise<void> {
    await this.root.close()
  }

  /**
   * Sub index space for model indexes.
   * @see https://github.com/kawanet/msgpack-lite for better valueEncoding
   */
  protected subIndex<M extends Model> (index: ModelIndex<M>, partitionKey?: ModelKey): LevelUp {
    if (index.sort === undefined) {
      return sub(this.root, index.name, {
        valueEncoding: 'json',
        keyEncoding: index.partition.type === 'number' ? lexint : 'binary'
      })
    }

    if (partitionKey === undefined) {
      throw new Error('Attempt to enter sub index without providing a partition key.')
    }

    return sub(sub(this.root, index.name), `${partitionKey as string}`, {
      valueEncoding: 'json',
      keyEncoding: index.sort.type === 'number' ? lexint : 'binary'
    })
  }

  /**
   * Sub root space for type.
   */
  protected subRoot<M extends Model> (mapping: ModelMapping<M>): LevelUp {
    // TODO(fuxingloh): sub root indexing might dup too much indexed data as root indexes and sub indexes can be shared.
    //  We could allow a sub index to act as root. Need to revisit this in the future.
    //  Other providers like dynamodb where the indexes are manually setup it won't be such an issue.
    return sub(this.root, mapping.type, {
      valueEncoding: 'json',
      keyEncoding: 'binary'
    })
  }

  get<M extends Model> (index: ModelIndex<M>, partitionKey: ModelKey, sortKey?: ModelKey): Promise<M | undefined>;

  get<M extends Model> (mapping: ModelMapping<M>, id: string): Promise<M | undefined>;

  async get<M extends Model> (indexOrMapping: ModelIndex<M> | ModelMapping<M>, partitionKey: ModelKey | string, sortKey?: ModelKey): Promise<M | undefined> {
    try {
      const mapping = indexOrMapping as ModelMapping<M>
      if (mapping?.type !== undefined) {
        const id = partitionKey as string
        return await this.subRoot(mapping).get(id)
      }

      const index = indexOrMapping as ModelIndex<M>
      const key = index.sort !== undefined ? sortKey : partitionKey
      return await this.subIndex(index, partitionKey).get(key)
    } catch (err) {
      if (err.type === 'NotFoundError') {
        return undefined
      }
      throw err
    }
  }

  async query<M extends Model> (index: ModelIndex<M>, opts: QueryOptions): Promise<M[]> {
    const space = this.subIndex(index, opts.partitionKey)

    return await new Promise((resolve, reject) => {
      const items: M[] = []

      space.createReadStream({
        limit: opts.limit,
        reverse: opts.order === SortOrder.DESC,
        values: true,
        keys: false,
        ...opts.gt !== undefined ? { gt: opts.gt } : {},
        ...opts.gte !== undefined ? { gte: opts.gte } : {},
        ...opts.lt !== undefined ? { lt: opts.lt } : {},
        ...opts.lte !== undefined ? { lte: opts.lte } : {}
      }).on('data', function (data) {
        items.push(data)
      }).on('error', function (err) {
        reject(err)
      }).on('close', function () {
        reject(new Error('stream closed'))
      }).on('end', function () {
        resolve(items)
      })
    })
  }

  async put<M extends Model> (mapping: ModelMapping<M>, model: M): Promise<void> {
    // TODO(fuxingloh): check before deleting for better performance
    await this.delete(mapping, model.id)

    const subRoot = this.subRoot(mapping)
    await subRoot.put(model.id, model)

    for (const index of Object.values(mapping.index)) {
      const subIndex = this.subIndex(index, index.partition.key(model))
      const key = index.sort !== undefined ? index.sort.key(model) : index.partition.key(model)
      await subIndex.put(key, model)
    }
  }

  async delete<M extends Model> (mapping: ModelMapping<M>, id: string): Promise<void> {
    const model = await this.get(mapping, id) as M
    if (model === undefined) {
      return
    }

    for (const index of Object.values(mapping.index)) {
      const subIndex = this.subIndex(index, index.partition.key(model))
      const key = index.sort !== undefined ? index.sort.key(model) : index.partition.key(model)
      await subIndex.del(key)
    }

    const subRoot = this.subRoot(mapping)
    await subRoot.del(model.id)
  }
}

/**
 * LevelDatabase uses [Level/level](https://github.com/Level/level) with a LevelDB instances under the hood.
 * [Level/subleveldown](https://github.com/Level/subleveldown) is used to divide key spaces into
 * models are their partitions. Data stored in level are denormalized.
 */
export class LevelDatabase extends LevelUpDatabase {
  constructor (@Inject('LEVEL_UP_LOCATION') location: string) {
    super(level(location))
  }
}
