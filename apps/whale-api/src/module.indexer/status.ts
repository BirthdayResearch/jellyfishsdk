import { Injectable } from '@nestjs/common'
import { Database } from '../module.database/database'
import { Model, ModelMapping } from '../module.database/model'

const IndexStatusMapping: ModelMapping<IndexStatus> = {
  type: 'index_status',
  index: {}
}

// TODO(fuxingloh): migrate to use a difference more resilient design for status tracking.

/**
 * For logging of index status for exception recovering.
 */
@Injectable()
export class IndexStatusMapper {
  public constructor (protected readonly database: Database) {
  }

  async get (): Promise<IndexStatus | undefined> {
    return await this.database.get(IndexStatusMapping, '1')
  }

  async put (hash: string, height: number, status: Status): Promise<void> {
    return await this.database.put(IndexStatusMapping, {
      id: '1',
      hash: hash,
      height: height,
      status: status
    })
  }
}

export enum Status {
  INDEXING = 'INDEXING',
  INDEXED = 'INDEXED',
  INVALIDATING = 'INVALIDATING',
  INVALIDATED = 'INVALIDATED',
  ERROR = 'ERROR',
  REINDEX = 'REINDEX'
}

export interface IndexStatus extends Model {
  id: '1'
  hash: string // ---------------| block hash
  height: number
  status: Status // -------------| status of indexing
}
