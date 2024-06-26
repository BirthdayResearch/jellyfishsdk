import { Model, ModelIndex, ModelKey, ModelMapping } from './model'

/**
 * DeFi whale uses a database-agnostic implementation. Any provider is valid as long as it
 * can conform to the interfaces provided in the Database. Superset implementations such as
 * RDMS are always supported.
 *
 * For a performant design, the interface uses a log-structured merge-tree (LSM).
 * LSM uses a log data structure with performance characteristics that allow for high
 * write volume which is required for ledger-based application. This database interface
 * implements a key-value structure with type, index, partition and sort as key.
 *
 * @see {Model} for more description and summary of what database implementation must conform to.
 */
export abstract class Database {
  abstract get<M extends Model> (
    index: ModelIndex<M>,
    partitionKey: ModelKey,
    sortKey?: ModelKey
  ): Promise<M | undefined>

  abstract get<M extends Model> (
    mapping: ModelMapping<M>,
    id: string
  ): Promise<M | undefined>

  abstract query<M extends Model> (
    index: ModelIndex<M>,
    options: QueryOptions
  ): Promise<M[]>

  abstract put<M extends Model> (
    mapping: ModelMapping<M>,
    model: M
  ): Promise<void>

  abstract delete<M extends Model> (
    mapping: ModelMapping<M>,
    id: string
  ): Promise<void>

  abstract dump (): Promise<boolean>
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface QueryOptions {
  /**
   * Provide to indicates searching on the sort index within partition key space.
   */
  partitionKey?: ModelKey
  limit: number
  order: SortOrder
  gt?: ModelKey
  gte?: ModelKey
  lt?: ModelKey
  lte?: ModelKey
}
